const { FalkorDB } = require("falkordb");
const path = require("path");

async function inspectFalkorDB() {
  const host = process.env.FALKORDB_HOST || "localhost";
  const port = parseInt(process.env.FALKORDB_PORT || "6379", 10);
  const password = process.env.FALKORDB_PASSWORD;
  const username = process.env.FALKORDB_USER || "falkordb";

  console.log("\n=======================================================");
  console.log("🔍 MENYAMBUNG KE FALKORDB...");
  console.log(`📡 Host: ${host}:${port}`);
  console.log("=======================================================\n");

  try {
    const client = await FalkorDB.connect({
      host,
      port,
      password: password || undefined,
      username,
    });

    const graphs = await client.list();
    console.log(`✅ Berjaya disambungkan! Dijumpai ${graphs.length} graf:\n`);

    for (let i = 0; i < graphs.length; i++) {
      const gName = graphs[i];
      console.log(`-------------------------------------------------------`);
      console.log(`📁 [${i + 1}/${graphs.length}] Graf: ${gName}`);
      console.log(`-------------------------------------------------------`);

      const graph = client.selectGraph(gName);

      // 1. Kiraan nodus
      const countsRes = await graph.query("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS total");
      const counts = countsRes.data || [];
      if (counts.length === 0) {
        console.log("   (Graf ini kosong)\n");
        continue;
      }

      console.log("   📊 Ringkasan Nodus:");
      counts.forEach((c) => {
        console.log(`      • ${c.label || "Nodus"}: ${c.total}`);
      });

      // 2. Senarai Orang (Person)
      const peopleRes = await graph.query("MATCH (p:Person) RETURN p.name AS name, p.type AS type LIMIT 10");
      if (peopleRes.data && peopleRes.data.length > 0) {
        console.log("\n   👤 Individu (Person):");
        peopleRes.data.forEach((p) => {
          console.log(`      • ${p.name} (${p.type || "collaborator"})`);
        });
      }

      // 3. Senarai Janji & Keputusan (Promises / Memories)
      const memoriesRes = await graph.query(
        "MATCH (p:Person)-[r]->(m) RETURN p.name AS person, type(r) AS rel, m.text AS text, m.amount AS amount, m.project AS project, m.status AS status, r.valid_from AS valid_from, r.valid_to AS valid_to LIMIT 10"
      );

      if (memoriesRes.data && memoriesRes.data.length > 0) {
        console.log("\n   📝 Komitmen / Janji Dalam Graf:");
        memoriesRes.data.forEach((m, idx) => {
          const amountStr = m.amount ? ` [RM${m.amount}]` : "";
          const statusStr = m.status === "superseded" ? "❌ [SUPERSEDED]" : "✅ [CURRENT]";
          const dateStr = m.valid_to ? `(Sah: ${m.valid_from} hingga ${m.valid_to})` : `(Sah dari: ${m.valid_from})`;
          console.log(`      ${idx + 1}. ${m.person} ──[${m.rel}]──> "${m.text}"${amountStr}`);
          console.log(`         Project: ${m.project || "General"} | ${statusStr} ${dateStr}`);
        });
      }
      console.log("");
    }

    console.log("=======================================================");
    console.log("✨ Pemeriksaan FalkorDB Selesai!");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Ralat menyambung ke FalkorDB:", err.message);
    process.exit(1);
  }
}

inspectFalkorDB();
