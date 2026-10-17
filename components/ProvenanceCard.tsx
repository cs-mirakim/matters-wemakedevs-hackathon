"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Edit3,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import EditMemoryModal from "./EditMemoryModal";

interface ProvenanceCardProps {
  selectedMemory?: any;
  projects?: { id: string; name: string }[];
  currentUser?: any;
  asOfDate?: string;
  workspaceOwner?: string | null;
  userRole?: string;
  onMemoryUpdated?: (updated: any) => void;
  onMemoryReverted?: (sourceId: string) => void;
}

export default function ProvenanceCard({
  selectedMemory,
  projects = [],
  currentUser = null,
  asOfDate = "2026-08-15",
  workspaceOwner = null,
  userRole = "admin",
  onMemoryUpdated,
  onMemoryReverted,
}: ProvenanceCardProps) {
  const [showTraceCypher, setShowTraceCypher] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const isSandboxMemory = Boolean(
    (selectedMemory?.sourceId && String(selectedMemory.sourceId).startsWith("sandbox_")) ||
    (selectedMemory?.id && String(selectedMemory.id).startsWith("sandbox_")) ||
    (selectedMemory?.source_id && String(selectedMemory.source_id).startsWith("sandbox_"))
  );

  let isDeletedProject = false;
  try {
    const deletedListStr = typeof window !== "undefined" ? localStorage.getItem("matters_deleted_projects") : null;
    if (deletedListStr && selectedMemory?.project) {
      const deletedList: string[] = JSON.parse(deletedListStr);
      const projClean = String(selectedMemory.project).toLowerCase().trim();
      isDeletedProject = deletedList.some((d) => d.toLowerCase().trim() === projClean);
    }
  } catch {}

  // Logged-in user should NEVER display sandbox dummy memory, and deleted project memories are immediately hidden
  const mem = (currentUser && isSandboxMemory) || isDeletedProject ? null : selectedMemory;

  const validFrom = mem ? mem.validFrom || mem.valid_from || "2026-08-01" : "";
  const validTo = mem ? mem.validTo || mem.valid_to || null : null;
  const memStatus = mem ? mem.status || "current" : "current";

  const isSuperseded = Boolean(
    memStatus === "superseded" || (validTo && asOfDate && validTo <= asOfDate)
  );
  const isFuture = Boolean(!isSuperseded && asOfDate && validFrom && validFrom > asOfDate);
  const isCurrent = Boolean(mem && !isSuperseded && !isFuture);

  const handleRevert = async () => {
    if (!mem?.sourceId || isReverting) return;
    setIsReverting(true);

    try {
      const headers: Record<string, string> = {};
      if (!currentUser) {
        headers["x-guest-mode"] = "true";
      } else {
        try {
          const { auth } = await import("@/lib/firebase");
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            headers["Authorization"] = `Bearer ${token}`;
          } else {
            headers["Authorization"] = `Bearer ${currentUser.uid}`;
          }
        } catch {
          headers["Authorization"] = `Bearer ${currentUser.uid}`;
        }
      }

      if (workspaceOwner) {
        headers["x-workspace-owner"] = workspaceOwner;
      }
      if (userRole) {
        headers["x-user-role"] = userRole;
      }

      const res = await fetch(`/api/capture?sourceId=${encodeURIComponent(mem.sourceId)}`, {
        method: "DELETE",
        headers,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to revert memory");
      }

      // If in guest sandbox, remove from localStorage
      if (!currentUser || json.dbStatus === "guest_sandbox") {
        try {
          const guestMemories = JSON.parse(localStorage.getItem("matters_guest_memories") || "[]");
          const filtered = guestMemories.filter((m: any) => m.sourceId !== mem.sourceId);
          // Restore un-superseded previous memory if any
          const restored = filtered.map((m: any) => {
            if (m.project === mem.project && m.validTo === mem.validFrom) {
              return { ...m, validTo: null, status: "current" };
            }
            return m;
          });
          localStorage.setItem("matters_guest_memories", JSON.stringify(restored));

          // Also record reverted ID to filter out default sandbox items
          const revertedIds = JSON.parse(localStorage.getItem("matters_reverted_memories") || "[]");
          if (!revertedIds.includes(mem.sourceId)) {
            revertedIds.push(mem.sourceId);
            localStorage.setItem("matters_reverted_memories", JSON.stringify(revertedIds));
          }
        } catch {}
      }

      setConfirmRevert(false);
      if (onMemoryReverted) {
        onMemoryReverted(mem.sourceId);
      }
    } catch (e: any) {
      alert(e.message || "Could not revert memory.");
    } finally {
      setIsReverting(false);
    }
  };

  if (!mem) {
    return (
      <div className="bg-card rounded-[14px] border border-border shadow-sm p-4 flex flex-col justify-between h-[440px] overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-primary-soft text-primary flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
              Provenance & Verification
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-subtle text-muted border border-border">
            Bi-temporal Audit
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-12 h-12 rounded-[12px] bg-primary-soft text-primary flex items-center justify-center border border-primary/20 shadow-2xs mb-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
            Bi-temporal Provenance Inspection
          </h3>
          <p className="text-[11.5px] text-muted max-w-[280px] mt-1.5 leading-relaxed">
            Select any commitment node on the graph or capture a new memory to inspect its source proof, AI confidence score, and bi-temporal lineage.
          </p>
        </div>

        <div className="p-2.5 rounded-[8px] bg-subtle border border-border text-[10.5px] text-muted text-center font-mono">
          Click any node in the graph above to inspect bi-temporal lineage
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[14px] border border-border shadow-sm p-4 flex flex-col justify-between h-[440px] overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                Provenance & Verification
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {userRole?.toLowerCase() === "viewer" ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                Viewer (Read-Only)
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] border border-border bg-subtle hover:bg-subtle/80 text-[11px] font-medium text-foreground transition cursor-pointer"
                  title="Edit this memory node"
                >
                  <Edit3 className="w-3 h-3 text-muted" />
                  <span>Edit</span>
                </button>

                {confirmRevert ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleRevert}
                      disabled={isReverting}
                      className="px-2 py-0.5 rounded-[6px] bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-semibold transition cursor-pointer"
                    >
                      {isReverting ? "Reverting..." : "Confirm Revert"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevert(false)}
                      className="px-1.5 py-0.5 rounded-[6px] border border-border text-[10.5px] text-muted hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRevert(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] border border-red-200 bg-red-50 hover:bg-red-100 text-[11px] font-medium text-red-700 transition cursor-pointer"
                    title="Revert or undo this memory node"
                  >
                    <RotateCcw className="w-3 h-3 text-red-600" />
                    <span>Revert</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2.5 text-[12px]">
          {/* Memory Title & Status */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground text-[12.5px] leading-snug line-clamp-2">
                {mem.text}
              </h3>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                  isCurrent
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : isFuture
                    ? "bg-amber-50 text-amber-700 border border-amber-300"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                {isCurrent
                  ? "✓ Current Valid"
                  : isFuture
                  ? `⏳ Pending (Future: ${validFrom})`
                  : "✗ Superseded"}
              </span>
            </div>
            <p className="text-[11px] text-muted truncate">
              Entity: <strong className="text-foreground">{mem.personName}</strong> • Project: <strong>📁 {mem.project}</strong>
            </p>
          </div>

          {/* Verification Matrix */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-[8px] bg-subtle border border-border text-[11px]">
            <div>
              <span className="text-[9.5px] text-muted uppercase font-mono block">Source Proof</span>
              <span className="font-mono font-medium text-foreground truncate block">
                {mem.sourceId || "manual_capture"}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] text-muted uppercase font-mono block">AI Confidence</span>
              <span className="font-mono font-semibold text-emerald-600">
                {mem.confidence ? `${Math.round(mem.confidence * 100)}% Verified` : "95% Verified"}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] text-muted uppercase font-mono block">Valid From</span>
              <span className="font-mono text-foreground text-[11px]">
                {mem.validFrom ? String(mem.validFrom).substring(0, 10) : "2026-08-01"}
              </span>
            </div>
            <div>
              <span className="text-[9.5px] text-muted uppercase font-mono block">Valid Until</span>
              <span className="font-mono text-foreground text-[11px]">
                {mem.validTo ? String(mem.validTo).substring(0, 10) : "Current (Active)"}
              </span>
            </div>
          </div>

          {/* Revert / Edit Safety Explainer */}
          <div className="p-2 rounded-[8px] bg-primary-soft/40 border border-primary/20 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-muted leading-relaxed">
              <strong className="text-foreground">Bi-temporal Rollback:</strong> Reverting this node automatically restores previous active states if this memory superseded an earlier instruction.
            </p>
          </div>
        </div>
      </div>

      {/* Trace Cypher Accordion pinned at bottom */}
      <div className="pt-2 border-t border-border/80 mt-2">
        <button
          type="button"
          onClick={() => setShowTraceCypher(!showTraceCypher)}
          className="flex items-center justify-between w-full text-[10.5px] font-mono text-muted hover:text-foreground transition cursor-pointer"
        >
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-muted" />
            <span>Trace Cypher Query</span>
          </span>
          {showTraceCypher ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showTraceCypher && (
          <pre className="mt-1.5 p-2 rounded-[6px] bg-background border border-border font-mono text-[9.5px] text-muted overflow-x-auto whitespace-pre-wrap max-h-[75px] overflow-y-auto">
{`MATCH (p:Person)-[r]->(m)
WHERE m.source_id = "${mem.sourceId || "sup_email_01"}"
RETURN p.name, type(r), m.text, r.confidence, r.source_id`}
          </pre>
        )}
      </div>

      {/* Edit Memory Modal */}
      {isEditModalOpen && (
        <EditMemoryModal
          isOpen={isEditModalOpen}
          memory={mem}
          projects={projects}
          currentUser={currentUser}
          asOfDate={asOfDate}
          workspaceOwner={workspaceOwner}
          userRole={userRole}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(updated) => {
            if (onMemoryUpdated) onMemoryUpdated(updated);
          }}
        />
      )}
    </div>
  );
}
