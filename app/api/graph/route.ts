import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { getGraphForUser } from "@/lib/falkordb";
import { cleanProjectName, formatProjectDisplay, isAllProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

const GRAPH_CYPHER = `
  MATCH (p:Person)-[r]->(m)
  WHERE (m:Promise OR m:Decision OR m:Preference OR m:Task)
  RETURN p.name AS personName, p.type AS personType, type(r) AS relType,
         coalesce(toString(r.valid_from), toString(m.valid_from)) AS validFrom,
         coalesce(toString(r.valid_to), toString(m.valid_to)) AS validTo,
         coalesce(r.source_id, m.source_id) AS sourceId,
         coalesce(r.confidence, m.confidence, 0.95) AS confidence,
         m.text AS text, m.amount AS amount, m.project AS project,
         coalesce(m.status, 'current') AS status,
         labels(m)[0] AS nodeType
  ORDER BY validFrom ASC
  LIMIT 300
`;

const PROJECTS_CYPHER = `
  MATCH (m)
  WHERE m.project IS NOT NULL AND m.project <> ''
  RETURN DISTINCT m.project AS project
  LIMIT 50
`;

// Synthetic Personas Ecosystem for Guest Sandbox Mode
const PERSONA_NAMES: Record<string, string> = {
  aris: "Prof. Aris",
  melati: "Melati",
  mawar: "Mawar",
  cempaka: "Cempaka",
  sofia: "Dr. Sofia",
};

const PROJECT_METADATA: Record<
  string,
  { owner: string; ownerRole: string; contributors: string[] }
> = {
  "Innovation Studio Portal": {
    owner: "Prof. Aris",
    ownerRole: "Director / Supervisor",
    contributors: ["Melati", "Mawar"],
  },
  "Agent Memory Core": {
    owner: "Melati",
    ownerRole: "Lead AI Engineer",
    contributors: ["Prof. Aris"],
  },
  "FalkorDB Clusters & SLA": {
    owner: "Prof. Aris",
    ownerRole: "Client / Sponsor",
    contributors: ["Cempaka"],
  },
};

const PERSONA_PROJECT_MAP: Record<string, string[]> = {
  aris: ["Innovation Studio Portal", "Agent Memory Core", "FalkorDB Clusters & SLA"],
  melati: ["Agent Memory Core", "Innovation Studio Portal"],
  mawar: ["Innovation Studio Portal"],
  cempaka: ["FalkorDB Clusters & SLA"],
  sofia: ["Innovation Studio Portal", "Agent Memory Core", "FalkorDB Clusters & SLA"],
};


const SANDBOX_DEMO_RECORDS = [
  // --- Prof. Aris (Project Director) ---
  {
    personName: "Prof. Aris",
    personType: "supervisor",
    relType: "MADE_DECISION",
    validFrom: "2026-08-01",
    validTo: "2026-08-10",
    sourceId: "sandbox_aris_1",
    confidence: 0.99,
    text: "Approved standard RAG vector baseline for evaluation across teams.",
    amount: null,
    project: "Innovation Studio Portal",
    status: "superseded",
    nodeType: "Decision",
  },
  {
    personName: "Prof. Aris",
    personType: "supervisor",
    relType: "MADE_DECISION",
    validFrom: "2026-08-11",
    validTo: null,
    sourceId: "sandbox_aris_2",
    confidence: 0.98,
    text: "Mandated bi-temporal graph memory benchmarks against classic vector search.",
    amount: null,
    project: "Innovation Studio Portal",
    status: "current",
    nodeType: "Decision",
  },
  {
    personName: "Prof. Aris",
    personType: "supervisor",
    relType: "ASSIGNED_TASK",
    validFrom: "2026-08-24",
    validTo: null,
    sourceId: "sandbox_aris_3",
    confidence: 0.95,
    text: "Review sprint deliverables & FalkorDB query telemetry before public launch.",
    amount: null,
    project: "Agent Memory Core",
    status: "current",
    nodeType: "Task",
  },

  // --- Melati (Lead AI Engineer) ---
  {
    personName: "Melati",
    personType: "collaborator",
    relType: "MADE_DECISION",
    validFrom: "2026-08-01",
    validTo: "2026-08-12",
    sourceId: "sandbox_melati_1",
    confidence: 0.99,
    text: "Agreed to use local SQLite cache for initial graph persistence prototype.",
    amount: null,
    project: "Innovation Studio Portal",
    status: "superseded",
    nodeType: "Decision",
  },
  {
    personName: "Melati",
    personType: "collaborator",
    relType: "MADE_DECISION",
    validFrom: "2026-08-13",
    validTo: null,
    sourceId: "sandbox_melati_2",
    confidence: 0.98,
    text: "Upgraded to FalkorDB Cloud Graph to support multi-agent bi-temporal isolation.",
    amount: null,
    project: "Agent Memory Core",
    status: "current",
    nodeType: "Decision",
  },
  {
    personName: "Melati",
    personType: "collaborator",
    relType: "ASSIGNED_TASK",
    validFrom: "2026-08-20",
    validTo: null,
    sourceId: "sandbox_melati_3",
    confidence: 0.96,
    text: "Deliver bi-temporal Cypher traversal module & atomic supersede tests by Aug 28.",
    amount: null,
    project: "Agent Memory Core",
    status: "current",
    nodeType: "Task",
  },

  // --- Mawar (Lead UI/UX Designer) ---
  {
    personName: "Mawar",
    personType: "collaborator",
    relType: "MADE_PROMISE",
    validFrom: "2026-08-01",
    validTo: "2026-08-14",
    sourceId: "sandbox_mawar_1",
    confidence: 0.95,
    text: "Agreed to RM500 for initial 3 basic dashboard mockups and wireframes.",
    amount: 500,
    project: "Innovation Studio Portal",
    status: "superseded",
    nodeType: "Promise",
  },
  {
    personName: "Mawar",
    personType: "collaborator",
    relType: "MADE_PROMISE",
    validFrom: "2026-08-15",
    validTo: null,
    sourceId: "sandbox_mawar_2",
    confidence: 0.97,
    text: "Expanded design system to 8 multi-agent viewports & time-travel slider for RM850.",
    amount: 850,
    project: "Innovation Studio Portal",
    status: "current",
    nodeType: "Promise",
  },
  {
    personName: "Mawar",
    personType: "collaborator",
    relType: "ASSIGNED_TASK",
    validFrom: "2026-08-22",
    validTo: null,
    sourceId: "sandbox_mawar_3",
    confidence: 0.94,
    text: "Export high-fidelity interactive flow to Figma and review handoff by Aug 29.",
    amount: null,
    project: "Innovation Studio Portal",
    status: "current",
    nodeType: "Task",
  },

  // --- Cempaka (Cloud Infra Contractor) ---
  {
    personName: "Cempaka",
    personType: "contractor",
    relType: "MADE_PROMISE",
    validFrom: "2026-08-03",
    validTo: "2026-08-16",
    sourceId: "sandbox_cempaka_1",
    confidence: 0.96,
    text: "Committed single-node Redis server setup with $600 hosting budget.",
    amount: 600,
    project: "FalkorDB Clusters & SLA",
    status: "superseded",
    nodeType: "Promise",
  },
  {
    personName: "Cempaka",
    personType: "contractor",
    relType: "MADE_PROMISE",
    validFrom: "2026-08-17",
    validTo: null,
    sourceId: "sandbox_cempaka_2",
    confidence: 0.95,
    text: "Migrated to low-latency FalkorDB cluster with automated snapshot failover for $950.",
    amount: 950,
    project: "FalkorDB Clusters & SLA",
    status: "current",
    nodeType: "Promise",
  },
  {
    personName: "Cempaka",
    personType: "contractor",
    relType: "MADE_PROMISE",
    validFrom: "2026-08-25",
    validTo: null,
    sourceId: "sandbox_cempaka_3",
    confidence: 0.92,
    text: "Guaranteed 99.9% uptime SLA and disaster recovery testing before launch for $1200.",
    amount: 1200,
    project: "FalkorDB Clusters & SLA",
    status: "current",
    nodeType: "Promise",
  },
];

export async function GET(req: NextRequest) {
  try {
    const isGuestHeader = req.headers.get("x-guest-mode") === "true";
    const isGuestQuery = req.nextUrl.searchParams.get("guest") === "true";
    const authHeader = req.headers.get("authorization") || "";
    const personaParam = req.nextUrl.searchParams.get("persona") || "aris";

    let user: any = null;
    let isGuest = isGuestHeader || isGuestQuery || !authHeader || authHeader.includes("guest") || authHeader.includes("demo_user_session");

    if (!isGuest) {
      try {
        user = await verifyAuthToken(authHeader);
        if (!user || user.uid === "demo_user" || user.uid === "demo_tuah_student") {
          // If not genuinely signed in with Firebase user token
          isGuest = true;
        }
      } catch {
        isGuest = true;
      }
    }

    const requestedProject = req.nextUrl.searchParams.get("project") || "all";
    const deletedProjectsParam = req.nextUrl.searchParams.get("deletedProjects") || "";
    const deletedProjects = deletedProjectsParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // Parse simulated/invited collaborators from client header early for scoping
    const guestCollaboratorsHeader = req.headers.get("x-guest-collaborators");
    let guestCollaborators: Array<{ name: string; email: string; role: string; projects: string[] }> = [];
    if (guestCollaboratorsHeader) {
      try {
        const parsed = JSON.parse(decodeURIComponent(guestCollaboratorsHeader));
        if (Array.isArray(parsed)) guestCollaborators = parsed;
      } catch {}
    }

    let records: any[] = [];
    let distinctProjects: string[] = [];
    let dbStatus = "connected";

    if (!isGuest && user?.uid) {
      try {
        const graph = await getGraphForUser(user.uid);
        const [result, projectsResult]: any = await Promise.all([
          graph.query(GRAPH_CYPHER),
          graph.query(PROJECTS_CYPHER),
        ]);

        records = (result?.data || []).map((row: any) => ({
          personName: row?.personName ?? "Unknown",
          personType: row?.personType ?? "collaborator",
          relType: row?.relType ?? "MADE_PROMISE",
          validFrom: row?.validFrom ? String(row.validFrom).slice(0, 10) : "",
          validTo: row?.validTo ? String(row.validTo).slice(0, 10) : null,
          sourceId: row?.sourceId ?? "",
          confidence: Number(row?.confidence ?? 0.95),
          text: row?.text ?? "",
          amount: row?.amount ?? null,
          project: row?.project ?? "General",
          status: row?.status ?? "current",
          nodeType: row?.nodeType ?? "Promise",
        }));

        distinctProjects = Array.from(
          new Set([
            ...(projectsResult?.data || []).map((row: any) => cleanProjectName(row?.project)).filter(Boolean),
            ...records.map((r) => cleanProjectName(r.project)).filter(Boolean),
          ])
        );
      } catch (err: any) {
        console.warn("[FalkorDB /api/graph] Read notice:", err?.message);
        dbStatus = "unavailable";
      }
    } else {
      // Guest Sandbox Mode: Always isolated 4-persona ecosystem data
      records = [...SANDBOX_DEMO_RECORDS];
      distinctProjects = [
        "Innovation Studio Portal",
        "Agent Memory Core",
        "FalkorDB Clusters & SLA",
      ];
      dbStatus = "guest_sandbox";

      // Parse custom guest memories and reverted memories from headers
      const guestMemoriesHeader = req.headers.get("x-guest-memories");
      const revertedMemoriesHeader = req.headers.get("x-reverted-memories");

      if (guestMemoriesHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(guestMemoriesHeader));
          if (Array.isArray(parsed) && parsed.length > 0) {
            const guestMap = new Map<string, any>(parsed.map((gm: any) => [gm.sourceId, gm]));
            records = records.map((r) => (guestMap.has(r.sourceId) ? { ...r, ...guestMap.get(r.sourceId) } : r));
            const existingSourceIds = new Set(records.map((r) => r.sourceId));
            const newMemories = parsed.filter((gm: any) => !existingSourceIds.has(gm.sourceId));
            records = [...records, ...newMemories];
            parsed.forEach((gm: any) => {
              if (gm.project && !distinctProjects.includes(gm.project)) {
                distinctProjects.push(gm.project);
              }
            });
          }
        } catch {}
      }

      if (revertedMemoriesHeader) {
        try {
          const revertedList = JSON.parse(decodeURIComponent(revertedMemoriesHeader));
          if (Array.isArray(revertedList) && revertedList.length > 0) {
            records = records.filter((r) => !revertedList.includes(r.sourceId));
          }
        } catch {}
      }

      // 1. Remove deleted projects in guest mode
      if (deletedProjects.length > 0) {
        records = records.filter(
          (r) => !deletedProjects.includes(cleanProjectName(String(r.project)).toLowerCase())
        );
        distinctProjects = distinctProjects.filter(
          (p) => !deletedProjects.includes(cleanProjectName(p).toLowerCase())
        );
      }

      // 2. Persona-aware project filtering:
      let allowedProjectsForPersona: string[] | null = null;
      if (personaParam === "sofia") {
        const sofiaCollab = guestCollaborators.find((c) => c.name?.toLowerCase().includes("sofia"));
        if (sofiaCollab && Array.isArray(sofiaCollab.projects) && sofiaCollab.projects.length > 0) {
          allowedProjectsForPersona = sofiaCollab.projects.map((p) => cleanProjectName(p).toLowerCase());
        }
      }
      if (!allowedProjectsForPersona && personaParam && PERSONA_PROJECT_MAP[personaParam]) {
        allowedProjectsForPersona = PERSONA_PROJECT_MAP[personaParam].map((p) => cleanProjectName(p).toLowerCase());
      }

      if (allowedProjectsForPersona) {
        distinctProjects = distinctProjects.filter((p) => allowedProjectsForPersona!.includes(cleanProjectName(p).toLowerCase()));
        if (!requestedProject || isAllProject(requestedProject)) {
          records = records.filter((r) => allowedProjectsForPersona!.includes(cleanProjectName(String(r.project)).toLowerCase()));
        }
      }
    }

    // Filter out deleted projects for logged-in user too if passed
    if (deletedProjects.length > 0) {
      records = records.filter(
        (r) => !deletedProjects.includes(cleanProjectName(String(r.project)).toLowerCase())
      );
      distinctProjects = distinctProjects.filter(
        (p) => !deletedProjects.includes(cleanProjectName(p).toLowerCase())
      );
    }

    let filtered = records;
    if (requestedProject && !isAllProject(requestedProject)) {
      const targetNorm = cleanProjectName(requestedProject).toLowerCase();
      filtered = records.filter(
        (r) => r.project && cleanProjectName(r.project).toLowerCase() === targetNorm
      );
    }

    // Workspace name: if guest, reflect selected persona! If logged-in user, use user's display name
    const activePersonaName = PERSONA_NAMES[personaParam] || "Prof. Aris";
    const clientProvidedName = req.headers.get("x-user-display-name")
      ? decodeURIComponent(req.headers.get("x-user-display-name")!)
      : req.nextUrl.searchParams.get("userName") || "";

    const userName = isGuest
      ? activePersonaName
      : clientProvidedName || user?.displayName || (user?.email ? user.email.split("@")[0] : "User");

    // Build the hierarchical graph
    const nodes: any[] = [];
    const edges: any[] = [];

    // Parse user-created projects from header
    const userProjectsHeader = req.headers.get("x-user-projects");
    if (userProjectsHeader) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userProjectsHeader));
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const clean = cleanProjectName(typeof p === "string" ? p : p.id || p.name);
            if (clean && !isAllProject(clean) && !distinctProjects.includes(clean)) {
              distinctProjects.push(clean);
            }
          });
        }
      } catch {}
    }

    // Group records by Project and Person (including empty projects!)
    const projectsMap = new Map<string, any[]>();
    for (const proj of distinctProjects) {
      if (requestedProject && !isAllProject(requestedProject)) {
        if (cleanProjectName(proj).toLowerCase() !== cleanProjectName(requestedProject).toLowerCase()) continue;
      }
      projectsMap.set(proj, []);
    }

    for (const rec of filtered) {
      const pName = rec.project || "General";
      if (!projectsMap.has(pName)) projectsMap.set(pName, []);
      projectsMap.get(pName)!.push(rec);
    }

    const projectNames = Array.from(projectsMap.keys());
    const projectPeopleMap = new Map<string, Map<string, any[]>>();

    // Group each project's records by Person
    projectNames.forEach((projName) => {
      const projRecords = projectsMap.get(projName)!;
      const peopleInProj = new Map<string, any[]>();

      // 1. People with recorded memories
      for (const rec of projRecords) {
        const pPerson = rec.personName || "Collaborator";
        if (!peopleInProj.has(pPerson)) peopleInProj.set(pPerson, []);
        peopleInProj.get(pPerson)!.push(rec);
      }

      // 2. Default project owner or current user if empty
      const rawMeta = isGuest ? PROJECT_METADATA[projName] : null;
      if (rawMeta?.owner && !peopleInProj.has(rawMeta.owner)) {
        peopleInProj.set(rawMeta.owner, []);
      }
      if (!isGuest && userName && !peopleInProj.has(userName)) {
        peopleInProj.set(userName, []);
      }

      // 3. Simulated/invited collaborators assigned to this project
      guestCollaborators.forEach((collab) => {
        const collabProjs = Array.isArray(collab.projects)
          ? collab.projects.map((p) => cleanProjectName(p).toLowerCase())
          : [];
        const isAssigned =
          collabProjs.length === 0 ||
          collabProjs.includes("all") ||
          collabProjs.includes(cleanProjectName(projName).toLowerCase());

        if (isAssigned && !peopleInProj.has(collab.name)) {
          peopleInProj.set(collab.name, []);
        }
      });

      projectPeopleMap.set(projName, peopleInProj);
    });

    // Dynamic width calculation to ensure NO nodes or sub-trees ever overlap
    const PERSON_COL_WIDTH = 280;
    const PROJECT_GUTTER = 120;

    const projectWidths = projectNames.map((projName) => {
      const peopleCount = Math.max(1, projectPeopleMap.get(projName)!.size);
      return peopleCount * PERSON_COL_WIDTH;
    });

    const totalLayoutWidth =
      projectWidths.reduce((a, b) => a + b, 0) +
      Math.max(0, projectNames.length - 1) * PROJECT_GUTTER;

    // Center the entire layout around x = 400
    const globalStartX = 400 - totalLayoutWidth / 2;

    // Level 1: Root Workspace Hub Node placed right at horizontal center
    const rootId = "root_workspace";
    nodes.push({
      id: rootId,
      type: "project",
      position: { x: 280, y: 30 },
      data: {
        title: `${userName}'s Workspace`,
        description: isGuest
          ? `Guest Sandbox Session • ${activePersonaName} Persona Ecosystem`
          : `Primary Hub • FalkorDB Container: matters_${user.uid.substring(0, 8)}`,
      },
    });

    if (projectNames.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          nodes,
          edges,
          rawRecords: [],
          dbStatus,
          isEmpty: true,
          distinctProjects,
          stats: { persons: 0, memories: 0, projects: distinctProjects.length },
        },
      });
    }


    let currentProjectLeftX = globalStartX;

    projectNames.forEach((projName, pIdx) => {
      const projRecords = projectsMap.get(projName)!;
      const peopleInProj = projectPeopleMap.get(projName)!;
      const peopleNames = Array.from(peopleInProj.keys());
      const numPeople = Math.max(1, peopleNames.length);
      const projWidth = numPeople * PERSON_COL_WIDTH;

      const projCenterX = currentProjectLeftX + projWidth / 2;
      const projNodeId = `proj_${slug(projName)}`;
      const projY = 170;

      // Project metadata: in guest sandbox, use the 4-persona ecosystem metadata.
      // For authenticated logged-in users, the owner is the workspace user themselves!
      const rawMeta = isGuest ? PROJECT_METADATA[projName] : null;
      const meta = rawMeta || {
        owner: userName || "Workspace Host",
        ownerRole: "Lead",
        contributors: peopleNames.filter(
          (n) => n.toLowerCase() !== (userName || "").toLowerCase()
        ),
      };

      const contributorsDisplay =
        meta.contributors.length > 0 ? meta.contributors.join(", ") : "Collaborator";

      // Add Project Node with Owner and Contributors
      nodes.push({
        id: projNodeId,
        type: "person",
        position: { x: projCenterX - 110, y: projY },
        data: {
          name: formatProjectDisplay(projName),
          role: `Owner: ${meta.owner} (${meta.ownerRole})`,
          roleId: "project_node",
          subtitle: `${projRecords.length} Commitments • Contributors: ${contributorsDisplay}`,
          isActivePersona: true,
        },
      });

      // Edge from Workspace Root -> Project Node
      edges.push({
        id: `edge_${rootId}_${projNodeId}`,
        source: rootId,
        target: projNodeId,
        animated: true,
        style: { stroke: "#2563EB", strokeWidth: 1.5 },
      });

      // Place each person column under this project
      peopleNames.forEach((personName, personIdx) => {
        const pRecords = peopleInProj.get(personName)!;
        const personNodeId = `person_${slug(projName)}_${slug(personName)}`;
        const personX = currentProjectLeftX + personIdx * PERSON_COL_WIDTH + PERSON_COL_WIDTH / 2;
        const personY = 310;

        const isCurrentActivePersona =
          isGuest &&
          personName.toLowerCase().includes(activePersonaName.toLowerCase().replace("prof. ", ""));

        const collabInfo = guestCollaborators.find(
          (c) => c.name.toLowerCase() === personName.toLowerCase()
        );

        const isOwner =
          personName.toLowerCase() === meta.owner.toLowerCase() ||
          (!isGuest && personName.toLowerCase() === (userName || "").toLowerCase());
        const roleDescription = collabInfo
          ? collabInfo.role
          : isOwner
          ? `Owner • ${meta.ownerRole || "Lead"}`
          : `Contributor`;

        const otherContributors = meta.contributors.filter(
          (c) => c.toLowerCase() !== personName.toLowerCase()
        );
        const personSubtitle =
          pRecords.length === 0
            ? "Awaiting first commitment"
            : isOwner
            ? meta.contributors.length > 0
              ? `Contributors: ${meta.contributors.join(", ")}`
              : "Project Lead"
            : otherContributors.length > 0
            ? `Owner: ${meta.owner} • Co-team: ${otherContributors.join(", ")}`
            : `Owner: ${meta.owner}`;

        nodes.push({
          id: personNodeId,
          type: "person",
          position: { x: personX - 100, y: personY },
          data: {
            name: personName,
            role: roleDescription,
            subtitle: personSubtitle,
            roleId: pRecords[0]?.personType || (collabInfo ? "collaborator" : "collaborator"),
            isActivePersona: isCurrentActivePersona,
          },
        });


        // Edge from Project Node -> Person Node
        edges.push({
          id: `edge_${projNodeId}_${personNodeId}`,
          source: projNodeId,
          target: personNodeId,
          style: { stroke: isOwner ? "#2563EB" : "#94A3B8", strokeWidth: 1.2 },
        });

        // Level 4: Memories attached to Person
        pRecords.forEach((mem, memIdx) => {
          const memNodeId = `mem_${slug(projName)}_${slug(personName)}_${memIdx}`;
          const memY = 440 + memIdx * 140;

          nodes.push({
            id: memNodeId,
            type: "memory",
            position: { x: personX - 110, y: memY },
            data: {
              category: mem.nodeType || "Promise",
              text: mem.text,
              amount: mem.amount,
              project: mem.project,
              validRange: mem.validTo
                ? `${mem.validFrom} → ${mem.validTo}`
                : `From ${mem.validFrom}`,
              details: {
                ...mem,
                valid_from: mem.validFrom,
                valid_to: mem.validTo,
              },
            },
          });

          // Edge from Person -> Memory
          edges.push({
            id: `edge_${personNodeId}_${memNodeId}`,
            source: personNodeId,
            target: memNodeId,
            style: { stroke: "#CBD5E1", strokeWidth: 1 },
          });
        });
      });

      currentProjectLeftX += projWidth + PROJECT_GUTTER;
    });

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        edges,
        rawRecords: filtered,
        dbStatus,
        isEmpty: false,
        distinctProjects,
        stats: {
          persons: new Set(filtered.map((r) => r.personName)).size,
          memories: filtered.length,
          projects: distinctProjects.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[/api/graph] Server error:", error);
    return NextResponse.json(
      { error: "Failed to build graph", message: error?.message },
      { status: 500 }
    );
  }
}

function slug(val: string): string {
  return String(val || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
