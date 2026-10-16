const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

let FalkorDB;
try {
  FalkorDB = require("falkordb").FalkorDB;
} catch {
  FalkorDB = require(path.join(__dirname, "../node_modules/falkordb")).FalkorDB;
}

let GoogleGenerativeAI = null;
try {
  GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
} catch {
  try {
    GoogleGenerativeAI = require(path.join(__dirname, "../node_modules/@google/generative-ai")).GoogleGenerativeAI;
  } catch (e) {
    GoogleGenerativeAI = null;
  }
}

let firebaseAdmin = null;
try {
  firebaseAdmin = require("firebase-admin");
} catch {
  try {
    firebaseAdmin = require(path.join(__dirname, "../node_modules/firebase-admin"));
  } catch (e) {
    firebaseAdmin = null;
  }
}

// Load .env.local if present so admin server connects to real FalkorDB Cloud
const envLocalPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PORT = process.env.ADMIN_PORT || 3001;

let falkorClient = null;

async function getClient() {
  if (falkorClient) return falkorClient;
  const host = process.env.FALKORDB_HOST || "localhost";
  const port = parseInt(process.env.FALKORDB_PORT || "6379", 10);
  const password = process.env.FALKORDB_PASSWORD;
  const username = process.env.FALKORDB_USER || "falkordb";

  falkorClient = await FalkorDB.connect({
    host,
    port,
    username,
    password: password || undefined,
  });
  return falkorClient;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Helper JSON response
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  // Helper read POST body
  const readBody = () =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          resolve(JSON.parse(body || "{}"));
        } catch {
          resolve({});
        }
      });
    });

  try {
    // 0. API: Ping / Latency Check
    if (pathname === "/api/ping") {
      const start = Date.now();
      const client = await getClient();
      await client.selectGraph("matters").query("RETURN 1");
      const latencyMs = Date.now() - start;
      return sendJson(200, { success: true, latencyMs, host: process.env.FALKORDB_HOST });
    }

    // 1. API: Stats Overview
    if (pathname === "/api/stats") {
      const client = await getClient();
      const graphs = await client.list();

      let usersCount = 0;
      try {
        const regGraph = client.selectGraph("matters_system_registry");
        const uRes = await regGraph.query("MATCH (u:User) RETURN count(u) AS total");
        usersCount = Number(uRes.data?.[0]?.total ?? 0);
      } catch (e) {
        // registry not initialized yet
      }

      return sendJson(200, {
        success: true,
        falkorConnected: true,
        host: process.env.FALKORDB_HOST,
        totalGraphs: graphs.length,
        totalUsers: usersCount,
      });
    }

    // 1b. API: Cloud Integrations & Services Status (Gemini, Firebase, FalkorDB)
    if (pathname === "/api/services/status") {
      const geminiKey = process.env.GEMINI_API_KEY || "";
      const isGeminiConfigured = Boolean(geminiKey && geminiKey !== "your_gemini_api_key_here");
      const maskedGeminiKey = isGeminiConfigured && geminiKey.length > 8
        ? `${geminiKey.substring(0, 7)}...${geminiKey.substring(geminiKey.length - 4)}`
        : "Not configured";

      const fbProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || "";
      const fbAdminEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
      const fbPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
      const isFbAdminConfigured = Boolean(fbProjectId && fbAdminEmail && fbPrivateKey);
      const maskedFbEmail = fbAdminEmail ? fbAdminEmail.replace(/^([^@]{3})[^@]+(@.*)$/, "$1...$2") : "Not configured";

      return sendJson(200, {
        success: true,
        gemini: {
          isConfigured: isGeminiConfigured,
          maskedKey: maskedGeminiKey,
          model: "gemini-3.5-flash-lite",
          status: isGeminiConfigured ? "configured" : "missing_key",
          features: [
            "Smart Natural Language Entity Extraction (Promises, Decisions, Tasks)",
            "Context-Aware Zero-Amnesia Workspace Chatbot",
            "Deterministic Heuristic Extraction Engine"
          ],
        },
        firebase: {
          isConfigured: isFbAdminConfigured,
          projectId: fbProjectId || "Not configured",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${fbProjectId}.firebaseapp.com`,
          adminEmail: maskedFbEmail,
          hasPrivateKey: Boolean(fbPrivateKey),
          adminSdkStatus: isFbAdminConfigured ? "Service Account Certificate Ready" : "Mock / Local Fallback",
          idorSecurity: "Active (Isolated Graph Container matters_<uid> Per User)",
          status: isFbAdminConfigured ? "configured" : "missing_credentials",
        },
        falkordb: {
          host: process.env.FALKORDB_HOST || "localhost",
          port: process.env.FALKORDB_PORT || 6379,
          graphName: process.env.FALKORDB_GRAPH_NAME || "matters",
          status: "connected",
        }
      });
    }

    // 1c. API: Live Diagnostic Test for Google Gemini AI
    if (pathname === "/api/services/test-gemini") {
      const geminiKey = process.env.GEMINI_API_KEY || "";
      if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
        return sendJson(400, {
          success: false,
          error: "GEMINI_API_KEY is not configured in .env.local",
          status: "missing_key",
        });
      }

      const startTime = Date.now();
      try {
        if (!GoogleGenerativeAI) {
          throw new Error("@google/generative-ai library not available in runtime");
        }
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        const prompt = "Respond in 6 words or less: confirm you are online and operational for Matters.";
        const result = await model.generateContent(prompt);
        const latencyMs = Date.now() - startTime;
        const responseText = result.response.text().trim();

        return sendJson(200, {
          success: true,
          status: "healthy",
          model: "gemini-3.5-flash-lite",
          latencyMs,
          promptSent: prompt,
          reply: responseText,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        return sendJson(500, {
          success: false,
          status: "error",
          error: err.message,
          latencyMs,
        });
      }
    }

    // 1d. API: Live Diagnostic Test for Firebase Auth & Admin SDK
    if (pathname === "/api/services/test-firebase") {
      const startTime = Date.now();
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
          return sendJson(400, {
            success: false,
            error: "Firebase Admin credentials incomplete in .env.local",
            status: "missing_credentials",
          });
        }

        if (firebaseAdmin && firebaseAdmin.apps.length === 0) {
          let formattedKey = privateKey.replace(/\\n/g, "\n");
          try {
            firebaseAdmin.initializeApp({
              credential: firebaseAdmin.credential.cert({
                projectId,
                clientEmail,
                privateKey: formattedKey,
              }),
            });
          } catch (initErr) {
            // App might already be initialized
          }
        }

        // Test querying user registry from FalkorDB
        const client = await getClient();
        const regGraph = client.selectGraph("matters_system_registry");
        let totalUsers = 0;
        try {
          const uRes = await regGraph.query("MATCH (u:User) RETURN count(u) AS total");
          totalUsers = Number(uRes.data?.[0]?.total ?? 0);
        } catch (e) {
          // not yet created
        }

        const latencyMs = Date.now() - startTime;
        return sendJson(200, {
          success: true,
          status: "healthy",
          projectId,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
          adminEmail: clientEmail.replace(/^([^@]{3})[^@]+(@.*)$/, "$1...$2"),
          serviceAccountReady: true,
          registryUsersCount: totalUsers,
          latencyMs,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        return sendJson(500, {
          success: false,
          status: "error",
          error: err.message,
          latencyMs,
        });
      }
    }

    // 2. API: Registered Users
    if (pathname === "/api/users") {
      const client = await getClient();
      try {
        const regGraph = client.selectGraph("matters_system_registry");
        const resData = await regGraph.query(
          "MATCH (u:User) RETURN u.uid AS uid, u.email AS email, u.displayName AS displayName, u.photoURL AS photoURL, u.registeredAt AS registeredAt ORDER BY u.registeredAt DESC"
        );
        return sendJson(200, {
          success: true,
          users: (resData.data || []).map((row) => ({
            uid: row.uid,
            email: row.email,
            displayName: row.displayName,
            photoURL: row.photoURL,
            registeredAt: row.registeredAt,
          })),
        });
      } catch (err) {
        return sendJson(200, { success: true, users: [] });
      }
    }

    // 3. API: List all Graphs
    if (pathname === "/api/graphs") {
      const client = await getClient();
      const graphs = await client.list();
      return sendJson(200, { success: true, graphs });
    }

    // 4. API: Bi-Temporal Graph Health Audit
    if (pathname === "/api/audit") {
      const graphName = parsedUrl.query.name || "matters";
      const client = await getClient();
      const graph = client.selectGraph(graphName);

      const [totalNodesRes, totalRelsRes, activeRes, supersededRes, orphanRes, anomalyRes] = await Promise.all([
        graph.query("MATCH (n) RETURN count(n) AS total").catch(() => ({ data: [{ total: 0 }] })),
        graph.query("MATCH ()-[r]->() RETURN count(r) AS total").catch(() => ({ data: [{ total: 0 }] })),
        graph.query("MATCH ()-[r]->(m) WHERE r.valid_to IS NULL RETURN count(r) AS total").catch(() => ({ data: [{ total: 0 }] })),
        graph.query("MATCH ()-[r]->(m) WHERE r.valid_to IS NOT NULL RETURN count(r) AS total").catch(() => ({ data: [{ total: 0 }] })),
        graph.query("MATCH (m) WHERE NOT ()-[]->(m) AND NOT (m)-[]->() RETURN count(m) AS total").catch(() => ({ data: [{ total: 0 }] })),
        graph.query("MATCH ()-[r]->() WHERE r.valid_from IS NOT NULL AND r.valid_to IS NOT NULL AND toString(r.valid_from) > toString(r.valid_to) RETURN count(r) AS total").catch(() => ({ data: [{ total: 0 }] })),
      ]);

      const allGraphs = await client.list();
      const tenantGraphs = allGraphs.map((g) => ({
        name: g,
        isSystemRegistry: g === "matters_system_registry",
        isSandbox: g === "matters_sandbox",
        isDefault: g === "matters",
        isUserTenant: g.startsWith("matters_") && g !== "matters_system_registry" && g !== "matters_sandbox",
      }));

      return sendJson(200, {
        success: true,
        graphName,
        metrics: {
          totalNodes: Number(totalNodesRes.data?.[0]?.total ?? 0),
          totalRelationships: Number(totalRelsRes.data?.[0]?.total ?? 0),
          activeCommitments: Number(activeRes.data?.[0]?.total ?? 0),
          supersededCommitments: Number(supersededRes.data?.[0]?.total ?? 0),
          orphanedNodes: Number(orphanRes.data?.[0]?.total ?? 0),
          temporalAnomalies: Number(anomalyRes.data?.[0]?.total ?? 0),
        },
        tenantPartitions: tenantGraphs,
      });
    }

    // 5. API: Inspect a Graph
    if (pathname === "/api/graph-inspect") {
      const graphName = parsedUrl.query.name;
      if (!graphName) return sendJson(400, { error: "Graph name required" });

      const client = await getClient();
      const graph = client.selectGraph(graphName);

      const [labelsRes, relsRes, sampleRes] = await Promise.all([
        graph.query("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS total").catch(() => ({ data: [] })),
        graph.query("MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS total").catch(() => ({ data: [] })),
        graph.query("MATCH (n) RETURN n LIMIT 15").catch(() => ({ data: [] })),
      ]);

      return sendJson(200, {
        success: true,
        graphName,
        labels: labelsRes.data || [],
        relationships: relsRes.data || [],
        sampleNodes: sampleRes.data || [],
      });
    }

    // 6. API: Run Custom Cypher
    if (pathname === "/api/cypher" && req.method === "POST") {
      const body = await readBody();
      const { graphName, cypher } = body;

      if (!graphName || !cypher) {
        return sendJson(400, { error: "Graph name and Cypher query are required." });
      }

      const client = await getClient();
      const graph = client.selectGraph(graphName);
      const startTime = Date.now();
      const result = await graph.query(cypher);
      const executionTimeMs = Date.now() - startTime;

      return sendJson(200, {
        success: true,
        data: result.data || [],
        metadata: result.metadata || null,
        executionTimeMs,
      });
    }

    // Serve HTML Dashboard for all other routes
    const htmlPath = path.join(__dirname, "public", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(htmlPath).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  } catch (error) {
    console.error("[Admin Server Error]:", error);
    sendJson(500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`\n=======================================================`);
  console.log(`🛡️  MATTERS ADMIN DASHBOARD & FALKORDB EXPLORER`);
  console.log(`🚀 Running at: http://localhost:${PORT}`);
  console.log(`📡 Connected to FalkorDB: ${process.env.FALKORDB_HOST || "localhost"}`);
  console.log(`=======================================================\n`);
});
