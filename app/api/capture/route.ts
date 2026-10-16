import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/ratelimit";
import { extractMemoryEntities, ExtractionSchema } from "@/lib/gemini";
import { getGraphForUser } from "@/lib/falkordb";

export const dynamic = "force-dynamic";

const ContextSchema = z.object({
  existingProjects: z.array(z.string()).optional(),
  existingPersons: z.array(z.string()).optional(),
  recentMemories: z.array(z.string()).optional(),
}).optional();

const CaptureInputSchema = z.object({
  text: z.string().min(2, "Text must be at least 2 characters").max(1000),
  sourceId: z.string().optional(),
  project: z.string().optional(),
  confirmed: z.boolean().optional().default(false),
  confirmedData: ExtractionSchema.optional(),
  context: ContextSchema,
});

const EditInputSchema = z.object({
  sourceId: z.string().min(1, "sourceId is required"),
  text: z.string().min(2),
  personName: z.string().min(1),
  project: z.string().min(1),
  validFrom: z.string().optional(),
  validTo: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  status: z.enum(["current", "superseded"]).default("current"),
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
          { error: "Too many consecutive requests. Please wait a moment." },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const validatedInput = CaptureInputSchema.safeParse(body);
    if (!validatedInput.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validatedInput.error.format() },
        { status: 400 }
      );
    }

    const { text, confirmed, confirmedData, context } = validatedInput.data;
    const sourceId = validatedInput.data.sourceId || `capture_${Date.now()}`;
    const activeProject = validatedInput.data.project || "General";

    // Build context with defaults (including Malay supervisor alias hints if relevant)
    const combinedContext = {
      existingProjects: context?.existingProjects || ["FYP", "Innovation Studio Portal", "Agent Memory Core", "FalkorDB Clusters & SLA"],
      existingPersons: context?.existingPersons || ["Madam Gee", "Prof. Aris", "Melati", "Mawar", "Cempaka"],
      recentMemories: context?.recentMemories || [],
    };

    // If logged in, optionally fetch live persons and projects from FalkorDB graph
    if (!isGuest && user?.uid) {
      try {
        const graph = await getGraphForUser(user.uid);
        const [peopleRes, projsRes]: any = await Promise.all([
          graph.query("MATCH (p:Person) RETURN DISTINCT p.name AS name LIMIT 30"),
          graph.query("MATCH (m) WHERE m.project IS NOT NULL RETURN DISTINCT m.project AS project LIMIT 30"),
        ]);
        if (Array.isArray(peopleRes?.data)) {
          const fetchedPersons = peopleRes.data.map((r: any) => r[0] || r.name).filter(Boolean);
          combinedContext.existingPersons = Array.from(new Set([...combinedContext.existingPersons, ...fetchedPersons]));
        }
        if (Array.isArray(projsRes?.data)) {
          const fetchedProjs = projsRes.data.map((r: any) => r[0] || r.project).filter(Boolean);
          combinedContext.existingProjects = Array.from(new Set([...combinedContext.existingProjects, ...fetchedProjs]));
        }
      } catch (e) {
        console.warn("[/api/capture] Notice loading graph context:", e);
      }
    }

    // If user has NOT confirmed yet, extract preview for confirmation without writing to DB yet
    if (!confirmed) {
      const smartResult = await extractMemoryEntities(text, activeProject, combinedContext);

      return NextResponse.json({
        success: true,
        needsClarification: smartResult.needsClarification,
        issues: smartResult.issues,
        clarificationQuestions: smartResult.clarificationQuestions,
        extracted: smartResult.extracted,
        sourceId,
      });
    }

    // If user already confirmed smart clarification dialog
    const dataToSave = confirmedData || (await extractMemoryEntities(text, activeProject, combinedContext)).extracted;
    return await persistToFalkor(user, dataToSave, sourceId, isGuest);
  } catch (error: any) {
    console.error("[/api/capture] Server error:", error);
    return NextResponse.json(
      { error: "Failed to process memory", message: error?.message },
      { status: 500 }
    );
  }
}

// PUT /api/capture - Edit an existing memory node
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const validated = EditInputSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { sourceId, text, personName, project, validFrom, validTo, amount, status } = validated.data;
    const effectiveValidTo = status === "current" ? null : (validTo ? validTo.trim() || null : null);

    if (isGuest) {
      // Guest mode return simulated update
      return NextResponse.json({
        success: true,
        updated: true,
        memory: {
          sourceId,
          text,
          personName,
          project,
          validFrom: validFrom || new Date().toISOString().split("T")[0],
          validTo: effectiveValidTo,
          amount: amount ?? null,
          status,
        },
        dbStatus: "guest_sandbox",
      });
    }

    const graph = await getGraphForUser(user.uid);

    // Cypher: update memory node, synchronize valid_to on all incoming relationships, and rewire person if changed
    const updateCypher = `
      MATCH (pr {source_id: $sourceId})
      WHERE pr:Promise OR pr:Decision OR pr:Preference OR pr:Task
      SET pr.text = $text,
          pr.project = $project,
          pr.valid_from = $validFrom,
          pr.valid_to = $effectiveValidTo,
          pr.amount = $amount,
          pr.status = $status
      WITH pr
      OPTIONAL MATCH (p:Person)-[r]->(pr)
      SET r.valid_from = $validFrom, r.valid_to = $effectiveValidTo
      WITH pr, p, r
      WHERE p IS NOT NULL AND p.name <> $personName
      DELETE r
      WITH pr
      MERGE (newP:Person {name: $personName})
      ON CREATE SET newP.type = 'collaborator', newP.created_at = toString(timestamp())
      MERGE (newP)-[nr:MADE_PROMISE {source_id: $sourceId}]->(pr)
      SET nr.valid_from = $validFrom, nr.valid_to = $effectiveValidTo
      RETURN pr
    `;

    const params = {
      sourceId,
      text,
      personName,
      project,
      validFrom: validFrom || new Date().toISOString().split("T")[0],
      effectiveValidTo,
      amount: amount ?? null,
      status,
    };

    await graph.query(updateCypher, { params });

    return NextResponse.json({
      success: true,
      updated: true,
      memory: {
        sourceId,
        text,
        personName,
        project,
        validFrom: params.validFrom,
        validTo: effectiveValidTo,
        amount: params.amount,
        status,
      },
      dbStatus: "connected",
    });
  } catch (err: any) {
    console.error("[/api/capture PUT] Edit failed:", err);
    return NextResponse.json(
      { error: "Failed to update memory", message: err?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/capture - Revert / undo an existing memory node
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    let sourceId = searchParams.get("sourceId");
    if (!sourceId) {
      try {
        const body = await req.json();
        sourceId = body?.sourceId;
      } catch {}
    }

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required for reverting memory" },
        { status: 400 }
      );
    }

    if (isGuest) {
      return NextResponse.json({
        success: true,
        reverted: true,
        sourceId,
        dbStatus: "guest_sandbox",
      });
    }

    const graph = await getGraphForUser(user.uid);

    // Cypher: Un-supersede earlier commitment if this memory superseded it, then delete this memory
    const revertCypher = `
      MATCH (pr {source_id: $sourceId})
      WHERE pr:Promise OR pr:Decision OR pr:Preference OR pr:Task
      WITH pr, pr.project AS proj, pr.valid_from AS vFrom
      OPTIONAL MATCH (oldP:Person)-[ro]->(old {project: proj, status: 'superseded'})
      WHERE (old:Promise OR old:Decision OR old:Preference OR old:Task) AND old.valid_to = vFrom
      SET old.valid_to = null, old.status = 'current', ro.valid_to = null
      WITH pr
      DETACH DELETE pr
      RETURN count(pr) AS deletedCount
    `;

    await graph.query(revertCypher, { params: { sourceId } });

    return NextResponse.json({
      success: true,
      reverted: true,
      sourceId,
      dbStatus: "connected",
    });
  } catch (err: any) {
    console.error("[/api/capture DELETE] Revert failed:", err);
    return NextResponse.json(
      { error: "Failed to revert memory", message: err?.message },
      { status: 500 }
    );
  }
}

async function persistToFalkor(
  user: any,
  extracted: any,
  sourceId: string,
  isGuest: boolean
) {
  if (isGuest) {
    return NextResponse.json({
      success: true,
      needsClarification: false,
      saved: true,
      extracted,
      sourceId,
      dbStatus: "guest_sandbox",
    });
  }

  const rawType = String(extracted.memoryType || extracted.nodeType || "Promise").trim();
  const validTypes: Record<string, { label: string; rel: string }> = {
    Decision: { label: "Decision", rel: "MADE_DECISION" },
    Task: { label: "Task", rel: "ASSIGNED_TASK" },
    Preference: { label: "Preference", rel: "STATED_PREFERENCE" },
    Promise: { label: "Promise", rel: "MADE_PROMISE" },
  };

  const matchedKey = Object.keys(validTypes).find(
    (k) => k.toLowerCase() === rawType.toLowerCase()
  );
  const nodeLabel = matchedKey ? validTypes[matchedKey].label : "Promise";
  const relType = matchedKey ? validTypes[matchedKey].rel : "MADE_PROMISE";

  const supersedeCypher = `
    MATCH (p:Person)-[r]->(old)
    WHERE (old:Promise OR old:Decision OR old:Preference OR old:Task)
      AND old.project = $project
      AND (old.status = 'current' OR r.valid_to IS NULL)
      AND (
        toLower(trim(p.name)) = toLower(trim($personName))
        OR toLower(p.name) CONTAINS toLower(trim($personName))
        OR toLower(trim($personName)) CONTAINS toLower(p.name)
      )
    SET r.valid_to = $validFrom, old.valid_to = $validFrom, old.status = 'superseded'
    RETURN count(old) AS superseded
  `;

  const createCypher = `
    MERGE (p:Person {name: $personName})
    ON CREATE SET p.type = $personType, p.created_at = toString(timestamp())
    
    CREATE (pr:${nodeLabel} {
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
    CREATE (p)-[r:${relType} {
      valid_from: $validFrom,
      valid_to: null,
      source_id: $sourceId,
      confidence: $confidence
    }]->(pr)
    RETURN pr
  `;

  const params = {
    personName: extracted.personName,
    personType: extracted.personType,
    project: extracted.project || "General",
    validFrom: extracted.validFrom,
    text: extracted.text,
    amount: extracted.amount ?? 0,
    confidence: extracted.confidence,
    sourceId,
  };

  try {
    const graph = await getGraphForUser(user.uid);
    await graph.query(supersedeCypher, { params });
    await graph.query(createCypher, { params });

    return NextResponse.json({
      success: true,
      needsClarification: false,
      saved: true,
      extracted,
      sourceId,
      dbStatus: "connected",
    });
  } catch (err: any) {
    console.error("[FalkorDB /api/capture] Persist failed:", err);
    return NextResponse.json(
      { error: "Failed to persist to FalkorDB", message: err?.message },
      { status: 503 }
    );
  }
}
