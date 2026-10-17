"use client";

import React, { useState, useEffect, useRef } from "react";
import { History, Calendar, Play, Pause, Sparkles, CheckCircle2 } from "lucide-react";

interface TimeTravelProps {
  asOfDate?: string;
  currentUser?: any;
  isGuest?: boolean;
  selectedProject?: string;
  refreshTrigger?: number;
  workspaceOwner?: string | null;
  onAsOfDateChange?: (date: string) => void;
  onSelectResult?: (result: any) => void;
}

export default function TimeTravel({
  asOfDate = "2026-08-15",
  currentUser = null,
  isGuest = false,
  selectedProject = "all",
  refreshTrigger = 0,
  workspaceOwner = null,
  onAsOfDateChange,
  onSelectResult,
}: TimeTravelProps) {
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const performTimeTravelQuery = async (date: string) => {
    // If we're not in guest mode, wait until currentUser is available. Never leak sandbox data!
    if (!isGuest && !currentUser) {
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("matters_dev_user") : null;
        if (!stored) {
          // No user session at all
          return;
        }
      } catch {
        return;
      }
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (isGuest || !currentUser) {
        // Strictly only send x-guest-mode when actually in guest mode
        if (!isGuest) return;
        headers["x-guest-mode"] = "true";
      } else {
        let authHeader = `Bearer demo_user_session`;
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
        headers["Authorization"] = authHeader;
        if (workspaceOwner) {
          headers["x-workspace-owner"] = workspaceOwner;
        }
      }

      let deletedList: string[] = [];
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("matters_deleted_projects") : null;
        if (stored) deletedList = JSON.parse(stored);
      } catch {}

      const res = await fetch("/api/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          personName: "",
          asOf: date,
          project: selectedProject,
          deletedProjects: deletedList,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setQueryResult(json.data);
        if (onSelectResult) {
          onSelectResult(json.data);
        }
      }
    } catch (e) {
      console.error("Time travel query failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performTimeTravelQuery(asOfDate);
  }, [asOfDate, currentUser, isGuest, selectedProject, refreshTrigger]);

  // Handle Play/Pause Auto Scrubbing across days
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        try {
          const currentDate = new Date(asOfDate);
          currentDate.setDate(currentDate.getDate() + 1);
          const nextIso = currentDate.toISOString().split("T")[0];
          if (onAsOfDateChange) {
            onAsOfDateChange(nextIso);
          }
        } catch {
          setIsPlaying(false);
        }
      }, 800);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, asOfDate, onAsOfDateChange]);

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    if (e.target.value && onAsOfDateChange) {
      onAsOfDateChange(e.target.value);
    }
  };

  const jumpToDate = (targetDate: string) => {
    setIsPlaying(false);
    if (onAsOfDateChange) {
      onAsOfDateChange(targetDate);
    }
  };

  return (
    <div className="bg-card rounded-[14px] border border-border shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center shadow-2xs">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
              Bi-Temporal Time Travel
            </h2>
            <p className="text-[10.5px] text-muted">
              Query historical state at any point in time
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-subtle text-muted border border-border">
          FalkorDB As-Of
        </span>
      </div>

      {/* Date Picker & Scrub Controls */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <span>Query As-Of Date:</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-1.5 rounded-[6px] border transition ${
                isPlaying
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:bg-subtle"
              }`}
              title={isPlaying ? "Pause timeline scrub" : "Auto-play timeline scrub"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Flexible Date Input (Supports Any Date Before or After Registration) */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={asOfDate}
            onChange={handleDateInput}
            className="flex-1 px-3 py-1.5 text-[12.5px] font-mono font-medium bg-white text-foreground border border-border rounded-[8px] focus:outline-none focus:border-primary shadow-2xs"
          />
        </div>

        {/* Milestone Preset Quick Jumps */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => jumpToDate("2026-08-01")}
            className={`px-2 py-1 text-[10.5px] rounded-[6px] font-mono border text-center transition ${
              asOfDate === "2026-08-01"
                ? "bg-primary text-white border-primary font-semibold shadow-xs"
                : "bg-white text-muted hover:text-foreground border-border hover:bg-subtle"
            }`}
          >
            Aug 1 (Baseline)
          </button>
          <button
            type="button"
            onClick={() => jumpToDate("2026-08-15")}
            className={`px-2 py-1 text-[10.5px] rounded-[6px] font-mono border text-center transition ${
              asOfDate === "2026-08-15"
                ? "bg-primary text-white border-primary font-semibold shadow-xs"
                : "bg-white text-muted hover:text-foreground border-border hover:bg-subtle"
            }`}
          >
            Aug 15 (Sprint Mid)
          </button>
          <button
            type="button"
            onClick={() => jumpToDate(todayStr)}
            className={`px-2 py-1 text-[10.5px] rounded-[6px] font-mono border text-center transition ${
              asOfDate === todayStr
                ? "bg-primary text-white border-primary font-semibold shadow-xs"
                : "bg-white text-muted hover:text-foreground border-border hover:bg-subtle"
            }`}
          >
            Today (Latest)
          </button>
        </div>
      </div>

      {/* Active Commitments as of Selected Date */}
      {(() => {
        let deletedList: string[] = [];
        try {
          const stored = typeof window !== "undefined" ? localStorage.getItem("matters_deleted_projects") : null;
          if (stored) deletedList = JSON.parse(stored).map((d: string) => String(d).toLowerCase().trim());
        } catch {}

        const displayedMemories = (queryResult?.activeMemories || []).filter((mem: any) => {
          const p = String(mem.project || "").toLowerCase().trim();
          if (deletedList.includes(p)) return false;
          if (selectedProject && selectedProject.toLowerCase() !== "all") {
            if (p !== selectedProject.toLowerCase().trim()) return false;
          }
          return true;
        });

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-foreground">
                Active Commitments as of Selected Date ({displayedMemories.length})
              </span>
              {loading && <span className="text-[10px] text-primary animate-pulse">Evaluating Cypher query...</span>}
            </div>

            <div className="max-h-[230px] overflow-y-auto space-y-2 pr-1">
              {displayedMemories.length > 0 ? (
                displayedMemories.map((mem: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectResult) {
                        onSelectResult({ ...queryResult, activeMemories: [mem] });
                      }
                    }}
                    className="p-2.5 rounded-[9px] bg-subtle/40 hover:bg-subtle border border-border text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-foreground">
                        {mem.personName}
                      </span>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground leading-snug line-clamp-2">
                      {mem.text}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted font-mono">
                      <span>📁 {mem.project}</span>
                      {mem.amount && <span className="font-bold text-primary">RM / ${mem.amount}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted text-[11.5px] border border-dashed border-border rounded-[8px]">
                  No active commitments found as of {asOfDate}.
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
