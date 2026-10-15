let clientInstance: any = null;

export function resetFalkorClient() {
  try {
    if (clientInstance && typeof clientInstance.close === "function") {
      clientInstance.close();
    }
  } catch {}
  clientInstance = null;
}

/**
 * Mendapatkan instance singleton FalkorDB connection.
 * Menggunakan dynamic import untuk keserasian sempurna Next.js server runtime.
 */
export async function getFalkorClient(): Promise<any> {
  if (clientInstance) {
    return clientInstance;
  }

  const host = process.env.FALKORDB_HOST || "localhost";
  const port = parseInt(process.env.FALKORDB_PORT || "6379", 10);
  const password = process.env.FALKORDB_PASSWORD;
  const username = process.env.FALKORDB_USER || "falkordb";

  try {
    const { FalkorDB } = await import("falkordb");
    clientInstance = await FalkorDB.connect({
      username,
      password: password || undefined,
      host,
      port,
    });
    return clientInstance;
  } catch (error) {
    console.warn("[FalkorDB] Connection notice:", error);
    resetFalkorClient();
    throw new Error(
      "Failed to connect to FalkorDB Cloud. Ensure FALKORDB_HOST, FALKORDB_PORT, and FALKORDB_PASSWORD are valid."
    );
  }
}

/**
 * Pembalut graf automatik reconnect jika socket terputus semasa idle
 */
function wrapGraphWithAutoReconnect(graph: any, graphName: string) {
  const originalQuery = graph.query.bind(graph);
  graph.query = async (...args: any[]) => {
    try {
      return await originalQuery(...args);
    } catch (queryErr: any) {
      const msg = String(queryErr?.message || "").toLowerCase();
      if (
        msg.includes("closed") ||
        msg.includes("socket") ||
        msg.includes("econnreset") ||
        msg.includes("connection lost") ||
        msg.includes("broken pipe")
      ) {
        console.warn(`[FalkorDB] Connection lost on ${graphName}, auto-reconnecting...`);
        resetFalkorClient();
        const freshClient = await getFalkorClient();
        const freshGraph = freshClient.selectGraph(graphName);
        return await freshGraph.query(...args);
      }
      throw queryErr;
    }
  };
  return graph;
}

/**
 * IDOR Protection: Setiap user ada graf tersendiri 'matters_<userId>'.
 * Memastikan pengasingan mutlak data antara pengguna.
 */
export async function getGraphForUser(userId: string) {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId supplied for graph selection");
  }

  // Sanitasi userId agar hanya aksara selamat digunakan untuk nama graf
  const sanitized = userId.replace(/[^a-zA-Z0-9_]/g, "_");
  const graphName = `matters_${sanitized}`;

  try {
    const client = await getFalkorClient();
    const graph = client.selectGraph(graphName);
    return wrapGraphWithAutoReconnect(graph, graphName);
  } catch {
    resetFalkorClient();
    const client = await getFalkorClient();
    const graph = client.selectGraph(graphName);
    return wrapGraphWithAutoReconnect(graph, graphName);
  }
}

const REGISTRY_GRAPH = "matters_system_registry";

export async function getRegistryGraph() {
  try {
    const client = await getFalkorClient();
    const graph = client.selectGraph(REGISTRY_GRAPH);
    return wrapGraphWithAutoReconnect(graph, REGISTRY_GRAPH);
  } catch {
    resetFalkorClient();
    const client = await getFalkorClient();
    const graph = client.selectGraph(REGISTRY_GRAPH);
    return wrapGraphWithAutoReconnect(graph, REGISTRY_GRAPH);
  }
}

export async function registerUser(user: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}) {
  const graph = await getRegistryGraph();
  const res = await graph.query(
    `MERGE (u:User {uid: $uid})
     SET u.email = $email,
         u.displayName = $displayName,
         u.photoURL = $photoURL,
         u.registeredAt = coalesce(u.registeredAt, toString(timestamp()))
     RETURN u.uid AS uid, u.email AS email`,
    {
      params: {
        uid: user.uid,
        email: user.email.toLowerCase().trim(),
        displayName: user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL || null,
      },
    }
  );
  return res?.data?.[0];
}

export async function isUserRegistered(identifier: string): Promise<boolean> {
  if (!identifier) return false;
  try {
    const graph = await getRegistryGraph();
    const clean = identifier.toLowerCase().trim();
    const res = await graph.query(
      `MATCH (u:User)
       WHERE u.uid = $id OR toLower(u.email) = $clean
       RETURN count(u) AS total`,
      { params: { id: identifier, clean } }
    );
    const count = Number(res?.data?.[0]?.total ?? res?.data?.[0]?.[0] ?? 0);
    return count > 0;
  } catch (err) {
    console.warn("[FalkorDB] Registry check error, falling back:", err);
    return false;
  }
}

export async function listAllRegisteredUsers() {
  try {
    const graph = await getRegistryGraph();
    const res = await graph.query(
      `MATCH (u:User)
       RETURN u.uid AS uid, u.email AS email, u.displayName AS displayName,
              u.photoURL AS photoURL, u.registeredAt AS registeredAt
       ORDER BY u.registeredAt DESC`
    );
    return (res?.data || []).map((row: any) => ({
      uid: row.uid,
      email: row.email,
      displayName: row.displayName,
      photoURL: row.photoURL,
      registeredAt: row.registeredAt,
    }));
  } catch (err) {
    console.warn("[FalkorDB] listAllRegisteredUsers error:", err);
    return [];
  }
}

export async function deleteUserAccount(uid: string) {
  const client = await getFalkorClient();
  const sanitized = uid.replace(/[^a-zA-Z0-9_]/g, "_");
  const userGraphName = `matters_${sanitized}`;

  // 1. Delete user tenant graph from FalkorDB
  try {
    const userGraph = client.selectGraph(userGraphName);
    await userGraph.delete();
  } catch (err) {
    console.warn(`[FalkorDB] Tenant graph ${userGraphName} delete warning:`, err);
  }

  // 2. Remove user from system registry
  try {
    const registry = await getRegistryGraph();
    await registry.query(
      `MATCH (u:User {uid: $uid}) DETACH DELETE u`,
      { params: { uid } }
    );
  } catch (err) {
    console.warn("[FalkorDB] Registry user delete warning:", err);
  }

  return { success: true };
}
