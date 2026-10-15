import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const ExtractionSchema = z.object({
  personName: z.string().min(1).max(100),
  personType: z
    .enum(["supervisor", "client", "contractor", "collaborator", "other"])
    .default("other"),
  memoryType: z.enum(["Promise", "Decision", "Preference", "Task"]).default("Promise"),
  text: z.string().min(1).max(1000),
  amount: z.number().nullable().optional(),
  project: z.string().min(1).max(100).default("General"),
  validFrom: z.string(),
  confidence: z.number().min(0).max(1).default(0.95),
});

export type ExtractedMemory = z.infer<typeof ExtractionSchema>;

export interface SmartExtractionResponse {
  needsClarification: boolean;
  issues: string[];
  clarificationQuestions: string[];
  extracted: ExtractedMemory;
}

/**
 * Fallback parser pintar jika API key tiada atau Gemini tidak dapat dicapai.
 * Mengesan nama samaran ("War" -> Mawar), kata ganti nama ("dia", "client"),
 * ketiadaan projek, dan tarikh relatif ("lusa", "minggu depan").
 */
export interface ExtractionContext {
  existingProjects?: string[];
  existingPersons?: string[];
  recentMemories?: string[];
}

/**
 * Fallback parser pintar jika API key tiada atau Gemini tidak dapat dicapai.
 * Mengesan nama samaran ("Gee" -> Fauziah, "War" -> Mawar), kata ganti nama ("dia", "client"),
 * ketiadaan projek, percanggahan, dan tarikh relatif.
 */
function heuristicSmartFallback(
  rawText: string,
  activeProject = "General",
  context?: ExtractionContext
): SmartExtractionResponse {
  const lower = rawText.toLowerCase();
  const issues: string[] = [];
  const questions: string[] = [];

  let personName = "Collaborator";
  let personType: ExtractedMemory["personType"] = "collaborator";
  let memoryType: ExtractedMemory["memoryType"] = "Promise";
  let project = activeProject !== "all" && activeProject !== "General" ? activeProject : "General";
  let confidence = 0.9;

  // 1. Name & Alias / Pronoun Detection (Specifically supporting Malay supervisor names & nicknames)
  if (/\b(gee|madam gee|kak gee|puan gee)\b/i.test(lower)) {
    personName = "Madam Gee";
    personType = "supervisor";
    memoryType = "Task";
    if (context?.existingPersons?.some((p) => /fauziah/i.test(p))) {
      issues.push("alias_detected");
      questions.push("Adakah 'Madam Gee' merujuk kepada individu yang sama dengan 'Madam Fauziah' (Supervisor)?");
      confidence = 0.7;
    }
  } else if (/\b(fauziah|madam fauziah|dr fauziah|prof fauziah)\b/i.test(lower)) {
    personName = "Madam Fauziah";
    personType = "supervisor";
    memoryType = "Task";
    const hasMadamGee = context?.existingPersons?.some((p) => /gee/i.test(p)) || true;
    if (hasMadamGee) {
      issues.push("alias_detected");
      questions.push("Adakah 'Madam Fauziah' merujuk kepada individu yang sama dengan 'Madam Gee' (Supervisor FYP)?");
      confidence = 0.7;
    }
  } else if (/\b(war|kak war|mak war)\b/i.test(lower)) {
    personName = "Mawar";
    personType = "collaborator";
    issues.push("alias_detected");
    questions.push("Does 'War' refer to Mawar (UI Designer)?");
    confidence = 0.7;
  } else if (/\b(aris|prof|prof aris|director)\b/i.test(lower)) {
    personName = "Prof. Aris";
    personType = "supervisor";
    memoryType = "Decision";
  } else if (/\b(melati|lead dev|tech lead)\b/i.test(lower)) {
    personName = "Melati";
    personType = "collaborator";
    memoryType = /(approve|lulus)/.test(lower) ? "Decision" : "Task";
  } else if (/\b(cempaka|infra|devops)\b/i.test(lower)) {
    personName = "Cempaka";
    personType = "contractor";
    memoryType = "Promise";
  } else if (/\b(tuah|hang tuah)\b/i.test(lower)) {
    personName = "Hang Tuah";
    personType = "supervisor";
  } else if (/\b(jebat|hang jebat)\b/i.test(lower)) {
    personName = "Hang Jebat";
    personType = "client";
  } else if (/\b(kasturi|pak mat|kontraktor)\b/i.test(lower)) {
    personName = "Kasturi";
    personType = "contractor";
  } else if (/\b(dia|klien|client|bos|boss|member|they|them|he|she)\b/i.test(lower)) {
    personName = "Collaborator";
    issues.push("ambiguous_person");
    questions.push("Siapakah individu atau supervisor sebenar yang dimaksudkan dalam kenyataan ini?");
    confidence = 0.5;
  }

  // 2. Project Detection (Auto-detecting FYP, Ethics, Portal, etc.)
  if (lower.includes("fyp") || lower.includes("ethics") || lower.includes("consent") || lower.includes("borang") || lower.includes("thesis")) {
    project = "FYP";
  } else if (lower.includes("landing") || lower.includes("web") || lower.includes("blog")) {
    project = "Landing Page";
  } else if (lower.includes("studio") || lower.includes("portal")) {
    project = "Innovation Studio Portal";
  } else if (lower.includes("agent") || lower.includes("memory") || lower.includes("core")) {
    project = "Agent Memory Core";
  } else if (lower.includes("falkor") || lower.includes("cluster") || lower.includes("sla")) {
    project = "FalkorDB Clusters & SLA";
  } else if (lower.includes("reno") || lower.includes("house") || lower.includes("tiles")) {
    project = "House Renovation";
  } else if (context?.existingProjects && context.existingProjects.length > 0) {
    const matched = context.existingProjects.find((p) => p !== "all" && p !== "General" && lower.includes(p.toLowerCase()));
    if (matched) {
      project = matched;
    }
  }

  if (project === "General" && context?.existingProjects && context.existingProjects.filter((p) => p !== "all" && p !== "General").length === 1) {
    project = context.existingProjects.filter((p) => p !== "all" && p !== "General")[0];
  }

  // 3. Contradiction & Superseding Check
  if (/\b(cancel|batal|tukar|ganti|supersede|replace|revisi|naikkan|turunkan|ubah|tak perlu|3 je)\b/i.test(lower)) {
    issues.push("superseding_instruction");
    questions.push("Kenyataan ini mengandungi arahan pertukaran / pembatalan komitmen. Adakah ini membatalkan atau menggantikan (supersede) komitmen terdahulu?");
    confidence = 0.8;
  }

  // 4. Relative Date Detection
  let validFrom = new Date().toISOString().split("T")[0];
  const dateMatch = rawText.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    validFrom = dateMatch[0];
  } else if (/\b(lusa|minggu depan|esok|nanti|hujung bulan|tomorrow|next week|later)\b/i.test(lower)) {
    issues.push("vague_timeline");
    questions.push("Kenyataan menggunakan masa relatif. Sila sahkan tarikh kuat kuasa sebenar.");
    confidence = Math.min(confidence, 0.7);
  }

  // 5. Money / Budget Detection
  const currMatch = rawText.match(/(?:rm|\$|usd|myr)\s*([\d,]+(?:\.\d+)?)/i);
  const amount = currMatch ? parseFloat(currMatch[1].replace(/,/g, "")) : null;

  const extracted: ExtractedMemory = {
    personName,
    personType,
    memoryType,
    text: rawText.trim(),
    amount,
    project,
    validFrom,
    confidence,
  };

  return {
    needsClarification: issues.length > 0 && confidence < 0.85,
    issues,
    clarificationQuestions: questions,
    extracted,
  };
}

const SMART_EXTRACTION_SYSTEM = `You are the smart, highly proactive memory-graph entity extraction agent for "Matters".
Analyze user statements in Malay or English and return ONE JSON object:
{
  "needsClarification": boolean, // true if there is an alias/nickname, pronoun ambiguity, project confusion, or an instruction superseding/contradicting a prior commitment
  "issues": string[], // list of detected issues like "alias_detected", "ambiguous_person", "superseding_instruction", "project_inferred"
  "clarificationQuestions": string[], // 1-2 friendly, curious confirmation questions asking the user to confirm specific assumptions or disambiguate
  "extracted": {
    "personName": string, // inferred actual name (e.g. 'Melati', 'Prof. Aris', 'Mawar', 'Cempaka', 'Amir', 'Madam Fauziah', etc.)
    "personType": "supervisor" | "client" | "contractor" | "collaborator" | "other",
    "memoryType": "Promise" | "Decision" | "Preference" | "Task",
    "text": string, // concise summary in the user's language or English
    "amount": number | null,
    "project": string, // map to existing workspace project (e.g. 'Agent Memory Core', 'Innovation Studio Portal', 'FalkorDB Clusters & SLA', 'FYP') instead of 'General'
    "validFrom": string, // ISO YYYY-MM-DD
    "confidence": number // 0.0 to 1.0
  }
}

CRITICAL RULES FOR PROACTIVE CURIOSITY & ENTITY REASONING:
1. ENTITY & PERSON EXTRACTION:
   - If a person is explicitly named (e.g., "Melati", "Prof. Aris", "Mawar", "Cempaka", "Amir"), extract that person's name accurately.
   - If pronouns or titles are used ("bos", "klien", "supervisor", "dia"), map to the most likely known person in the workspace or use a clean role name and ask for disambiguation.
   - Support common Malay nicknames: "Gee" / "Kak Gee" -> "Madam Fauziah", "War" -> "Mawar".
2. MEMORY CLASSIFICATION (ACCURATE CATEGORIZATION):
   - "Decision": Architectural choices, approvals, tech stack selections, policy mandates (e.g. "approved FalkorDB", "decided to use Redis", "setuju tukar").
   - "Task": Deliverables assigned with deadlines or work items (e.g. "deliver by Friday", "kena siapkan draft", "suruh isi borang").
   - "Promise": Financial agreements, budget quotes, SLA uptime guarantees (e.g. "RM850 for mockups", "guarantee 99.9% uptime", "janji hantar esok").
   - "Preference": Working styles, meeting times, tech preferences (e.g. "prefer weekly standups", "lebih suka guna dark mode").
3. CONTRADICTIONS & SUPERSEDING INSTRUCTIONS:
   - If a statement modifies or negates earlier instructions (e.g. earlier was 4 forms, now '3 je borang... borang ketiga tak perlu', or price changed from RM500 to RM850), set needsClarification=true and ask if this supersedes the old agreement.
4. PROJECT FOLDER MAPPING:
   - Prefer matching to an existing workspace project (e.g., 'Agent Memory Core', 'Innovation Studio Portal', 'FalkorDB Clusters & SLA', 'FYP'). Only use 'General' if completely unrelated.
5. AMOUNTS & NUMBERS:
   - Accurately parse currency numbers (RM500 -> 500, $1200 -> 1200, "lapan ratus lima puluh" -> 850).
Return JSON only. No prose.`;

export async function extractMemoryEntities(
  rawText: string,
  activeProject = "General",
  context?: ExtractionContext
): Promise<SmartExtractionResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("[Gemini] API Key missing, using deterministic smart fallback.");
    return heuristicSmartFallback(rawText, activeProject, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const targetModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

    const contextPrompt = [
      `Current Date: ${new Date().toISOString().split("T")[0]}`,
      `Active Project Context: "${activeProject}"`,
      context?.existingProjects?.length ? `Existing Workspace Projects: ${JSON.stringify(context.existingProjects)}` : "",
      context?.existingPersons?.length ? `Existing People in Workspace: ${JSON.stringify(context.existingPersons)}` : "",
      context?.recentMemories?.length ? `Recent Commitments/Instructions in Workspace: ${JSON.stringify(context.recentMemories)}` : "",
      `Statement: "${rawText}"`
    ].filter(Boolean).join("\n");

    let result;
    try {
      const model = genAI.getGenerativeModel({
        model: targetModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
        systemInstruction: SMART_EXTRACTION_SYSTEM,
      });
      result = await model.generateContent(contextPrompt);
    } catch (primaryError: any) {
      console.warn(`[Gemini] Model ${targetModel} notice, falling back to gemini-3.5-flash-lite:`, primaryError?.message);
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
        systemInstruction: SMART_EXTRACTION_SYSTEM,
      });
      result = await fallbackModel.generateContent(contextPrompt);
    }

    const parsed = JSON.parse(result.response.text());
    const targetObj = Array.isArray(parsed) ? parsed[0] : parsed;

    const validatedExtracted = ExtractionSchema.parse(targetObj.extracted);

    return {
      needsClarification: Boolean(targetObj.needsClarification),
      issues: Array.isArray(targetObj.issues) ? targetObj.issues : [],
      clarificationQuestions: Array.isArray(targetObj.clarificationQuestions)
        ? targetObj.clarificationQuestions
        : [],
      extracted: validatedExtracted,
    };
  } catch (error) {
    console.error("[Gemini] Smart extraction notice, using fallback:", error);
    return heuristicSmartFallback(rawText, activeProject, context);
  }
}
