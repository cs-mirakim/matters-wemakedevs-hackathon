"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  Database,
  GitBranch,
  ShieldAlert,
  Zap,
  Code2,
  CheckCircle2,
  Share2,
  ExternalLink,
  Award,
} from "lucide-react";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-500/20 antialiased">
      {/* Sticky Reader Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-blue-600 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Live Workspace</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold font-mono">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              FalkorDB Graph Hacks 2026
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold shadow-xs transition"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Launch App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Article */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Article Header */}
        <article className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-[11.5px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Technical Deep Dive & Architecture Case Study</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.18]">
              Why Vector Databases Can't Remember: Building Git for Agent Memory with FalkorDB
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              How bi-temporal graph structures solve the silent crisis of "Temporal Amnesia" in autonomous AI agents and collaborative human teams.
            </p>

            {/* Author & Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 text-[13px] text-slate-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  AH
                </div>
                <div>
                  <p className="font-semibold text-slate-900 leading-tight">
                    Muhammad Amir Hakim
                  </p>
                  <p className="text-[12px] text-slate-500">
                    Solo Developer • Matters Creator
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>October 2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>7 min read</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Banner / Highlight Box */}
          <div className="rounded-[18px] bg-gradient-to-br from-[#0A192F] via-[#0E2849] to-[#061220] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="text-[11px] font-mono uppercase tracking-widest text-blue-400 font-semibold">
                Core Philosophy
              </div>
              <blockquote className="text-xl sm:text-2xl font-semibold leading-snug text-slate-100">
                “Developers have Git to track code mutations across branches. But for AI agents and distributed teams making commitments across chat, email, and meetings—there has been no version control. <span className="text-blue-400">Matters is Git for commitments</span>.”
              </blockquote>
            </div>
          </div>

          {/* Body Sections */}
          <div className="space-y-10 text-[15.5px] leading-[1.8] text-slate-700">
            
            {/* Section 1: The Trap */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded bg-blue-600" />
                <span>1. The "Temporal Amnesia" Trap of Vector RAG</span>
              </h2>
              <p>
                Over the last two years, every AI engineer built autonomous agents using the same architectural blueprint: <strong>Vector Search + Large Language Model</strong>.
              </p>
              <p>
                You chunk text documents, embed them into high-dimensional vectors, and retrieve top-k snippets by cosine similarity. It feels magical until the real world happens: <strong>time passes, requirements change, and people renegotiate.</strong>
              </p>
              
              <div className="p-4 rounded-[12px] bg-red-50/70 border border-red-200 text-red-950 space-y-2">
                <div className="font-semibold flex items-center gap-2 text-[14px] text-red-900">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>The Real-World Failure Scenario:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-red-900/90 leading-relaxed">
                  <li><strong>August 1st:</strong> Designer commits in Slack: <em>"I will deliver 3 dashboard mockups for RM500 by next week."</em></li>
                  <li><strong>August 15th:</strong> Client expands scope: <em>"We need 8 interactive viewports instead, new budget agreed at RM850."</em></li>
                </ul>
              </div>

              <p>
                When an AI agent or project manager asks: <em>"What is the approved budget for the dashboard?"</em>, vector search calculates similarity. Both chunks match 94% on the terms <em>"dashboard"</em>, <em>"mockups"</em>, and <em>"budget"</em>. The LLM retrieves both, blends them, and either hallucinates or gives you an outdated answer.
              </p>
              <p>
                Vector databases have <strong>zero native understanding of temporal validity</strong> (<code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 text-[13px] font-mono">valid_from</code> versus <code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 text-[13px] font-mono">valid_to</code>). They see semantic proximity, not chronological truth.
              </p>
            </section>

            {/* Section 2: Why FalkorDB is Load-Bearing */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded bg-blue-600" />
                <span>2. Why FalkorDB is Load-Bearing (Not Just Decorative)</span>
              </h2>
              <p>
                When building <strong>Matters</strong> for the FalkorDB Graph Hacks 2026, I established a strict foundational rule:
                <em className="block my-2 pl-4 border-l-2 border-blue-500 font-semibold text-slate-900">
                  If you remove FalkorDB from this application, the product ceases to exist.
                </em>
              </p>
              <p>
                Relational SQL databases choke on recursive multi-hop traversals across historical lineages. Vector stores discard relationships altogether. FalkorDB, powered by sparse matrix linear algebra (GraphBLAS), allows us to traverse deeply nested team networks, persona assignments, and temporal validity intervals with sub-millisecond latency.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-[12px] bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[14px] text-slate-900">Sub-ms Traversals</h4>
                  <p className="text-[12.5px] text-slate-500 leading-normal">
                    FalkorDB evaluates thousands of nodes and bi-temporal intervals instantly using GraphBLAS matrix algorithms.
                  </p>
                </div>

                <div className="p-4 rounded-[12px] bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-[8px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[14px] text-slate-900">Atomic Superseding</h4>
                  <p className="text-[12.5px] text-slate-500 leading-normal">
                    Cypher transactions close old promises and create new versions in a single atomic ACID guarantee.
                  </p>
                </div>

                <div className="p-4 rounded-[12px] bg-white border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[14px] text-slate-900">Point-in-Time Travel</h4>
                  <p className="text-[12.5px] text-slate-500 leading-normal">
                    Instantly reconstruct the exact commitments that were active as of any past calendar date.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: The Cypher Deep Dive */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded bg-blue-600" />
                <span>3. Deep Dive: The Cypher Patterns that Power Matters</span>
              </h2>
              <p>
                Here is the exact Cypher pattern used in Matters to implement <strong>Git-like Atomic Superseding</strong>. When a new commitment is confirmed, earlier promises are atomically closed without mutating historical records:
              </p>

              {/* Code Snippet Box */}
              <div className="rounded-[14px] bg-[#0A192F] border border-slate-800 text-slate-100 p-4 sm:p-5 font-mono text-[12.5px] overflow-x-auto shadow-md">
                <div className="text-[11px] text-blue-400 font-semibold mb-2 uppercase tracking-wider">
                  Cypher Query 1: Atomic Supersede (Write)
                </div>
                <pre className="text-slate-200 leading-relaxed">
{`// Step 1: Find active overlapping promises and close them
MATCH (p:Person)-[r]->(old)
WHERE (old:Promise OR old:Decision OR old:Task)
  AND old.project = $project
  AND (old.status = 'current' OR r.valid_to IS NULL)
  AND toLower(trim(p.name)) = toLower(trim($personName))
SET r.valid_to = $validFrom, 
    old.valid_to = $validFrom, 
    old.status = 'superseded';

// Step 2: Create new version with active validity
MERGE (p:Person {name: $personName})
CREATE (pr:Promise {
  text: $text,
  amount: $amount,
  project: $project,
  valid_from: $validFrom,
  valid_to: null,
  status: 'current',
  source_id: $sourceId
})
CREATE (p)-[r:MADE_PROMISE {
  valid_from: $validFrom,
  valid_to: null,
  source_id: $sourceId
}]->(pr)
RETURN pr;`}
                </pre>
              </div>

              <p>
                And when a user scrubs the <strong>Time Travel slider</strong> in the UI, FalkorDB executes a point-in-time slice query to evaluate active nodes as of that date:
              </p>

              <div className="rounded-[14px] bg-[#0A192F] border border-slate-800 text-slate-100 p-4 sm:p-5 font-mono text-[12.5px] overflow-x-auto shadow-md">
                <div className="text-[11px] text-emerald-400 font-semibold mb-2 uppercase tracking-wider">
                  Cypher Query 2: Point-in-Time Evaluation (Read)
                </div>
                <pre className="text-slate-200 leading-relaxed">
{`MATCH (p:Person)-[r]->(m)
WHERE r.valid_from <= $asOfDate
  AND (r.valid_to IS NULL OR r.valid_to > $asOfDate)
RETURN p.name AS personName, 
       type(r) AS relType, 
       m.text AS text, 
       m.amount AS amount, 
       m.status AS status
ORDER BY r.valid_from DESC;`}
                </pre>
              </div>
            </section>

            {/* Section 4: What I Learned */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded bg-blue-600" />
                <span>4. What I Learned Building on FalkorDB Cloud</span>
              </h2>
              <p>
                Coming from traditional relational and document databases, adopting FalkorDB provided several eye-opening insights:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-[10px] bg-white border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-[14px] text-slate-900">Cypher is Unreasonably Expressive for Time</h4>
                    <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">
                      Expressing relationship intervals with <code className="px-1 py-0.2 bg-slate-100 font-mono text-xs">valid_from</code> and <code className="px-1 py-0.2 bg-slate-100 font-mono text-xs">valid_to</code> properties directly on the edges made bi-temporal reasoning intuitive and eliminated 5-table SQL joins.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[10px] bg-white border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-[14px] text-slate-900">Redis Protocol Compatibility is a Superpower</h4>
                    <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">
                      Because FalkorDB speaks the Redis protocol, connection pooling in Next.js Serverless routes was remarkably fast. Responses consistently clocked in under 15ms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[10px] bg-white border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-[14px] text-slate-900">Visual Provenance Eliminates AI Hallucinations</h4>
                    <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">
                      Users don't trust black-box AI answers. Giving judges and users a direct visual graph where every commitment links to its author and Cypher query created instant confidence.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Constructive Feedback */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-6 rounded bg-blue-600" />
                <span>5. Constructive Feedback for the FalkorDB Team</span>
              </h2>
              <p>
                To make FalkorDB even more dominant in the agentic AI era, here are two high-impact areas I would love to see in future releases:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[14.5px]">
                <li>
                  <strong>Native Bi-Temporal / Time-Series Syntax:</strong> Introducing first-class syntax sugar like <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-xs text-blue-700">AS OF DATE "2026-08-01"</code> directly into FalkorDB Cypher would make temporal tracking effortless for all developers.
                </li>
                <li>
                  <strong>Official TypeScript / Next.js SDK Wrapper:</strong> While the community client works well, an official TypeScript SDK with automatic connection resilience for Vercel Serverless Edge environments would be a game-changer.
                </li>
              </ul>
            </section>

            {/* Call to Action Footer */}
            <section className="p-6 sm:p-8 rounded-[18px] bg-blue-50 border border-blue-200 text-center space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold text-blue-950">
                Experience the Live Bi-Temporal Graph
              </h3>
              <p className="text-slate-600 max-w-xl mx-auto text-[14px]">
                Explore the interactive sandbox with 4 synthetic personas, test time-travel queries, and watch atomic Cypher superseding live.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13.5px] shadow-sm transition"
                >
                  Open Live Sandbox Workspace
                </Link>
                <a
                  href="https://github.com/cs-mirakim/matters-wemakedevs-hackathon"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-[10px] bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-[13.5px] shadow-2xs transition inline-flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4 text-slate-500" />
                  <span>View Source Code on GitHub</span>
                </a>
              </div>
            </section>

          </div>
        </article>
      </main>
    </div>
  );
}
