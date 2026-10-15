"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { GraduationCap, Briefcase, Hammer, Building2, UserCheck, ShieldCheck, Clock, CheckCircle2, History } from "lucide-react";

// 1. Person Node Component
export const PersonNode = memo(({ data }: any) => {
  const getIcon = () => {
    switch (data.roleId) {
      case "project_node":
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case "supervisor":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case "student":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case "freelancer":
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case "contractor":
        return <Hammer className="w-4 h-4 text-amber-600" />;
      default:
        return <UserCheck className="w-4 h-4 text-foreground" />;
    }
  };

  const isActivePersona = data.isActivePersona;

  return (
    <div
      className={`bg-white rounded-[10px] px-3.5 py-2.5 shadow-sm min-w-[200px] text-left transition-all ${
        data.roleId === "project_node"
          ? "border-2 border-blue-500 bg-blue-50/20 shadow-md ring-2 ring-blue-500/10"
          : isActivePersona
          ? "border-2 border-primary ring-2 ring-primary/20 bg-primary-soft/10 shadow-md"
          : "border border-border hover:border-primary/50"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2.5">
        <div
          className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 ${
            data.roleId === "project_node"
              ? "bg-blue-100 text-blue-700"
              : isActivePersona
              ? "bg-primary text-white"
              : "bg-primary-soft"
          }`}
        >
          {isActivePersona && data.roleId !== "project_node" ? <ShieldCheck className="w-4 h-4 text-white" /> : getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className="font-semibold text-foreground text-[12.5px] leading-tight truncate">
              {data.name}
            </h4>
            {isActivePersona && data.roleId !== "project_node" && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary text-white font-bold">
                Active
              </span>
            )}
            {data.roleId === "project_node" && (
              <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold uppercase">
                Project
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted block mt-0.5 truncate">
            {data.role}
          </span>
          {data.subtitle && (
            <span className="text-[9.5px] font-mono text-blue-600 block mt-0.5 truncate font-medium">
              {data.subtitle}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
});
PersonNode.displayName = "PersonNode";

// 2. Workspace Root & Project Hub Node
export const ProjectNode = memo(({ data }: any) => {
  return (
    <div className="bg-white border-2 border-primary rounded-[14px] px-5 py-3.5 shadow-md min-w-[240px] max-w-[320px] text-center transition-all hover:shadow-lg">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-primary">
          Workspace Hub
        </span>
      </div>
      <h3 className="font-bold text-[14px] text-foreground tracking-tight">
        {data.title || "Workspace"}
      </h3>
      <p className="text-[10.5px] font-mono text-muted mt-0.5 truncate">
        {data.description || "FalkorDB Graph Container"}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2.5 !h-2.5" />
    </div>
  );
});
ProjectNode.displayName = "ProjectNode";

function formatAmount(amount: any, text: string = "") {
  if (amount === null || amount === undefined || amount === "") return null;
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  const lower = String(text).toLowerCase();
  if (lower.includes("rm") || lower.includes("myr") || lower.includes("ringgit")) {
    return `RM ${num.toLocaleString()}`;
  }
  if (lower.includes("$") || lower.includes("usd") || lower.includes("dollar")) {
    return `$${num.toLocaleString()}`;
  }
  if (lower.includes("borang") || lower.includes("form") || lower.includes("letter") || lower.includes("unit")) {
    return `${num} units`;
  }
  return `$${num.toLocaleString()}`;
}

// 3. Dynamic Bi-Temporal Memory Node
export const MemoryNode = memo(({ data }: any) => {
  const isCurrent = data.isCurrentAtDate;
  const isFuture = data.isFutureAtDate;
  const isSuperseded = data.isSupersededAtDate;

  // Visual status based on temporal slider
  let statusBadge = "Active";
  let statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold";
  let cardStyle =
    "bg-white border-emerald-500 shadow-sm opacity-100 ring-2 ring-emerald-500/20 hover:scale-[1.02] cursor-pointer";

  if (isSuperseded) {
    statusBadge = "Superseded";
    statusBadgeStyle = "bg-zinc-100 text-zinc-500 border-zinc-200 font-medium";
    cardStyle =
      "bg-[#FBFBFB] border-zinc-300 opacity-60 text-zinc-500 hover:opacity-90 hover:scale-[1.01] cursor-pointer";
  } else if (isFuture) {
    statusBadge = "Not Yet Valid";
    statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-300 font-medium";
    cardStyle =
      "bg-amber-50/20 border-dashed border-amber-300 opacity-50 text-zinc-600 hover:opacity-85 hover:scale-[1.01] cursor-pointer";
  }

  return (
    <div
      className={`rounded-[10px] p-3 border transition-all duration-300 min-w-[210px] max-w-[230px] text-left select-none ${cardStyle}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted !w-2 !h-2" />

      {/* Header with Category & Temporal Status Badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-muted border border-border">
          {data.category}
        </span>
        <span className={`text-[9.5px] font-semibold uppercase px-1.5 py-0.5 rounded border ${statusBadgeStyle}`}>
          {isCurrent ? "✓ Current (Active)" : isSuperseded ? "✗ Superseded (Archived)" : "⏳ Pending (Future)"}
        </span>
      </div>

      {/* Commitment Text */}
      <p
        className={`text-[11.5px] leading-snug line-clamp-2 ${
          isSuperseded ? "line-through text-zinc-400" : isFuture ? "text-zinc-500 italic" : "font-medium text-foreground"
        }`}
      >
        {data.text}
      </p>

      {/* Metrics Row (Validity Range & Amount) */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/60 text-[10px] font-mono text-muted">
        <span className="truncate max-w-[125px]">
          {isSuperseded
            ? `Superseded`
            : isFuture
            ? `Pending (${data.validRange})`
            : data.validRange || "Active"}
        </span>
        {data.amount !== null && data.amount !== undefined && data.amount !== "" && (
          <span className={`font-bold ${isCurrent ? "text-primary text-[11px]" : "text-muted"}`}>
            {formatAmount(data.amount, data.text)}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted !w-2 !h-2" />
    </div>
  );
});
MemoryNode.displayName = "MemoryNode";
