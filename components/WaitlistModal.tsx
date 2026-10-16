"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Sparkles, Mail, MessageSquare, Hash, Github, FileText, Video, CheckSquare, Check, Layers } from "lucide-react";

export interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const AVAILABLE_INTEGRATIONS: IntegrationOption[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Auto-extract commitments and approval threads from incoming client emails.",
    icon: "mail",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Export",
    description: "Ingest exported group or 1-on-1 chat logs to resolve verbal dispute claims.",
    icon: "message",
  },
  {
    id: "slack",
    name: "Slack Channels",
    description: "Listen to designated project channels for decisions and agreed deadlines.",
    icon: "hash",
  },
  {
    id: "github",
    name: "GitHub Issues & PRs",
    description: "Sync architectural agreements and feature approvals directly to the memory graph.",
    icon: "github",
  },
  {
    id: "notion",
    name: "Notion Workspaces",
    description: "Parse project specification docs and meeting notes into temporal memory nodes.",
    icon: "notion",
  },
  {
    id: "zoom",
    name: "Google Meet & Zoom",
    description: "Extract promises and action items straight from automated meeting transcripts.",
    icon: "video",
  },
  {
    id: "linear",
    name: "Linear & Jira",
    description: "Track task assignments and commitment scope shifts across sprint lifecycles.",
    icon: "linear",
  },
];

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string | null;
}

export default function IntegrationsModal({ isOpen, onClose, initialService }: IntegrationsModalProps) {
  // Support Multi-Platform Selection
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialService ? [initialService] : ["gmail", "slack"]
  );
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedServices.length === AVAILABLE_INTEGRATIONS.length) {
      setSelectedServices(["gmail"]);
    } else {
      setSelectedServices(AVAILABLE_INTEGRATIONS.map((i) => i.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && selectedServices.length > 0) {
      setSubmitted(true);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "mail": return <Mail className="w-4 h-4 text-blue-600" />;
      case "message": return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case "hash": return <Hash className="w-4 h-4 text-amber-600" />;
      case "github": return <Github className="w-4 h-4 text-zinc-800" />;
      case "notion": return <FileText className="w-4 h-4 text-zinc-700" />;
      case "video": return <Video className="w-4 h-4 text-indigo-600" />;
      case "linear": return <CheckSquare className="w-4 h-4 text-purple-600" />;
      default: return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const selectedNames = AVAILABLE_INTEGRATIONS.filter((i) =>
    selectedServices.includes(i.id)
  ).map((i) => i.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-[620px] bg-white rounded-[12px] border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-[#F8F9FA]">
          <div>
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>Automated Ingestion Integrations</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary-soft text-primary border border-primary/20">
                Coming Soon
              </span>
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Connect multiple communication channels to feed the FalkorDB memory graph continuously.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-muted hover:text-foreground p-1.5 rounded-[6px] hover:bg-subtle transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!submitted ? (
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Select Platforms to Connect ({selectedServices.length} Selected):
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {selectedServices.length === AVAILABLE_INTEGRATIONS.length
                    ? "Reset Selection"
                    : "Select All Platforms"}
                </button>
              </div>

              {/* Multi-Select Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_INTEGRATIONS.map((item) => {
                  const isChecked = selectedServices.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleService(item.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-[8px] border text-left transition select-none ${
                        isChecked
                          ? "border-primary bg-primary-soft/40 shadow-sm"
                          : "border-border bg-white hover:bg-subtle hover:border-border-strong opacity-75"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-[6px] bg-white border border-border flex items-center justify-center shrink-0">
                        {renderIcon(item.icon)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-foreground leading-tight truncate">
                          {item.name}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition ${
                          isChecked
                            ? "bg-primary border-primary text-white"
                            : "border-border bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Platforms Cross-Correlation Summary */}
            <div className="p-3.5 rounded-[8px] bg-subtle border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-white border border-border flex items-center justify-center shrink-0 mt-0.5 text-primary">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[12.5px] font-semibold text-foreground flex items-center justify-between">
                  <span>Cross-Channel Coordination Pipeline</span>
                  <span className="text-[10.5px] font-mono text-primary font-bold">
                    {selectedServices.length} Source Channels
                  </span>
                </h4>
                <p className="text-[11.5px] text-muted mt-1 leading-relaxed">
                  FalkorDB automatically correlates agreements made across{" "}
                  <strong className="text-foreground">{selectedNames.slice(0, 3).join(", ")}</strong>
                  {selectedNames.length > 3 ? ` and ${selectedNames.length - 3} others` : ""} into a single bi-temporal memory graph.
                </p>
              </div>
            </div>

            {/* Email Input */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Email Address for Multi-Platform Early Access
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-[8px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-[13px] font-medium text-muted hover:text-foreground rounded-[8px] border border-border bg-subtle hover:bg-subtle/80 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-hover rounded-[8px] transition shadow-sm active:scale-[0.99]"
                >
                  Request Early Access ({selectedServices.length} Platforms)
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 px-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-[16px] font-semibold text-foreground">
              You are on the list!
            </h4>
            <p className="text-[12.5px] text-muted mt-1 max-w-[440px] mx-auto leading-relaxed">
              We registered your interest for automated ingestion across{" "}
              <strong className="text-foreground">{selectedNames.join(", ")}</strong>. You will receive an invitation when private beta opens.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-5 px-4 py-2 text-[13px] font-medium text-white bg-primary hover:bg-primary-hover rounded-[8px] transition shadow-sm active:scale-[0.99]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
