"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, Briefcase, Hammer, User, Check, Sparkles, ShieldCheck, RotateCcw } from "lucide-react";

export interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  subtitle: string;
  bio: string;
  badge: string;
}

export const PERSONAS: Record<string, PersonaProfile> = {
  aris: {
    id: "aris",
    name: "Prof. Aris",
    role: "Project Director",
    subtitle: "Governance & Evaluation",
    bio: "Executive advisor and research supervisor directing architecture baselines, evaluation benchmarks, and governance standards.",
    badge: "Director",
  },
  melati: {
    id: "melati",
    name: "Melati",
    role: "Lead AI Engineer",
    subtitle: "Graph Schemas & Agent Memory",
    bio: "Lead AI engineer designing multi-agent bi-temporal memory graphs and FalkorDB Cypher traversal queries.",
    badge: "AI Lead",
  },
  mawar: {
    id: "mawar",
    name: "Mawar",
    role: "Lead UI/UX Designer",
    subtitle: "Design Systems & Viewports",
    bio: "Freelance designer building high-fidelity multi-agent interface states and time-travel visualizers.",
    badge: "Designer",
  },
  cempaka: {
    id: "cempaka",
    name: "Cempaka",
    role: "Cloud Infra Contractor",
    subtitle: "FalkorDB Clusters & SLA",
    bio: "Infrastructure contractor managing low-latency FalkorDB cloud clusters, automated snapshots, and uptime SLAs.",
    badge: "Infra SLA",
  },
  sofia: {
    id: "sofia",
    name: "Dr. Sofia",
    role: "Security Auditor (Agent)",
    subtitle: "Compliance & FalkorDB Audits",
    bio: "Autonomous AI security agent performing penetration audits, access control checks, and zero-trust verification on FalkorDB multi-tenant graphs.",
    badge: "Security Agent",
  },
};

interface SandboxSwitcherProps {
  currentPersona: string;
  onSelectPersona: (personaId: string) => void;
  onResetSandbox?: () => void;
}

export default function SandboxSwitcher({
  currentPersona,
  onSelectPersona,
  onResetSandbox,
}: SandboxSwitcherProps) {
  const [hasSofia, setHasSofia] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("matters_sandbox_collaborators");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.some((c: any) => c.name?.toLowerCase().includes("sofia"))) {
          setHasSofia(true);
        }
      }
    } catch {}
  }, [currentPersona]);

  const activePersonaList = Object.values(PERSONAS).filter((p) => {
    if (p.id === "sofia") return hasSofia || currentPersona === "sofia";
    return true;
  });

  const getIcon = (id: string) => {
    switch (id) {
      case "aris":
        return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case "melati":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case "mawar":
        return <Briefcase className="w-4 h-4 text-pink-600" />;
      case "cempaka":
        return <Hammer className="w-4 h-4 text-amber-600" />;
      case "sofia":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      default:
        return <User className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="bg-card rounded-[14px] border border-blue-200/70 bg-gradient-to-r from-blue-50/30 via-white to-blue-50/15 shadow-xs p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
                Guest Sandbox Personas ({activePersonaList.length} Active Personas)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-semibold">
                Select Persona
              </span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Select any persona to inspect their scoped project workspace, interactive memory graph, and commitments.
            </p>
          </div>
        </div>

        {onResetSandbox && (
          <button
            type="button"
            onClick={onResetSandbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/80 rounded-[8px] transition active:scale-95 cursor-pointer shadow-2xs self-start sm:self-center shrink-0"
            title="Reset sandbox state, clear simulated collaborators, and restore default personas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span>Reset Sandbox</span>
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${activePersonaList.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3`}>
        {activePersonaList.map((p) => {
          const isSelected = currentPersona === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPersona(p.id)}
              className={`p-3.5 rounded-[10px] border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary-soft/40 shadow-sm ring-1 ring-primary/30"
                  : "border-border bg-white hover:bg-subtle/70 hover:border-border-strong"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-subtle border border-border flex items-center justify-center shrink-0">
                      {getIcon(p.id)}
                    </div>
                    <div>
                      <span className="text-[13px] font-bold text-foreground block leading-tight">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-muted block">
                        {p.role}
                      </span>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted bg-subtle border border-border px-1.5 py-0.5 rounded">
                      {p.badge}
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <span className="inline-block text-[10.5px] font-semibold text-primary bg-primary-soft/60 border border-primary/20 px-2 py-0.5 rounded-md">
                    {p.subtitle}
                  </span>
                </div>

                <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                  {p.bio}
                </p>
              </div>

              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-primary/20 flex items-center gap-1.5 text-[10.5px] font-medium text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Active Workspace</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

