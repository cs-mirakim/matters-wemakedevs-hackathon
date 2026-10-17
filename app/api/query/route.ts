import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { getGraphForUser } from "@/lib/falkordb";

export const dynamic = "force-dynamic";

const QueryInputSchema = z.object({
  personName: z.string().max(100).optional().default(""),
  asOf: z.string().min(1), // ISO Date String e.g. "2026-08-10"
  project: z.string().optional(),
  deletedProjects: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const isGuestHeader = req.headers.get("x-guest-mode") === "true";
    const authHeader = req.headers.get("authorization") || "";
    let isGuest = isGuestHeader || !authHeader || authHeader.includes("guest") || authHeader.includes("demo_user_session");
    let user: any = null;

    if (!isGuest) {
      try {
        user = await verifyAuthToken(authHeader);
        if (!user || user.uid === "demo_user" || user.uid === "demo_tuah_student") {
          isGuest = true;
        }
      } catch {
        isGuest = true;
      }
    }

    if (!isGuest && user?.uid) {
      const rateStatus = checkRateLimit(user.uid);
      if (!rateStatus.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a minute." },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const validated = QueryInputSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation error", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { personName, asOf, project, deletedProjects = [] } = validated.data;

    // Cypher Query 2: Time Travel Query across persons
    const timeTravelCypher = `
      MATCH (p:Person)-[r]->(m)
      WHERE ($personName = '' OR toLower(p.name) CONTAINS toLower($personName))
        AND r.valid_from <= $asOf
        AND (r.valid_to IS NULL OR r.valid_to > $asOf)
      RETURN p.name AS personName, type(r) AS relType, m.text AS text,
             m.amount AS amount, m.project AS project, r.valid_from AS validFrom,
             r.valid_to AS validTo, r.source_id AS sourceId, r.confidence AS confidence
      ORDER BY r.valid_from DESC
    `;

    // Cypher Query 3: Conflict Detection
    const conflictCypher = `
      MATCH (p:Person {name: $personName})-[r1:MADE_PROMISE]->(pr1:Promise),
            (p)-[r2:MADE_PROMISE]->(pr2:Promise)
      WHERE pr1 <> pr2 
        AND pr1.project = pr2.project
        AND r1.valid_from < r2.valid_to 
        AND r2.valid_from < r1.valid_to
      RETURN pr1.text AS conflict1, pr2.text AS conflict2, pr1.project AS project
    `;

    let activeMemories: any[] = [];
    let conflicts: any[] = [];
    let dbStatus = "connected";

    const workspaceOwnerHeader = req.headers.get("x-workspace-owner");
    const targetUid = workspaceOwnerHeader || user?.uid;

    if (!isGuest && targetUid) {
      try {
        const graph = await getGraphForUser(targetUid);
        const res: any = await graph.query(timeTravelCypher, {
          params: { personName, asOf },
        });
        if (res && res.data && res.data.length > 0) {
          activeMemories = res.data;
        }

        const confRes: any = await graph.query(conflictCypher, {
          params: { personName },
        });
        if (confRes && confRes.data) {
          conflicts = confRes.data;
        }
      } catch (e: any) {
        console.warn("[FalkorDB /api/query] Query fallback notice:", e?.message || e);
        dbStatus = "synthetic_simulation";
      }
    } else {
      // Mod Sandbox Guest: Bi-temporal filter atas rekod dummy
      const SANDBOX_QUERY_POOL = [
        { personName: "Prof. Aris", relType: "MADE_DECISION", text: "Approved standard RAG vector baseline for evaluation", validFrom: "2026-08-01", validTo: "2026-08-10", project: "Innovation Studio Portal", confidence: 0.99, sourceId: "sandbox_aris_1" },
        { personName: "Prof. Aris", relType: "MADE_DECISION", text: "Mandated bi-temporal graph memory benchmarks against classic vector search", validFrom: "2026-08-11", validTo: null, project: "Innovation Studio Portal", confidence: 0.98, sourceId: "sandbox_aris_2" },
        { personName: "Melati", relType: "MADE_DECISION", text: "Agreed to use local SQLite cache for initial graph persistence prototype", validFrom: "2026-08-01", validTo: "2026-08-12", project: "Innovation Studio Portal", confidence: 0.99, sourceId: "sandbox_melati_1" },
        { personName: "Melati", relType: "MADE_DECISION", text: "Upgraded to FalkorDB Cloud Graph to support multi-agent bi-temporal isolation", validFrom: "2026-08-13", validTo: null, project: "Agent Memory Core", confidence: 0.98, sourceId: "sandbox_melati_2" },
        { personName: "Mawar", relType: "MADE_PROMISE", text: "Agreed to RM500 for initial 3 basic dashboard mockups and wireframes", amount: 500, validFrom: "2026-08-01", validTo: "2026-08-14", project: "Innovation Studio Portal", confidence: 0.95, sourceId: "sandbox_mawar_1" },
        { personName: "Mawar", relType: "MADE_PROMISE", text: "Expanded design system to 8 multi-agent viewports & time slider for RM850", amount: 850, validFrom: "2026-08-15", validTo: null, project: "Innovation Studio Portal", confidence: 0.97, sourceId: "sandbox_mawar_2" },
        { personName: "Cempaka", relType: "MADE_PROMISE", text: "Committed single-node Redis server setup with $600 hosting budget", amount: 600, validFrom: "2026-08-03", validTo: "2026-08-16", project: "FalkorDB Clusters & SLA", confidence: 0.96, sourceId: "sandbox_cempaka_1" },
        { personName: "Cempaka", relType: "MADE_PROMISE", text: "Migrated to low-latency FalkorDB cluster with snapshot failover for $950", amount: 950, validFrom: "2026-08-17", validTo: null, project: "FalkorDB Clusters & SLA", confidence: 0.95, sourceId: "sandbox_cempaka_2" },
        { personName: "Cempaka", relType: "MADE_PROMISE", text: "Guaranteed 99.9% uptime SLA and disaster recovery testing before launch for $1200", amount: 1200, validFrom: "2026-08-25", validTo: null, project: "FalkorDB Clusters & SLA", confidence: 0.92, sourceId: "sandbox_cempaka_3" },
      ];

      activeMemories = SANDBOX_QUERY_POOL.filter((m) => {
        const matchesPerson = !personName || m.personName.toLowerCase().includes(personName.toLowerCase());
        const isCurrentlyValid = m.validFrom <= asOf && (!m.validTo || m.validTo > asOf);
        return matchesPerson && isCurrentlyValid;
      });

      dbStatus = "guest_sandbox";
    }

    // Filter out deleted projects
    const deletedClean = (deletedProjects || []).map((d: string) => String(d).toLowerCase().trim());
    if (deletedClean.length > 0) {
      activeMemories = activeMemories.filter((m) => {
        const p = String(m.project || "").toLowerCase().trim();
        return !deletedClean.includes(p);
      });
    }

    // Filter by selected project if specified
    if (project && project.toLowerCase() !== "all") {
      const projClean = project.toLowerCase().trim();
      activeMemories = activeMemories.filter((m) => {
        const p = String(m.project || "").toLowerCase().trim();
        return p === projClean;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        personName,
        asOf,
        activeMemories,
        conflicts,
        dbStatus,
        cypherQuery: timeTravelCypher.trim(),
      },
    });
  } catch (err: any) {
    console.error("[/api/query] Server Error:", err);
    return NextResponse.json({ error: "Failed to perform query" }, { status: 500 });
  }
}
