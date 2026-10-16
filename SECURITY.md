# Matters — Security Policy & Architectural Defense

## Executive Security Summary

**Matters** is built with a defense-in-depth security model designed specifically for multi-tenant agentic workflows, knowledge graph persistence, and bi-temporal memory auditing. 

The system guarantees **Zero-Amnesia** without compromising on **Insecure Direct Object Reference (IDOR)** prevention, **Cypher Injection** defense, or **LLM data leakage**.

| Security Domain | Mechanism Implemented | Security Status |
| :--- | :--- | :---: |
| **Authentication & Identity** | Firebase Google OAuth 2.0 + Server-Side Admin SDK Verification | **ENFORCED** |
| **Tenant Isolation (IDOR)** | Per-User Graph Partitioning (`matters_<uid>`) | **ENFORCED** |
| **Graph Query Protection** | Parameterized Cypher Queries ($params) | **ENFORCED** |
| **Audit Immutability** | Bi-Temporal Valid-Time Stamping (`valid_from` & `valid_to`) | **ENFORCED** |
| **Input Validation** | Zod Schema Validation on all API Ingestion Endpoints | **ENFORCED** |
| **Rate Limiting** | Sliding Window Per-User Rate Limiter (10 req/min) | **ENFORCED** |
| **AI Memory Privacy** | Ephemeral In-Memory Chat Sessions (Zero Persistent Logs) | **ENFORCED** |
| **Secrets Management** | Server-Side `.env.local` Isolation (Zero Client Bundle Leaks) | **ENFORCED** |

---

## 1. Multi-Tenant IDOR Prevention & Graph Partitioning

### The Threat
In traditional multi-tenant graph databases, storing all user nodes in a single flat graph with a `user_id` property introduces critical IDOR (*Insecure Direct Object Reference*) vulnerabilities if a query omits the filter or if an attacker manipulates graph traversals.

### Matters Defense
- **Dedicated Physical Graph Containers**: Each authenticated user is allocated an isolated graph partition in FalkorDB named:
  ```text
  matters_<Firebase_UID>
  ```
- **Server-Side Identity Derivation**: API routes (`/api/graph`, `/api/capture`, `/api/project`, `/api/chat`, `/api/auth/user`) **never** trust client-supplied tenant identifiers. The tenant partition is extracted exclusively from the cryptographically verified Firebase ID token:
  ```typescript
  // lib/falkordb.ts
  export async function getGraphForUser(userId: string) {
    const client = await getFalkorClient();
    const sanitizedId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    return client.selectGraph(`matters_${sanitizedId}`);
  }
  ```
- **Cross-Tenant Prohibition**: It is physically impossible for a query executed on `matters_userA` to traverse into or access edges belonging to `matters_userB`.
- **Sandbox Quarantine**: Unauthenticated or guest sessions operate strictly in `matters_sandbox`, ensuring synthetic persona testing never touches or pollutes production tenant data.

---

## 2. Authentication & Authorization Flow

- **OAuth 2.0 Standard**: Authentication is handled exclusively via Google OAuth 2.0 through Firebase Auth. No custom password hashes are stored in the database.
- **Separate Registration Enforcement**:
  - `Sign In`: Permitted only for pre-registered Google accounts registered in `matters_system_registry`.
  - `Sign Up`: Explicit consent required to provision a new user tenant and FalkorDB container.
- **Cryptographic Token Verification**: The backend validates the `Authorization: Bearer <ID_TOKEN>` header against Google's public keys using the **Firebase Admin SDK** (RSA 2048-bit service account key):
  ```typescript
  // lib/firebase-admin.ts
  export async function verifyAuthToken(authHeader: string | null) {
    const token = authHeader.split("Bearer ")[1]?.trim();
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  }
  ```
- **Strict Account Deletion IDOR Protection**: The account deletion endpoint (`DELETE /api/auth/user`) mandates that the decoded token UID matches the requested deletion target before purging the personal FalkorDB graph.

---

## 3. Cypher Injection Defense

### The Threat
Similar to SQL Injection, concatenating unsanitized user text directly into Cypher queries allows malicious actors to escape string literals and run arbitrary Cypher commands (`MATCH (n) DETACH DELETE n`).

### Matters Defense
- **100% Parameterized Cypher**: All Cypher statements utilize strict query parameters (`$paramName`):
  ```typescript
  // app/api/capture/route.ts
  const createCypher = `
    MERGE (p:Person {name: $personName})
    CREATE (pr:Promise {
      text: $text,
      amount: $amount,
      project: $project,
      valid_from: $validFrom,
      status: 'current'
    })
    CREATE (p)-[r:MADE_PROMISE {valid_from: $validFrom}]->(pr)
    RETURN pr
  `;
  await graph.query(createCypher, params);
  ```
- User input is treated strictly as data literals and never evaluated as query syntax.

---

## 4. Input Sanitization & Schema Validation

All incoming API payloads are validated using **Zod** schemas before reaching backend logic or database persistence:

```typescript
// app/api/capture/route.ts
const CaptureInputSchema = z.object({
  text: z.string().min(2).max(1000),
  sourceId: z.string().optional(),
  project: z.string().optional(),
  confirmed: z.boolean().optional().default(false),
  confirmedData: ExtractionSchema.optional(),
});
```

- **String Length Limits**: Statements are capped at 1,000 characters to prevent buffer and memory exhaustion.
- **Entity Schema Conformance**: AI extraction output from Google Gemini is schema-validated before Cypher persistence (`ExtractionSchema.parse(extracted)`), neutralizing prompt injection payloads that attempt to return malicious properties.

---

## 5. Rate Limiting & DoS Mitigation

To safeguard external LLM quotas (Google AI Studio) and FalkorDB Cloud resources:
- An in-memory sliding-window rate limiter (`lib/ratelimit.ts`) enforces a strict threshold:
  ```text
  Maximum 10 write/extraction requests per minute per User UID
  ```
- Requests exceeding this threshold receive immediate `HTTP 429 Too Many Requests` responses without consuming upstream cloud compute.

---

## 6. Bi-Temporal Immutability & Anti-Tamper Audit Trail

In Matters, historical agreements and commitments are **never** mutated:
- **No In-Place Overwrites**: An update to a decision does not execute `UPDATE` or replace past nodes.
- **Valid-Time Boundaries**: When a commitment is superseded, its edge attribute is stamped with `valid_to = $effectiveDate`, and the new commitment is created with `valid_from = $effectiveDate`.
- **Bulletproof Auditability**: At any point, the system can answer *"What was the agreed scope on August 10th?"* with mathematical graph certainty.

---

## 7. AI Chat Session Privacy (Zero Data Retention)

- **Temporary In-Memory State**: The AI assistant chat session operates exclusively within React client-side component memory.
- **No Database Logging**: Conversation transcripts, prompts, and temporary user questions are never stored in FalkorDB, Firebase, or browser `localStorage`.
- **Instant Clean Purge**: When a user logs out, switches personas, or exits sandbox mode, the in-memory chat array is wiped immediately.

---

## 8. Secrets Management & Zero Client-Side Leaks

- **Strict Environment Segregation**:
  - `GEMINI_API_KEY`: Stored exclusively server-side. Never exposed to browser bundles.
  - `FALKORDB_PASSWORD`: Accessed solely via server routes.
  - `FIREBASE_ADMIN_PRIVATE_KEY`: Server-side service account certificate.
  - `NEXT_PUBLIC_FIREBASE_*`: Contains public OAuth client IDs only (standard Google OAuth security model).
- **Git Guardian**: `.gitignore` comprehensively excludes all `.env`, `.env*.local`, and credentials files from git commits.

---

## 9. Security Audit Checklist (OWASP / security-prompt.hamizi.net)

| OWASP Top 10 / Vulnerability Class | Mitigation in Matters |
| :--- | :--- |
| **A01: Broken Access Control (IDOR)** | Enforced via dedicated per-UID graph containers (`matters_<uid>`) and token identity matching. |
| **A02: Cryptographic Failures** | TLS 1.3 encrypted connections to FalkorDB Cloud and Firebase OAuth endpoints; RSA 2048-bit token validation. |
| **A03: Injection (Cypher / SQL)** | Zero string concatenation; 100% parameterized Cypher variables. |
| **A04: Insecure Design** | Bi-temporal immutability eliminates data loss from hostile overwrites. |
| **A05: Security Misconfiguration** | Admin Console runs on Port 3001 with distinct routes; production Next.js build runs in strict mode. |
| **A06: Vulnerable Dependencies** | Automated audit with zero deprecated high-risk packages; modern Next.js 14.2 & FalkorDB v5. |
| **A07: Identification & Auth Failures** | Google OAuth 2.0 with separate Sign In / Sign Up registration gates. |
| **A08: Software & Data Integrity** | Zod runtime schema validation on all API requests and LLM responses. |
| **A09: Security Logging & Monitoring** | Dedicated Bi-Temporal Health Telemetry on Admin Port 3001 detects orphaned nodes and date anomalies. |
| **A10: Server-Side Request Forgery (SSRF)** | No arbitrary URL fetching permitted from user input; outbound calls restricted to Google AI Studio and FalkorDB endpoints. |

---

## Reporting a Security Vulnerability

If you discover a potential security vulnerability within Matters, please submit an issue or reach out directly to the maintainers at `amirh@matters.local`. We practice responsible disclosure and address critical vulnerabilities within 24 hours.
