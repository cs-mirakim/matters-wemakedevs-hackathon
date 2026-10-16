"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  X,
  FolderGit2,
  UserCheck,
  History,
} from "lucide-react";

import { cleanProjectName, isAllProject } from "@/lib/projects";

interface ProjectItem {
  id: string;
  name: string;
}

interface QuickCaptureProps {
  currentUser?: any;
  selectedProject?: string;
  projects?: ProjectItem[];
  onMemoryCaptured?: (data: any) => void;
}

const REAL_PROMPT_TEMPLATES = [
  {
    title: "Director Mandate",
    text: "Prof. Aris mandated bi-temporal graph memory benchmarks and automated Cypher telemetry.",
    project: "Innovation Studio Portal",
  },
  {
    title: "Design System",
    text: "Mawar committed to deliver 8 responsive viewport mockups and interactive time-travel slider for RM850.",
    project: "Innovation Studio Portal",
  },
  {
    title: "Contractor SLA",
    text: "Cempaka committed to low-latency cluster migration with 99.9% uptime SLA by Friday.",
    project: "FalkorDB Clusters & SLA",
  },
  {
    title: "Security Agent",
    text: "Dr. Sofia completed zero-trust penetration testing on FalkorDB tenant isolation and verified ISO-27001 compliance.",
    project: "Agent Memory Core",
  },
];


export default function QuickCapture({
  currentUser = null,
  selectedProject = "all",
  projects = [],
  onMemoryCaptured,
}: QuickCaptureProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract cleaned project list (excluding 'all') strictly from available projects prop
  const availableProjects = React.useMemo(() => {
    const list = (projects || [])
      .map((p) => cleanProjectName(p.name))
      .filter((p) => p && !isAllProject(p));

    const set = new Set(list);
    if (set.size === 0) {
      set.add("General");
    }
    return Array.from(set);
  }, [projects]);

  // Target project dropdown state
  const [targetProject, setTargetProject] = useState<string>(() => {
    if (selectedProject && !isAllProject(selectedProject)) {
      return cleanProjectName(selectedProject);
    }
    const list = (projects || [])
      .map((p) => cleanProjectName(p.name))
      .filter((p) => p && !isAllProject(p));
    return list[0] || "General";
  });

  // Keep targetProject in sync if user changes header project filter
  useEffect(() => {
    if (selectedProject && !isAllProject(selectedProject)) {
      const clean = cleanProjectName(selectedProject);
      if (clean) setTargetProject(clean);
    }
  }, [selectedProject]);

  // If the currently selected targetProject was deleted or is no longer in availableProjects, auto-switch
  useEffect(() => {
    if (availableProjects.length > 0 && !availableProjects.includes(targetProject)) {
      const cleanSelected = cleanProjectName(selectedProject);
      if (cleanSelected && availableProjects.includes(cleanSelected)) {
        setTargetProject(cleanSelected);
      } else {
        setTargetProject(availableProjects[0]);
      }
    }
  }, [availableProjects, targetProject, selectedProject]);

  // State untuk Dialog Pengesahan Pintar (Smart Clarification & Preview)
  const [clarificationData, setClarificationData] = useState<{
    questions: string[];
    extracted: any;
    sourceId: string;
    issues: string[];
  } | null>(null);

  const getAuthHeader = async () => {
    let authHeader = `Bearer demo_user_session`;
    if (currentUser) {
      try {
        const { auth } = await import("@/lib/firebase");
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          authHeader = `Bearer ${token}`;
        } else {
          authHeader = `Bearer ${currentUser.uid}`;
        }
      } catch {
        authHeader = `Bearer ${currentUser.uid}`;
      }
    }
    return authHeader;
  };

  const handleCapture = async (
    captureText: string,
    options?: { confirmed?: boolean; confirmedData?: any; explicitProject?: string }
  ) => {
    const textToSend = captureText || text;
    if (!textToSend.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const activeProjectName = options?.explicitProject || targetProject || "General";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (!currentUser) {
        headers["x-guest-mode"] = "true";
      } else {
        const authHeader = await getAuthHeader();
        headers["Authorization"] = authHeader;
      }

      const response = await fetch("/api/capture", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: textToSend,
          project: activeProjectName,
          confirmed: options?.confirmed || false,
          confirmedData: options?.confirmedData,
          context: {
            existingProjects: availableProjects,
            existingPersons: ["Madam Gee", "Madam Fauziah", "Prof. Aris", "Melati", "Mawar", "Cempaka"],
          },
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to process memory.");
      }

      // If user hasn't confirmed, pop up smart review & confirmation card
      if (!options?.confirmed) {
        setClarificationData({
          questions:
            json.clarificationQuestions && json.clarificationQuestions.length > 0
              ? json.clarificationQuestions
              : [
                  json.needsClarification
                    ? "Please clarify ambiguous details before committing to graph:"
                    : "Review AI extraction preview before committing to bi-temporal graph:",
                ],
          extracted: {
            ...json.extracted,
            project: json.extracted?.project || activeProjectName,
            memoryType: json.extracted?.memoryType || json.extracted?.nodeType || "Promise",
          },
          sourceId: json.sourceId,
          issues: json.issues || [],
        });
        return;
      }

      // If in guest sandbox, store in localStorage for instant graph rendering
      if (!currentUser || json.dbStatus === "guest_sandbox") {
        try {
          const existingMemories = JSON.parse(localStorage.getItem("matters_guest_memories") || "[]");
          const newEntry = {
            personName: json.extracted?.personName || "Collaborator",
            personType: json.extracted?.personType || "collaborator",
            relType: "MADE_PROMISE",
            validFrom: json.extracted?.validFrom || new Date().toISOString().split("T")[0],
            validTo: null,
            sourceId: json.sourceId,
            confidence: json.extracted?.confidence || 0.95,
            text: json.extracted?.text || textToSend,
            amount: json.extracted?.amount ?? null,
            project: json.extracted?.project || activeProjectName,
            status: "current",
            nodeType: json.extracted?.memoryType || "Promise",
          };

          // Mark superseded entries on the same project ONLY for matching person
          const updated = existingMemories.map((m: any) => {
            const samePerson =
              m.personName &&
              newEntry.personName &&
              (m.personName.toLowerCase() === newEntry.personName.toLowerCase() ||
                m.personName.toLowerCase().includes(newEntry.personName.toLowerCase()) ||
                newEntry.personName.toLowerCase().includes(m.personName.toLowerCase()));

            if (m.project === newEntry.project && m.status === "current" && samePerson) {
              return { ...m, status: "superseded", validTo: newEntry.validFrom };
            }
            return m;
          });

          updated.push(newEntry);
          localStorage.setItem("matters_guest_memories", JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not save to matters_guest_memories:", e);
        }
      }

      // Successfully saved
      setClarificationData(null);
      setLastResult(json);
      setText("");
      if (onMemoryCaptured) {
        onMemoryCaptured(json);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error while connecting to FalkorDB.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pengguna klik "Sahkan & Simpan" dalam dialog mini
  const handleConfirmAndSave = () => {
    if (!clarificationData) return;
    handleCapture(text, {
      confirmed: true,
      confirmedData: clarificationData.extracted,
      explicitProject: clarificationData.extracted.project,
    });
  };

  return (
    <div className="bg-card rounded-[14px] border border-border shadow-sm p-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                Smart Quick Capture
              </h2>
              <p className="text-[10.5px] text-muted">
                Curious AI Disambiguation & Bi-temporal Graph Persist
              </p>
            </div>
          </div>
          <span className="text-[10.5px] text-muted font-mono px-2 py-0.5 rounded bg-subtle border border-border">
            Gemini 3.5 Flash Lite + FalkorDB
          </span>
        </div>

        {/* Project Target Bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5 px-2.5 py-1.5 rounded-[8px] bg-subtle/70 border border-border">
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted font-medium">
            <FolderGit2 className="w-3.5 h-3.5 text-primary" />
            <span>Target Project:</span>
          </div>
          <select
            value={targetProject}
            onChange={(e) => setTargetProject(e.target.value)}
            disabled={isSubmitting}
            className="text-[11.5px] font-semibold text-foreground bg-white border border-border rounded-[6px] px-2 py-0.5 focus:outline-none focus:border-primary cursor-pointer max-w-[200px]"
          >
            {availableProjects.map((p) => {
              const clean = cleanProjectName(p);
              return (
                <option key={clean} value={clean}>
                  📁 {clean}
                </option>
              );
            })}
          </select>
        </div>

        {clarificationData ? (
          /* SMART ENTITY INSPECTOR & CONFIRMATION BOX */
          <div className="p-4 rounded-[14px] bg-white border border-primary/30 shadow-sm text-[12px] space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[6px] bg-primary-soft text-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-[12.5px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                    <span>Smart Entity Inspector</span>
                    <span className="text-[9.5px] font-medium font-mono px-1.5 py-0.2 rounded bg-primary-soft text-primary border border-primary/20">
                      AI Preview
                    </span>
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClarificationData(null)}
                className="text-muted hover:text-foreground p-1 rounded hover:bg-subtle transition cursor-pointer"
                title="Cancel and return to input"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Curious Follow-up Questions or Intent Summary */}
            <div className="p-3 rounded-[10px] bg-subtle/80 border border-border text-[11.5px] text-foreground leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini AI Verification & Extraction Review:</span>
              </div>
              {clarificationData.questions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-muted pl-0.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>

            {/* Alias Quick-Action if Detected */}
            {clarificationData.issues.includes("alias_detected") && (
              <button
                type="button"
                onClick={() =>
                  setClarificationData({
                    ...clarificationData,
                    extracted: {
                      ...clarificationData.extracted,
                      personName: "Madam Fauziah",
                      project: "FYP",
                    },
                  })
                }
                className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] bg-amber-50 hover:bg-amber-100/90 border border-amber-300 text-amber-900 text-[11.5px] font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Link Alias: Map <strong>Madam Gee</strong> ➔ <strong>Madam Fauziah</strong> (FYP Supervisor)</span>
                </span>
                <span className="text-[10px] font-semibold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded shadow-2xs">
                  Apply
                </span>
              </button>
            )}

            {/* Quick Category Selection (4 distinct pills) */}
            <div>
              <label className="text-[10.5px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                Record Category:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { type: "Decision", icon: "📌", label: "Decision" },
                  { type: "Task", icon: "📋", label: "Task" },
                  { type: "Promise", icon: "🎨", label: "Promise" },
                  { type: "Preference", icon: "⭐", label: "Preference" },
                ].map((item) => {
                  const isActive = (clarificationData.extracted.memoryType || "Promise") === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() =>
                        setClarificationData({
                          ...clarificationData,
                          extracted: {
                            ...clarificationData.extracted,
                            memoryType: item.type,
                          },
                        })
                      }
                      className={`py-1.5 px-1 rounded-[8px] text-[11px] font-semibold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                        isActive
                          ? "bg-primary text-white border-primary shadow-2xs"
                          : "bg-subtle text-foreground border-border hover:bg-white hover:border-muted"
                      }`}
                    >
                      <span className="text-[11px]">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean, Symmetrical 2-Column Editable Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-[10px] bg-subtle/50 border border-border">
              {/* Field 1: Person Name */}
              <div>
                <label className="text-muted block text-[10px] uppercase font-semibold tracking-wide">
                  Person Name (Individual)
                </label>
                <input
                  type="text"
                  value={clarificationData.extracted.personName || ""}
                  onChange={(e) =>
                    setClarificationData({
                      ...clarificationData,
                      extracted: {
                        ...clarificationData.extracted,
                        personName: e.target.value,
                      },
                    })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-border rounded-[6px] bg-white text-foreground font-medium focus:outline-none focus:border-primary shadow-2xs"
                  placeholder="Individual's name..."
                />
              </div>

              {/* Field 2: Target Project */}
              <div>
                <label className="text-muted block text-[10px] uppercase font-semibold tracking-wide">
                  Target Project
                </label>
                <select
                  value={clarificationData.extracted.project || targetProject}
                  onChange={(e) =>
                    setClarificationData({
                      ...clarificationData,
                      extracted: {
                        ...clarificationData.extracted,
                        project: e.target.value,
                      },
                    })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-border rounded-[6px] bg-white text-foreground font-semibold focus:outline-none focus:border-primary shadow-2xs cursor-pointer truncate"
                >
                  {availableProjects.map((p) => {
                    const clean = cleanProjectName(p);
                    return (
                      <option key={clean} value={clean}>
                        📁 {clean}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Field 3: Effective Date */}
              <div>
                <label className="text-muted block text-[10px] uppercase font-semibold tracking-wide">
                  Effective Date (Valid From)
                </label>
                <input
                  type="date"
                  value={clarificationData.extracted.validFrom || ""}
                  onChange={(e) =>
                    setClarificationData({
                      ...clarificationData,
                      extracted: {
                        ...clarificationData.extracted,
                        validFrom: e.target.value,
                      },
                    })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-border rounded-[6px] bg-white text-foreground font-mono focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                />
              </div>

              {/* Field 4: Amount / Budget */}
              <div>
                <label className="text-muted block text-[10px] uppercase font-semibold tracking-wide">
                  Estimated Budget (Optional)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-[11px] font-mono">
                    RM
                  </span>
                  <input
                    type="number"
                    value={clarificationData.extracted.amount ?? ""}
                    placeholder="0.00"
                    onChange={(e) =>
                      setClarificationData({
                        ...clarificationData,
                        extracted: {
                          ...clarificationData.extracted,
                          amount: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      })
                    }
                    className="w-full pl-9 pr-2.5 py-1.5 text-[12px] border border-border rounded-[6px] bg-white text-foreground font-mono focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setClarificationData(null)}
                className="px-3 py-1.5 text-[11.5px] text-muted hover:text-foreground hover:bg-subtle rounded-[6px] transition cursor-pointer"
              >
                ✕ Cancel & Edit Prompt
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-[8px] transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Persisting to Graph...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Persist to Graph</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Suggestion Templates */}
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                  Sample Prompts (Click to test):
                </span>
                <span className="text-[10px] text-muted font-mono">Curious Check</span>
              </div>

              <div className="space-y-1.5">
                {REAL_PROMPT_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setText(tpl.text);
                      setTargetProject(tpl.project);
                      setClarificationData(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-[8px] border border-border bg-subtle hover:bg-subtle/80 hover:border-border-strong transition group flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-[11.5px] text-muted group-hover:text-foreground transition line-clamp-1">
                      &ldquo;{tpl.text}&rdquo;
                    </span>
                    <span className="text-[9.5px] font-mono text-muted bg-white px-1.5 py-0.2 rounded border border-border shrink-0">
                      {tpl.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Textarea */}
            <div className="relative mt-2">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (clarificationData) setClarificationData(null);
                }}
                placeholder="Type any directive, promise, or decision... e.g. 'madam gee told us to fill 4 ethics forms & 1 consent letter'"
                className="w-full p-3 text-[12.5px] rounded-[8px] border border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-faint transition resize-none leading-relaxed"
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-muted">
                  {text.length}/1000 chars • Target: <strong>📁 {cleanProjectName(targetProject)}</strong>
                </span>
                <button
                  type="button"
                  disabled={isSubmitting || !text.trim()}
                  onClick={() => handleCapture(text)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition active:scale-[0.99] shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Capture Memory</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[12px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Live Capture Result Feedback */}
      {lastResult && (
        <div className="mt-4 p-3 rounded-[10px] bg-emerald-50/70 border border-emerald-200 text-[12px] animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-200/80">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[12px]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Memory Successfully Persisted to FalkorDB!</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700">
              {lastResult.sourceId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
            <div>
              <span className="text-muted block text-[10px] uppercase">Entity / Person</span>
              <span className="font-semibold text-foreground">
                {lastResult.extracted?.personName}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Category</span>
              <span className="font-medium text-foreground">
                {lastResult.extracted?.memoryType}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Project</span>
              <span className="font-medium text-foreground font-semibold">
                📁 {cleanProjectName(lastResult.extracted?.project)}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Amount / Quantity</span>
              <span className="font-medium text-foreground">
                {lastResult.extracted?.amount ? `${lastResult.extracted.amount} unit` : "None"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
