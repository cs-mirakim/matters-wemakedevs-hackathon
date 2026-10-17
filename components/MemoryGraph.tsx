"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Layers, RefreshCw, Calendar, Sparkles, Database } from "lucide-react";
import { PersonNode, ProjectNode, MemoryNode } from "./CustomNodes";
import { cleanProjectName } from "@/lib/projects";

interface MemoryGraphProps {
  asOfDate?: string;
  selectedProject?: string;
  isLiveMode?: boolean;
  currentUser?: any;
  persona?: string;
  isGuest?: boolean;
  workspaceOwner?: string | null;
  userRole?: string;
  onNodeClick?: (memoryData: any) => void;
  onProjectsLoaded?: (projects: string[]) => void;
  onAsOfDateChange?: (date: string) => void;
  refreshTrigger?: number;
}

const nodeTypes = {
  person: PersonNode,
  project: ProjectNode,
  memory: MemoryNode,
};

export default function MemoryGraph({
  asOfDate = "2026-08-15",
  selectedProject = "all",
  isLiveMode = true,
  currentUser = null,
  persona = "aris",
  isGuest = false,
  workspaceOwner = null,
  userRole = "admin",
  onNodeClick,
  onProjectsLoaded,
  onAsOfDateChange,
  refreshTrigger,
}: MemoryGraphProps) {
  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<string>("connected");

  // Fetch real graph data from backend
  const fetchGraphData = useCallback(async () => {
    // Prevent guest sandbox flash: if user is logged in or hydrating session, wait for currentUser
    if (!isGuest && !currentUser) {
      try {
        const stored = typeof window !== "undefined" ? localStorage.getItem("matters_dev_user") : null;
        if (stored) {
          return;
        }
      } catch {}
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {};

      if (isGuest) {
        headers["x-guest-mode"] = "true";
        try {
          const guestMems = localStorage.getItem("matters_guest_memories");
          if (guestMems) {
            headers["x-guest-memories"] = encodeURIComponent(guestMems);
          }
          const revertedMems = localStorage.getItem("matters_reverted_memories");
          if (revertedMems) {
            headers["x-reverted-memories"] = encodeURIComponent(revertedMems);
          }
          const guestCollabs = localStorage.getItem("matters_sandbox_collaborators");
          if (guestCollabs) {
            headers["x-guest-collaborators"] = encodeURIComponent(guestCollabs);
          }
        } catch {}
      } else {
        let authHeader = `Bearer demo_user_session`;
        try {
          const { auth } = await import("@/lib/firebase");
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            authHeader = `Bearer ${token}`;
          } else {
            authHeader = `Bearer ${currentUser?.uid || "user"}`;
          }
        } catch {
          authHeader = `Bearer ${currentUser?.uid || "user"}`;
        }
        headers["Authorization"] = authHeader;
        if (currentUser?.displayName) {
          headers["x-user-display-name"] = encodeURIComponent(currentUser.displayName);
        }
        try {
          const uProjKey = `matters_projects_${currentUser?.uid}`;
          const userProjs = localStorage.getItem(uProjKey);
          if (userProjs) {
            headers["x-user-projects"] = encodeURIComponent(userProjs);
          }
        } catch {}

        if (workspaceOwner) {
          headers["x-workspace-owner"] = workspaceOwner;
          headers["x-user-role"] = userRole || "editor";
        }
      }

      const queryParams = new URLSearchParams({
        project: selectedProject,
        persona: persona || "aris",
      });
      if (currentUser?.displayName) {
        queryParams.set("userName", currentUser.displayName);
      }
      if (workspaceOwner) {
        queryParams.set("workspaceOwner", workspaceOwner);
      }
      if (isGuest) {
        queryParams.set("guest", "true");
      }
      try {
        const storedDeleted = localStorage.getItem("matters_deleted_projects");
        if (storedDeleted) {
          const list = JSON.parse(storedDeleted);
          if (Array.isArray(list) && list.length > 0) {
            queryParams.set("deletedProjects", list.join(","));
          }
        }
      } catch {}

      const res = await fetch(`/api/graph?${queryParams.toString()}`, {
        headers,
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setRawNodes(json.data.nodes || []);
        setRawEdges(json.data.edges || []);
        setDbStatus(json.data.dbStatus || "connected");
        if (json.data.distinctProjects && onProjectsLoaded) {
          onProjectsLoaded(json.data.distinctProjects);
        }
      }
    } catch (e) {
      console.error("Failed to load real FalkorDB graph data:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedProject, persona, isGuest, workspaceOwner, userRole]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData, refreshTrigger, selectedProject, persona, isGuest, workspaceOwner, userRole]);

  // Dynamically recalculate temporal validity states
  useEffect(() => {
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Process Nodes
    const updatedNodes: Node[] = rawNodes.map((node) => {
      // Memory Node temporal validity evaluation
      if (node.type === "memory") {
        const details = (node.data?.details as any) || {};
        const validFrom = details.valid_from || details.validFrom || "2026-08-01";
        const validTo = details.valid_to || details.validTo || null;
        const status = details.status || node.data?.status;

        // 1. Explicitly superseded if status is superseded OR if validTo timestamp has arrived/passed as of date
        const isSupersededAtDate = Boolean(
          status === "superseded" || (validTo && validTo <= asOfDate)
        );

        // 2. Future only if not superseded and validFrom is in the future relative to asOfDate
        const isFutureAtDate = !isSupersededAtDate && Boolean(validFrom > asOfDate);

        // 3. Current if neither superseded nor future
        const isCurrentAtDate = !isSupersededAtDate && !isFutureAtDate;

        return {
          ...node,
          data: {
            ...node.data,
            isCurrentAtDate,
            isSupersededAtDate,
            isFutureAtDate,
          },
        };
      }

      return node;
    });

    // 2. Process Edges
    const updatedEdges: Edge[] = rawEdges.map((edge) => {
      const targetNode = updatedNodes.find((n) => n.id === edge.target);

      if (targetNode?.type === "memory") {
        const isCurrent = targetNode.data?.isCurrentAtDate;
        const isSuperseded = targetNode.data?.isSupersededAtDate;

        return {
          ...edge,
          label: isCurrent ? "Active" : isSuperseded ? "Superseded" : "Future",
          animated: Boolean(isCurrent),
          style: {
            stroke: isCurrent ? "#10B981" : isSuperseded ? "#D4D4D8" : "#FBBF24",
            strokeWidth: isCurrent ? 2 : 1,
            strokeDasharray: isCurrent ? undefined : isSuperseded ? "4 4" : "2 2",
          },
          labelStyle: {
            fontSize: 9.5,
            fill: isCurrent ? "#059669" : isSuperseded ? "#A1A1AA" : "#D97706",
            fontWeight: isCurrent ? 600 : 500,
          },
        };
      }

      return edge;
    });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [rawNodes, rawEdges, asOfDate, setNodes, setEdges]);

  // Compute live stats
  const stats = useMemo(() => {
    let active = 0;
    let superseded = 0;
    let future = 0;

    nodes.forEach((n) => {
      if (n.type === "memory") {
        if (n.data?.isCurrentAtDate) active++;
        else if (n.data?.isSupersededAtDate) superseded++;
        else if (n.data?.isFutureAtDate) future++;
      }
    });

    const memoryCount = nodes.filter((n) => n.type === "memory").length;

    return { active, superseded, future, totalMemories: memoryCount };
  }, [nodes]);

  const handleNodeClick = (_: any, node: Node) => {
    if (node.data?.details && onNodeClick) {
      onNodeClick(node.data.details);
    }
  };

  const isGraphEmpty = stats.totalMemories === 0;

  return (
    <div className="bg-card rounded-[14px] border border-border shadow-sm flex flex-col h-full min-h-[600px] overflow-hidden">
      {/* Visualizer Header */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-subtle/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center shadow-2xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
              Real FalkorDB Graph Visualizer
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Cloud Node</span>
            </span>
          </div>
        </div>

        {/* Dynamic Status Counter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {stats.active} Active
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
              {stats.superseded} Superseded
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              {stats.future} Future
            </span>
          </div>

          <button
            type="button"
            onClick={fetchGraphData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[11px] font-medium text-muted hover:text-foreground bg-white hover:bg-subtle rounded-[6px] border border-border transition shadow-2xs active:scale-[0.99]"
            title="Reload live FalkorDB graph"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full relative bg-[#FAFBFD]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          attributionPosition="bottom-left"
          className="bg-[#FAFBFD]"
        >
          <Controls showInteractive={false} className="bg-white border border-border shadow-xs rounded-[6px]" />
          {!isGraphEmpty && (
            <MiniMap
              nodeColor={(n) => {
                if (n.type === "project") return "#18181B";
                if (n.type === "person") return "#2563EB";
                if (n.data?.isCurrentAtDate) return "#10B981";
                if (n.data?.isSupersededAtDate) return "#A1A1AA";
                return "#F59E0B";
              }}
              maskColor="rgba(244, 244, 245, 0.7)"
              className="border border-border rounded-[6px] bg-white overflow-hidden shadow-xs"
            />
          )}
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E4E4E7" />
        </ReactFlow>

        {/* Time-Travel Indicator Banner */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-border rounded-[8px] px-3 py-1.5 text-[11px] shadow-xs flex items-center gap-2 z-10 flex-wrap">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted">As-Of State:</span>
          <span className="font-mono font-bold text-foreground bg-subtle px-1.5 py-0.5 rounded border border-border">
            {asOfDate}
          </span>
          {onAsOfDateChange && (
            <button
              type="button"
              onClick={() => onAsOfDateChange(new Date().toISOString().split("T")[0])}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-primary/10 hover:bg-primary text-primary hover:text-white transition text-[10px] font-semibold cursor-pointer border border-primary/20 shadow-2xs"
              title="Jump to today's date to view all active commitments"
            >
              <Sparkles className="w-3 h-3" />
              <span>Jump to Today</span>
            </button>
          )}
          {selectedProject !== "all" && (
            <>
              <span className="text-border">|</span>
              <span className="text-muted">Scope:</span>
              <span className="font-medium text-foreground bg-primary-soft/40 px-1.5 py-0.5 rounded border border-primary/20">
                {cleanProjectName(selectedProject)}
              </span>
            </>
          )}
        </div>

        {/* Empty State Overlay when no memories exist yet in FalkorDB */}
        {isGraphEmpty && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="bg-white/95 border border-border shadow-md rounded-[16px] p-8 max-w-md flex flex-col items-center">
              <div className="w-14 h-14 rounded-[14px] bg-primary-soft text-primary border border-primary/20 flex items-center justify-center mb-3.5 shadow-2xs">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                FalkorDB Graph Container Ready
              </h3>
              <p className="text-[12.5px] text-muted mt-2 mb-4 leading-relaxed">
                No commitments have been recorded yet for this project. Use the{" "}
                <span className="font-semibold text-foreground">Quick Capture</span> panel on the left to add your first verbal agreement, pricing decision, or deadline.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted bg-subtle px-3.5 py-1.5 rounded-full border border-border">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Nodes & edges will form automatically in real-time</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay (Only shown when graph has nodes) */}
        {!isGraphEmpty && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm border border-border rounded-[8px] p-2.5 text-[11px] shadow-xs flex items-center gap-3.5 z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-zinc-900" />
              <span className="text-zinc-700 font-medium">Project Hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-primary" />
              <span className="text-zinc-700 font-medium">Collaborator</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 font-medium">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-zinc-300" />
              <span className="text-zinc-500 line-through">Superseded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400" />
              <span className="text-amber-700 font-medium">Future</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
