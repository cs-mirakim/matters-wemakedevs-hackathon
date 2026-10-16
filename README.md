# Matters — Git for Team Commitments & Agent Memory

> **FalkorDB Graph Hacks 2026 Submission**  
> **Track:** Agent Memory and Coordination (Target: PS5 + GTA VI Prize)  
> **Tagline:** *Developers have Git for code changes. Matters is Git for Agent Memory and Team Commitments—powered by FalkorDB.*

---

## 🌐 Live Submission Links
* **Live Web App:** [https://matters.vercel.app](https://matters.vercel.app) *(or your deployed Vercel domain)*
* **3-Minute Demo Video:** [https://youtu.be/DEMO_VIDEO_LINK](https://youtu.be/DEMO_VIDEO_LINK) *(YouTube / Loom / Google Drive)*
* **GitHub Repository:** [https://github.com/cs-mirakim/matters](https://github.com/cs-mirakim/matters)

---

## 🧠 The Problem: The "Temporal Amnesia" of AI Agents & Teams
Autonomous AI agents and distributed teams suffer from **Temporal Amnesia**:
1. **Vector RAG Fails at Time:** When a collaborator changes a requirement (e.g., Aug 1: *"Budget is RM500"* vs Aug 15: *"Scope expanded to RM850"*), traditional vector embeddings retrieve both snippets and hallucinate because similarity search has no understanding of **temporal validity** (`valid_from` vs `valid_to`).
2. **Multi-Party Coordination Blindspots:** Multiple agents and stakeholders make asynchronous promises across WhatsApp, Slack, emails, and meetings. When an architectural decision or budget changes, earlier commitments are silently invalidated without an audit trail.
3. **No Proof (No Provenance):** Chatbot memory systems can't prove *where* a decision originated, *who* authorized it, or *what Cypher path* connects it to current deliverables.

---

## 💡 The Solution: Bi-Temporal Graph Memory (FalkorDB)
**Matters** acts as a **Version Control System (Git) for Decisions and Commitments**:
* **`git commit` ➔ Quick Capture:** Captures commitments into a bi-temporal graph without overwriting history.
* **`git log` ➔ Historical Lineage:** Preserves superseded commitments for full provenance audit.
* **`git checkout <date>` ➔ Time Travel Scrubber:** Instant Cypher point-in-time state evaluation.
* **`git merge conflict` ➔ Conflict Detection:** Detects overlapping or contradictory deliverables between team members.
* **`git revert` ➔ Bi-Temporal Rollback:** Automatically un-supersedes earlier promises if a new decision is reverted.

---

## ⚡ Why FalkorDB is Load-Bearing (Rules #2 & #3)
> **If you remove FalkorDB from Matters, the product ceases to exist.**

* Matters does **not** use FalkorDB as decorative visualization. All state, time-travel, conflict detection, and agent retrieval queries execute directly in **FalkorDB Cloud** via Cypher.
* Relational SQL and Vector Databases cannot evaluate multi-hop recursive dependency blast radiuses and point-in-time bi-temporal traversals with FalkorDB's sub-millisecond graph performance.

---

## 👥 Synthetic Personas (Rule #6 - 100% Synthetic Data)
Matters ships with 4 realistic synthetic collaborator personas representing multi-party coordination:
1. **Prof. Aris (Project Director / Supervisor):** Directs workspace standards, approving initial baselines and mandating bi-temporal benchmarks.
2. **Melati (Lead AI Engineer):** Designs multi-agent schemas, graph traversals, and FalkorDB Cypher modules.
3. **Mawar (Lead UI/UX Designer):** Renegotiates viewport wireframe deliverables and design system budgets.
4. **Cempaka (Cloud Infra Contractor):** Commits infrastructure uptime SLAs and automated FalkorDB snapshot failovers.

---

## 📊 Graph Data Model

### Node Labels
* `Person`: Collaborator or supervisor `{ name, type, created_at }`
* `Promise`: Commitment with financial or deliverable value `{ text, amount, project, valid_from, valid_to, status, source_id, confidence }`
* `Decision`: Authoritative architectural or governance mandate `{ text, project, valid_from, valid_to, status, source_id, confidence }`
* `Task`: Assigned sprint deliverable `{ text, project, valid_from, valid_to, status, source_id }`
* `Preference`: Collaborative working preference `{ text, project, valid_from, valid_to }`

### Relationship Types
* `(Person)-[:MADE_PROMISE {valid_from, valid_to, source_id, confidence}]->(Promise)`
* `(Person)-[:MADE_DECISION {valid_from, valid_to, source_id}]->(Decision)`
* `(Person)-[:ASSIGNED_TASK {valid_from, valid_to}]->(Task)`
* `(Person)-[:STATED_PREFERENCE]->(Preference)`

---

## 🔍 Core Cypher Queries (Rule #10 Wajib)

### 1. Atomic Supersede & Versioning (Write)
When a new commitment arrives, old overlapping promises are atomicly closed without mutating past truth:
```cypher
MATCH (p:Person)-[r]->(old)
WHERE (old:Promise OR old:Decision OR old:Preference OR old:Task)
  AND old.project = $project
  AND (old.status = 'current' OR r.valid_to IS NULL)
  AND toLower(trim(p.name)) = toLower(trim($personName))
SET r.valid_to = $validFrom, old.valid_to = $validFrom, old.status = 'superseded';

MERGE (p:Person {name: $personName})
ON CREATE SET p.type = $personType, p.created_at = toString(timestamp())
CREATE (pr:Promise {
  text: $text,
  amount: $amount,
  project: $project,
  valid_from: $validFrom,
  valid_to: null,
  status: 'current',
  confidence: $confidence,
  source_id: $sourceId,
  created_at: toString(timestamp())
})
CREATE (p)-[r:MADE_PROMISE {
  valid_from: $validFrom,
  valid_to: null,
  source_id: $sourceId,
  confidence: $confidence
}]->(pr)
RETURN pr;
```

### 2. Bi-Temporal As-Of Time Travel (Read)
Evaluates what was legally and contractually active as of any historical calendar date:
```cypher
MATCH (p:Person)-[r]->(m)
WHERE ($personName = '' OR toLower(p.name) CONTAINS toLower($personName))
  AND r.valid_from <= $asOf
  AND (r.valid_to IS NULL OR r.valid_to > $asOf)
RETURN p.name AS personName, type(r) AS relType, m.text AS text,
       m.amount AS amount, m.project AS project, r.valid_from AS validFrom,
       r.valid_to AS validTo, r.source_id AS sourceId, r.confidence AS confidence
ORDER BY r.valid_from DESC;
```

### 3. Multi-Party Conflict Detection
Finds simultaneous conflicting promises for the same project:
```cypher
MATCH (p:Person {name: $personName})-[r1:MADE_PROMISE]->(pr1:Promise),
      (p)-[r2:MADE_PROMISE]->(pr2:Promise)
WHERE pr1 <> pr2 
  AND pr1.project = pr2.project
  AND r1.valid_from < r2.valid_to 
  AND r2.valid_from < r1.valid_to
RETURN pr1.text AS conflict1, pr2.text AS conflict2, pr1.project AS project;
```

### 4. Interactive Graph Visualization
Extracts interconnected nodes and edges for the React Flow canvas:
```cypher
MATCH (p:Person)-[r]->(m)
WHERE m:Promise OR m:Decision OR m:Preference OR m:Task
RETURN p.name AS personName, p.type AS personType, type(r) AS relType,
       m.text AS text, m.amount AS amount, m.project AS project,
       m.status AS status, r.valid_from AS validFrom, r.valid_to AS validTo,
       labels(m)[0] AS nodeType, r.source_id AS sourceId
LIMIT 100;
```

### 5. Provenance Trace & Bi-Temporal Rollback
Verifies origin proof and un-supersedes previous commitments upon rollback:
```cypher
MATCH (pr {source_id: $sourceId})
WHERE pr:Promise OR pr:Decision OR pr:Preference OR pr:Task
WITH pr, pr.project AS proj, pr.valid_from AS vFrom
OPTIONAL MATCH (oldP:Person)-[ro]->(old {project: proj, status: 'superseded'})
WHERE old.valid_to = vFrom
SET ro.valid_to = null, old.valid_to = null, old.status = 'current'
DETACH DELETE pr;
```

---

## 🔒 Security & Tenant Isolation (IDOR Protected)
* **Cryptographic Server-Side Identity:** API routes never trust client-supplied tenant identifiers. Tenant graphs are isolated on FalkorDB Cloud using `matters_<userId>`.
* **Zero Secret Leakage:** All FalkorDB credentials and Firebase Admin private keys are exclusively server-side.
* **Rate Limiting & Zod Validation:** High-concurrency write protection on all capture endpoints.

---

## 🤖 AI Disclosure (Rule #11)
Built with **Antigravity** (Google) and **Gemini 3.5 Flash Lite** for structured entity extraction and natural language reasoning.  
The graph data model, bi-temporal Cypher superseding logic, Next.js architecture, and security boundaries were designed, verified, and audited by human developer **Muhammad Amir Hakim** (Solo).

---

## 🛠️ Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/cs-mirakim/matters.git
cd matters

# 2. Install dependencies
npm install

# 3. Configure environment variables (.env.local)
cp .env.example .env.local
# Add FALKORDB_HOST, FALKORDB_PORT, FALKORDB_PASSWORD, GEMINI_API_KEY, FIREBASE credentials

# 4. Run development server
npm run dev
# Open http://localhost:3000
```

---

## 🏆 Submission Summary
* **Author:** Muhammad Amir Hakim (Solo)
* **Track:** Agent Memory and Coordination
* **Target Prize:** PS5 with GTA VI
* **FalkorDB Engine:** FalkorDB Cloud (Bi-Temporal Graph Engine)
