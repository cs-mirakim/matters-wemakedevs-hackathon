/**
 * Shared project helpers and constant definitions for Matters Workspace.
 * Ensures consistent unicode-safe project name formatting across all components and API routes.
 */

export interface WorkspaceProjectItem {
  id: string;
  name: string;
}

export const DEFAULT_WORKSPACE_PROJECTS: WorkspaceProjectItem[] = [
  { id: "all", name: "🌐 All Projects" },
];

export const SANDBOX_WORKSPACE_PROJECTS: WorkspaceProjectItem[] = [
  { id: "all", name: "🌐 All Projects" },
  { id: "Innovation Studio Portal", name: "📁 Innovation Studio Portal" },
  { id: "Agent Memory Core", name: "📁 Agent Memory Core" },
  { id: "FalkorDB Clusters & SLA", name: "📁 FalkorDB Clusters & SLA" },
];

export const PERSONA_PROJECTS: Record<string, string[]> = {
  aris: ["Innovation Studio Portal", "Agent Memory Core"],
  melati: ["Innovation Studio Portal", "Agent Memory Core"],
  mawar: ["Innovation Studio Portal"],
  cempaka: ["FalkorDB Clusters & SLA"],
  sofia: ["Innovation Studio Portal", "Agent Memory Core", "FalkorDB Clusters & SLA"],
};



/**
 * Safely strips emojis (📁, 🌐), broken UTF-16 surrogates (\uD800-\uDFFF),
 * and unicode replacement characters (\uFFFD) from project names.
 */
export function cleanProjectName(name?: string | null): string {
  if (!name || typeof name !== "string") return "";
  let cleaned = name;
  for (let i = 0; i < 5; i++) {
    const prev = cleaned;
    cleaned = cleaned
      .replace(/^[\uD800-\uDFFF\uFFFD\s]+/g, "")
      .replace(new RegExp("^[\\u{1F4C1}\\u{1F310}\\u{1F4C2}📁🌐]", "u"), "")
      .replace(/^[\uD800-\uDFFF\uFFFD\s]+/g, "")
      .trim();
    if (cleaned === prev) break;
  }
  return cleaned;
}

/**
 * Formats a clean project name with folder emoji for display.
 */
export function formatProjectDisplay(name?: string | null): string {
  const clean = cleanProjectName(name);
  if (!clean || isAllProject(clean)) {
    return "🌐 All Projects";
  }
  return `📁 ${clean}`;
}

/**
 * Checks if a project string represents the "All Projects" meta option.
 */
export function isAllProject(p?: string | null): boolean {
  if (!p) return true;
  const clean = cleanProjectName(p).toLowerCase().replace(/[^a-z]/g, "");
  return !clean || clean === "all" || clean === "allprojects";
}
