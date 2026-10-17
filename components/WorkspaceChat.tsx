"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Sparkles, Send, Bot, User, RefreshCw } from "lucide-react";

interface WorkspaceChatProps {
  currentUser?: any;
  selectedProject?: string;
  persona?: string;
  refreshTrigger?: number;
  workspaceOwner?: string | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  followUps?: string[];
}

const SAMPLE_PROMPTS = [
  "What is the total agreed budget across projects?",
  "Which commitments or decisions are superseded?",
  "Who is responsible for current tasks and deliverables?",
  "Who is the owner of Agent Memory Core?",
];

const INITIAL_AI_MESSAGE: ChatMessage = {
  id: "1",
  sender: "ai",
  text: "Hello! I am your Matters AI Workspace Coordinator. I have live access to this workspace's FalkorDB bi-temporal memory graph. How can I assist you regarding project owners, contributors, commitments, or budgets?",
  time: "Now",
  followUps: [
    "What is the total agreed budget across projects?",
    "Which commitments or decisions are superseded?",
    "Who is the owner of Agent Memory Core?",
  ],
};

export default function WorkspaceChat({
  currentUser = null,
  selectedProject = "all",
  persona = "aris",
  refreshTrigger = 0,
  workspaceOwner = null,
}: WorkspaceChatProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_AI_MESSAGE]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Temporary chat: reset when user signs out, switches persona, or triggers reload
  useEffect(() => {
    setMessages([INITIAL_AI_MESSAGE]);
  }, [currentUser?.uid, persona]);

  // Constrain auto-scroll to the internal chat container only when new messages are added,
  // NEVER scrolling the browser window viewport.
  useEffect(() => {
    if (messages.length > 1 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsSending(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (!currentUser) {
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
        const stored = localStorage.getItem("matters_deleted_projects");
        if (stored) deletedList = JSON.parse(stored);
      } catch {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text.trim(),
          activeProject: selectedProject,
          persona: persona || "aris",
          deletedProjects: deletedList,
        }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: data.answer || "I apologize, I could not process your query at this moment.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        followUps: Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [],
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "ai",
          text: "Network error communicating with the FalkorDB memory assistant agent.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-card rounded-[14px] border border-border shadow-sm flex flex-col h-[440px] overflow-hidden justify-between">
      {/* Header */}
      <div className="px-4 py-2.5 bg-subtle/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground tracking-tight flex items-center gap-2">
              <span>Matters Workspace AI Assistant</span>
              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                FalkorDB Context-Aware
              </span>
            </h3>
            <p className="text-[10.5px] text-muted">
              Ask anything regarding workspace context, commitments, budget, or timeline
            </p>
          </div>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 flex flex-col p-3.5 space-y-2 overflow-hidden justify-between">
        {/* Preset Prompts with ample spacing and hidden scrollbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 mb-1 text-[11.5px] shrink-0 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <span className="text-muted font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Suggestions:</span>
          </span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1 rounded-full bg-subtle hover:bg-primary-soft/40 border border-border text-foreground hover:border-primary/50 text-[11px] transition whitespace-nowrap active:scale-[0.99] cursor-pointer shadow-2xs shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-[140px] overflow-y-auto space-y-2.5 p-3 rounded-[10px] bg-[#FAFBFD] border border-border"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "ai" && (
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12px] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-white"
                    : "bg-white text-foreground border border-border shadow-2xs whitespace-pre-line"
                }`}
              >
                <p>{msg.text}</p>

                {/* Interactive Clickable Follow-up Question Chips */}
                {msg.sender === "ai" && msg.followUps && msg.followUps.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/70 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-primary">
                      <Sparkles className="w-3 h-3" />
                      <span>Suggested follow-ups (click to place in input):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.followUps.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          disabled={isSending}
                          onClick={() => {
                            setInputMessage(q);
                            const el = document.getElementById("workspace-chat-input") as HTMLInputElement | null;
                            if (el) {
                              el.focus();
                              el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                            }
                          }}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-subtle hover:bg-primary-soft/60 border border-border hover:border-primary/40 text-foreground transition active:scale-[0.98] cursor-pointer shadow-2xs text-left"
                          title="Click to place question into input box"
                        >
                          <span className="text-primary font-bold text-[10px]">💬</span>
                          <span className="group-hover:text-primary transition-colors">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <span
                  className={`block text-[9.5px] mt-1 text-right ${
                    msg.sender === "user" ? "text-primary-soft/80" : "text-muted font-mono"
                  }`}
                >
                  {msg.time}
                </span>
              </div>

              {msg.sender === "user" && (
                <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex gap-2.5 justify-start animate-in fade-in duration-200">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] shadow-2xs">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-white text-foreground border border-border rounded-[10px] px-3.5 py-2.5 text-[12px] shadow-2xs flex items-center gap-2.5">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                </div>
                <span className="text-muted text-[11px] font-medium">
                  Gemini Flash is analyzing FalkorDB memory graph & reasoning...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputMessage);
          }}
          className="flex items-center gap-2 shrink-0 pt-0.5"
        >
          <input
            id="workspace-chat-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask any question about this workspace, commitments, budget..."
            className="flex-1 px-3.5 py-2 text-[12px] bg-white border border-border rounded-[8px] focus:outline-none focus:border-primary shadow-2xs"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition active:scale-[0.99] shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
