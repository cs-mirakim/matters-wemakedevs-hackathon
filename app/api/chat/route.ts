import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyAuthToken } from "@/lib/firebase-admin";
import { getGraphForUser } from "@/lib/falkordb";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const GRAPH_CONTEXT_CYPHER = `
  MATCH (p:Person)-[r]->(m)
  RETURN p.name AS personName, p.type AS personType, type(r) AS relType,
         toString(r.valid_from) AS validFrom, toString(r.valid_to) AS validTo,
         m.text AS text, m.amount AS amount, m.project AS project, m.status AS status,
         labels(m)[0] AS nodeType
  ORDER BY r.valid_from DESC
  LIMIT 100
`;

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

    // Rate limiting to protect Gemini API key quota
    const rateLimitId = !isGuest && user?.uid
      ? user.uid
      : (req.headers.get("x-forwarded-for") || "chat_guest_session");
    const rateStatus = checkRateLimit(rateLimitId);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        { error: "Too many chat queries. Please wait a moment before sending another message." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, activeProject, persona, deletedProjects = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const deletedList = Array.isArray(deletedProjects)
      ? deletedProjects.map((s: string) => String(s).toLowerCase().trim())
      : [];

    // 1. Fetch memory records from FalkorDB or Sandbox
    let memories: any[] = [];
    const workspaceOwnerHeader = req.headers.get("x-workspace-owner");
    const targetUid =
      workspaceOwnerHeader && workspaceOwnerHeader !== "guest" && workspaceOwnerHeader !== "null"
        ? workspaceOwnerHeader
        : user?.uid;

    if (!isGuest && targetUid) {
      try {
        const graph = await getGraphForUser(targetUid);
        const res: any = await graph.query(GRAPH_CONTEXT_CYPHER);
        memories = res?.data || [];
      } catch (err) {
        console.warn("[/api/chat] FalkorDB read notice:", err);
      }
    } else {
      // Sandbox mode demo records
      memories = [
        { personName: "Prof. Aris", personType: "supervisor", nodeType: "Decision", text: "Approved standard RAG vector baseline for evaluation across teams", validFrom: "2026-08-01", validTo: "2026-08-10", project: "Innovation Studio Portal", status: "superseded" },
        { personName: "Prof. Aris", personType: "supervisor", nodeType: "Decision", text: "Mandated bi-temporal graph memory benchmarks against classic vector search", validFrom: "2026-08-11", validTo: null, project: "Innovation Studio Portal", status: "current" },
        { personName: "Prof. Aris", personType: "supervisor", nodeType: "Task", text: "Review sprint deliverables & FalkorDB query telemetry before public launch", validFrom: "2026-08-24", validTo: null, project: "Agent Memory Core", status: "current" },
        { personName: "Melati", personType: "collaborator", nodeType: "Decision", text: "Agreed to use local SQLite cache for initial graph persistence prototype", validFrom: "2026-08-01", validTo: "2026-08-12", project: "Innovation Studio Portal", status: "superseded" },
        { personName: "Melati", personType: "collaborator", nodeType: "Decision", text: "Upgraded to FalkorDB Cloud Graph to support multi-agent bi-temporal isolation", validFrom: "2026-08-13", validTo: null, project: "Agent Memory Core", status: "current" },
        { personName: "Melati", personType: "collaborator", nodeType: "Task", text: "Deliver bi-temporal Cypher traversal module & atomic supersede tests by Aug 28", validFrom: "2026-08-20", validTo: null, project: "Agent Memory Core", status: "current" },
        { personName: "Mawar", personType: "collaborator", nodeType: "Promise", text: "Agreed to RM500 for initial 3 basic dashboard mockups and wireframes", amount: 500, validFrom: "2026-08-01", validTo: "2026-08-14", project: "Innovation Studio Portal", status: "superseded" },
        { personName: "Mawar", personType: "collaborator", nodeType: "Promise", text: "Expanded design system to 8 multi-agent viewports & time slider for RM850", amount: 850, validFrom: "2026-08-15", validTo: null, project: "Innovation Studio Portal", status: "current" },
        { personName: "Mawar", personType: "collaborator", nodeType: "Task", text: "Export high-fidelity interactive flow to Figma and review handoff by Aug 29", validFrom: "2026-08-22", validTo: null, project: "Innovation Studio Portal", status: "current" },
        { personName: "Cempaka", personType: "contractor", nodeType: "Promise", text: "Committed single-node Redis server setup with $600 hosting budget", amount: 600, validFrom: "2026-08-03", validTo: "2026-08-16", project: "FalkorDB Clusters & SLA", status: "superseded" },
        { personName: "Cempaka", personType: "contractor", nodeType: "Promise", text: "Migrated to low-latency FalkorDB cluster with automated snapshot failover for $950", amount: 950, validFrom: "2026-08-17", validTo: null, project: "FalkorDB Clusters & SLA", status: "current" },
        { personName: "Cempaka", personType: "contractor", nodeType: "Promise", text: "Guaranteed 99.9% uptime SLA and disaster recovery testing before launch for $1200", amount: 1200, validFrom: "2026-08-25", validTo: null, project: "FalkorDB Clusters & SLA", status: "current" },
      ];
    }

    // Filter out deleted projects
    if (deletedList.length > 0) {
      memories = memories.filter(
        (m) => !deletedList.includes(String(m.project || "").toLowerCase())
      );
    }

    // 2. Format memory context lines
    const contextLines = memories.map((m: any) => {
      const amountStr = m.amount ? ` [Amount: RM${m.amount}]` : "";
      const validityStr = m.validTo
        ? `(Valid: ${m.validFrom} to ${m.validTo} • SUPERSEDED)`
        : `(Active Valid from ${m.validFrom})`;
      return `• Project: "${m.project || "General"}" | Person: ${m.personName} (${m.personType}) ──[${m.nodeType}]──> "${m.text}"${amountStr} ${validityStr}`;
    });

    const memoryContextText =
      contextLines.length > 0
        ? contextLines.join("\n")
        : "(No active memory records in graph yet.)";

    // 3. Project Ownership Directory
    const ownershipSummary = `
Project Structure & Ownership Directory:
1. "Innovation Studio Portal":
   - Owner: Prof. Aris (Supervisor / Director)
   - Contributors: Melati, Mawar
2. "Agent Memory Core":
   - Owner: Melati (Lead AI Engineer)
   - Contributors: Prof. Aris
3. "FalkorDB Clusters & SLA":
   - Owner: Prof. Aris (Client / Sponsor)
   - Contributors: Cempaka (Infra SLA Contractor)
`;

    // 4. Invoke Gemini 3.5 Flash Lite or Fallback
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      const heuristic = generateHeuristicAnswer(message, memories, activeProject);
      return NextResponse.json({
        success: true,
        answer: heuristic.answer,
        followUpQuestions: heuristic.followUpQuestions,
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const targetModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
      const systemInstruction = `You are the Matters AI Workspace Coordinator & Memory Assistant.
You have live, direct read access to this workspace's FalkorDB bi-temporal memory graph.
Answer all questions accurately and professionally in ENGLISH.

Guidelines:
- Explain project owners, contributors, commitments, and status clearly.
- Note whether a commitment is Active (current) or Superseded (historical record closed with valid_to).
- If the user asks about budget, summarize individual agreed amounts and total active budget.
- If the user asks random questions about the workspace, explain the architecture, projects, and active team deliverables.
- Keep answers structured with concise bullet points and bold highlights.
- AT THE VERY END OF YOUR RESPONSE, ALWAYS provide 2 to 3 concise, relevant follow-up questions tailored to this workspace on their own separate lines starting with "FOLLOW_UP: ".
Example:
FOLLOW_UP: What was the initial budget before the change?
FOLLOW_UP: Who is assigned to the current deliverables?
FOLLOW_UP: Which decisions were superseded?

${ownershipSummary}

Live FalkorDB Graph Memory Context:
${memoryContextText}`;

      const prompt = `User Question: "${message}"\nActive Project Filter: "${activeProject || "All"}"`;
      let rawAnswer = "";

      try {
        const model = genAI.getGenerativeModel({
          model: targetModel,
          systemInstruction,
        });
        const result = await model.generateContent(prompt);
        rawAnswer = result.response.text();
      } catch (primaryModelErr: any) {
        console.warn(`[/api/chat] Model ${targetModel} notice, falling back to gemini-3.5-flash-lite:`, primaryModelErr?.message);
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-3.5-flash-lite",
          systemInstruction,
        });
        const fallbackResult = await fallbackModel.generateContent(prompt);
        rawAnswer = fallbackResult.response.text();
      }

      const defaultFollowUps = [
        "What is the total agreed budget across projects?",
        "Which commitments or decisions are superseded?",
        "Who is responsible for current deliverables?",
      ];

      const parsed = parseGeminiResponse(rawAnswer, defaultFollowUps);

      return NextResponse.json({
        success: true,
        answer: parsed.answer,
        followUpQuestions: parsed.followUpQuestions,
      });
    } catch (modelError: any) {
      console.warn("[/api/chat] Gemini error, using fallback:", modelError?.message);
      const heuristic = generateHeuristicAnswer(message, memories, activeProject);
      return NextResponse.json({
        success: true,
        answer: heuristic.answer,
        followUpQuestions: heuristic.followUpQuestions,
      });
    }
  } catch (error: any) {
    console.error("[/api/chat] Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI chat", message: error?.message },
      { status: 500 }
    );
  }
}

function parseGeminiResponse(rawText: string, defaultFollowUps: string[]): { answer: string; followUpQuestions: string[] } {
  const lines = rawText.split("\n");
  const followUpQuestions: string[] = [];
  const answerLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("FOLLOW_UP:")) {
      const q = trimmed.replace(/^FOLLOW_UP:\s*/i, "").replace(/^["'*]+|["'*]+$/g, "").trim();
      if (q) followUpQuestions.push(q);
    } else {
      answerLines.push(line);
    }
  }

  let cleanedAnswer = answerLines.join("\n").trim();
  cleanedAnswer = cleanedAnswer.replace(/💡\s*\*\*Suggested Questions You Can Ask\*\*[\s\S]*$/i, "").trim();

  return {
    answer: cleanedAnswer || rawText,
    followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions.slice(0, 3) : defaultFollowUps.slice(0, 3),
  };
}

function generateHeuristicAnswer(
  question: string,
  memories: any[],
  activeProject?: string
): { answer: string; followUpQuestions: string[] } {
  const q = question.toLowerCase().trim();

  // 1. Project directory & ownership
  if (
    q.includes("project") ||
    q.includes("owner") ||
    q.includes("contributor") ||
    q.includes("workspace") ||
    q.includes("what is this") ||
    q.includes("list") ||
    q.includes("projek")
  ) {
    return {
      answer: `In this workspace, projects are organized with distinct ownership and team roles in the FalkorDB graph:

📁 **1. Innovation Studio Portal**
• **Owner**: Prof. Aris (Supervisor / Director)
• **Contributors**: Melati, Mawar
• **Focus**: Multi-agent UI viewports, bi-temporal benchmarks, and design system deliverables.

📁 **2. Agent Memory Core**
• **Owner**: Melati (Lead AI Engineer)
• **Contributors**: Prof. Aris
• **Focus**: Multi-agent graph memory schemas, atomic Cypher supersede engine, and SLA testing.

📁 **3. FalkorDB Clusters & SLA**
• **Owner**: Prof. Aris (Client / Sponsor)
• **Contributors**: Cempaka
• **Focus**: Low-latency cloud cluster migration, automated snapshots, and 99.9% uptime SLA ($1,200).

💡 *You can select any project from the top-right dropdown to filter the graph visualizer.*`,
      followUpQuestions: [
        "What is the total agreed budget across projects?",
        "Which commitments or decisions were superseded?",
        "What tasks are assigned to Melati?",
      ],
    };
  }

  // 2. Budget / Cost questions
  if (
    q.includes("budget") ||
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("rm") ||
    q.includes("amount") ||
    q.includes("bajet")
  ) {
    const withAmount = memories.filter((m) => m.amount);
    let totalActive = 0;
    const items = withAmount.map((m) => {
      const isAct = !m.validTo;
      if (isAct) totalActive += Number(m.amount);
      return `• **${m.personName}** [${m.project}]: RM / $${m.amount} (${isAct ? "✅ Active" : "⏱️ Superseded"}) — "${m.text}"`;
    });

    return {
      answer: `Here is the current financial and commitment breakdown from the FalkorDB graph:

${items.join("\n")}

💰 **Total Current Active Financial Commitments**: **$${totalActive}** (or RM${totalActive})`,
      followUpQuestions: [
        "What was the initial budget before the change?",
        "Who committed the highest budget amount?",
        "Which budget promises were superseded?",
      ],
    };
  }

  // 3. Superseded / Scope changes / History
  if (
    q.includes("supersede") ||
    q.includes("history") ||
    q.includes("change") ||
    q.includes("conflict") ||
    q.includes("amnesia") ||
    q.includes("tukar")
  ) {
    const superseded = memories.filter((m) => m.validTo || m.status === "superseded");
    if (superseded.length > 0) {
      const lines = superseded.map(
        (m) =>
          `• **${m.personName}** [${m.project}]: "${m.text}" (Valid from ${m.validFrom} until superseded on ${m.validTo})`
      );
      return {
        answer: `Matters uses a **Zero Amnesia** bi-temporal architecture. When a commitment or scope changes, previous agreements are never erased—they are atomically closed with a \`valid_to\` timestamp.

Here are the **superseded** commitments in this workspace:
${lines.join("\n")}

💡 *Use the Bi-Temporal Time Travel scrubber on the right to view what the workspace looked like before these changes!*`,
        followUpQuestions: [
          "What is the current active state of these commitments?",
          "What was Mawar's initial design budget?",
          "Why was the Redis server superseded?",
        ],
      };
    }
    return {
      answer: "No commitments have been superseded in this workspace yet. All current agreements remain in their initial active state.",
      followUpQuestions: [
        "What are the active tasks in this workspace?",
        "Who owns Innovation Studio Portal?",
        "What is the total project budget?",
      ],
    };
  }

  // 4. Person specific queries
  if (q.includes("aris") || q.includes("prof")) {
    return {
      answer: `👨‍🏫 **Prof. Aris (Supervisor / Workspace Director)**:
• **Ownership**: Owner of *Innovation Studio Portal* & *FalkorDB Clusters & SLA*.
• **Active Decision**: Mandated bi-temporal graph memory benchmarks against classic vector search (active since Aug 11, 2026).
• **Active Task**: Review sprint deliverables & FalkorDB query telemetry before public launch.
• **Superseded Decision**: Initially approved standard RAG baseline before upgrading to graph memory.`,
      followUpQuestions: [
        "What tasks are assigned to Prof. Aris?",
        "What projects does Prof. Aris own?",
        "What was Prof. Aris's superseded decision?",
      ],
    };
  }

  if (q.includes("melati")) {
    return {
      answer: `👩‍💻 **Melati (Lead AI Engineer)**:
• **Ownership**: Owner of *Agent Memory Core*. Contributor to *Innovation Studio Portal*.
• **Active Decision**: Upgraded to FalkorDB Cloud Graph to support multi-agent bi-temporal isolation.
• **Active Task**: Deliver bi-temporal Cypher traversal module & atomic supersede tests by Aug 28, 2026.
• **Superseded Decision**: Initially agreed to local SQLite cache before scaling to cloud graph.`,
      followUpQuestions: [
        "What is Melati's delivery deadline?",
        "What is Melati's role in Agent Memory Core?",
        "What was Melati's initial database choice?",
      ],
    };
  }

  if (q.includes("mawar") || q.includes("war") || q.includes("design")) {
    return {
      answer: `🎨 **Mawar (Lead UI/UX Designer)**:
• **Role**: Contributor to *Innovation Studio Portal* (Project Owner: Prof. Aris).
• **Active Promise**: Expanded design system to 8 multi-agent viewports & time slider for RM850 (active since Aug 15, 2026).
• **Active Task**: Export high-fidelity interactive flow to Figma and review handoff by Aug 29, 2026.
• **Superseded Promise**: Initial 3 basic dashboard mockups for RM500.`,
      followUpQuestions: [
        "Why was Mawar's budget increased to RM850?",
        "What is Mawar's Figma delivery deadline?",
        "Who owns Innovation Studio Portal?",
      ],
    };
  }

  if (q.includes("cempaka") || q.includes("sla") || q.includes("infra") || q.includes("cluster")) {
    return {
      answer: `⚡ **Cempaka (Cloud Infrastructure Contractor)**:
• **Role**: Contributor to *FalkorDB Clusters & SLA* (Project Owner: Prof. Aris).
• **Active Commitments**:
  1. Low-latency FalkorDB cluster migration with automated snapshots ($950).
  2. 99.9% uptime SLA and disaster recovery testing before launch ($1,200).
• **Superseded**: Initial single-node Redis server setup ($600).`,
      followUpQuestions: [
        "What are Cempaka's 3 SLA commitments?",
        "What is the total infrastructure budget?",
        "When was the Redis server superseded?",
      ],
    };
  }

  // 5. Default General Intelligence Summary
  const activeCount = memories.filter((m) => !m.validTo).length;
  const supersededCount = memories.filter((m) => !!m.validTo).length;
  const projects = Array.from(new Set(memories.map((m) => m.project).filter(Boolean)));

  return {
    answer: `I have analyzed the current FalkorDB graph state for this workspace:

📊 **Workspace Context Summary**:
• **Active Commitments**: ${activeCount} active valid agreements & tasks
• **Superseded Records**: ${supersededCount} historical revisions preserved for audit
• **Connected Projects**: ${projects.join(", ") || "General"}`,
    followUpQuestions: [
      "What is the total agreed budget across projects?",
      "Which commitments or decisions were superseded?",
      "Who is the owner and contributor for each project?",
    ],
  };
}
