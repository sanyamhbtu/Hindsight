"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDatasetSession } from "@/hooks/useDatasetSession";
import { Brain, Activity, MessageCircle } from "lucide-react";
import { entityColor, trustColor, trustBand } from "@/lib/entityTheme";

type GraphNode = { id: string; label: string; type: string; sourceFragment?: string; trust: number };
type GraphEdge = { source: string; target: string; relation: string };
type ActivityRun = { id: string; type: string; status: string; startedAt?: string; completedAt?: string; durationMs?: number };
type QuestionLog = { question: string; answer: string; timestamp: string; time: string };

export default function DashboardPage() {
  const router = useRouter();
  const { datasetName } = useDatasetSession();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<{ before: number, after: number, edgesBefore: number, edgesAfter: number } | null>(null);
  const [activity, setActivity] = useState<ActivityRun[]>([]);
  const [questions, setQuestions] = useState<QuestionLog[]>([]);
  const [health, setHealth] = useState<"ok" | "unreachable" | "checking">("checking");

  const handleImprove = async () => {
    if (!datasetName) return;
    setImproving(true);
    setImproveResult(null);
    try {
      const res = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetName })
      });
      if (res.ok) {
        const data = await res.json();
        setImproveResult({
          before: data.before?.nodes ?? stats.nodes,
          after: data.after?.nodes ?? stats.nodes,
          edgesBefore: data.before?.edges ?? stats.edges,
          edgesAfter: data.after?.edges ?? stats.edges,
        });
        setStats({ nodes: data.after?.nodes ?? stats.nodes, edges: data.after?.edges ?? stats.edges });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setImproving(false);
    }
  };

  useEffect(() => {
    fetch("/api/health").then(r => r.json()).then(d => setHealth(d.cognee === "ok" ? "ok" : "unreachable")).catch(() => setHealth("unreachable"));

    fetch("/api/session/recall").then(r => r.json()).then(d => setQuestions((d.logs || []).slice(-6).reverse())).catch(() => {});
  }, []);

  useEffect(() => {
    if (!datasetName) return;

    fetch(`/api/graph?dataset=${datasetName}`)
      .then(r => r.json())
      .then(d => {
        const graphNodes: GraphNode[] = d.nodes || [];
        setNodes(graphNodes);
        setStats({ nodes: graphNodes.length, edges: d.edges?.length || 0 });

        if (d.edges && d.nodes) {
          const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));

          const localInsights = d.edges.map((e: any) => {
            const subjectNode = nodeMap.get(e.source);
            const objectNode = nodeMap.get(e.target);
            return {
              subject: subjectNode?.label || e.source,
              subjectType: subjectNode?.type,
              subjectTrust: subjectNode?.trust,
              relation: e.relation,
              object: objectNode?.label || e.target,
              objectType: objectNode?.type,
              objectTrust: objectNode?.trust,
            };
          });
          setInsights(localInsights);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });

    fetch(`/api/activity?datasetName=${datasetName}`)
      .then(r => r.json())
      .then(d => setActivity((d.runs || []).slice(-6).reverse()))
      .catch(() => {});
  }, [datasetName]);

  const sourceCount = new Set(nodes.map(n => n.sourceFragment).filter(Boolean)).size;

  const typeCounts: Record<string, number> = {};
  nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  const maxTypeCount = Math.max(1, ...Object.values(typeCounts));

  const trustCounts = { high: 0, medium: 0, low: 0 };
  nodes.forEach(n => { trustCounts[trustBand(n.trust ?? 50)]++; });
  const maxTrustCount = Math.max(1, trustCounts.high, trustCounts.medium, trustCounts.low);

  return (
    <div className="p-8 sm:p-10 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.08em] text-black/40">
            Memory
            <span className={`flex items-center gap-1 normal-case tracking-normal rounded-full px-2 py-0.5 text-[11px] font-medium ${
              health === "ok" ? "bg-emerald-50 text-emerald-700" : health === "unreachable" ? "bg-red-50 text-red-700" : "bg-black/[0.04] text-black/40"
            }`}>
              <span className={`size-1.5 rounded-full ${health === "ok" ? "bg-emerald-500" : health === "unreachable" ? "bg-red-500" : "bg-black/30 animate-pulse"}`} />
              {health === "ok" ? "Backend online" : health === "unreachable" ? "Backend unreachable" : "Checking…"}
            </span>
          </div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em] text-[#0d0d0d]" style={{ fontFamily: "var(--font-geist)" }}>
            Dashboard
          </h1>
        </div>
        <button
          onClick={handleImprove}
          disabled={improving}
          className="flex items-center gap-2 rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] px-5 py-2.5 text-[14px] font-medium text-white shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {improving ? (
            <>
              <div className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Pruning network…
            </>
          ) : (
            <>
              <Brain className="size-4" />
              Improve memory
            </>
          )}
        </button>
      </div>

      {improveResult && (
        <div className="rounded-lg border border-black/[0.08] bg-white p-4 mb-8 font-mono text-[13px] text-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          Memory improved: {improveResult.before} → {improveResult.after} nodes, {improveResult.edgesBefore} → {improveResult.edgesAfter} edges
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Nodes" value={stats.nodes} sub="in graph" />
        <StatCard title="Edges" value={stats.edges} sub="connected" />
        <StatCard title="Sources" value={sourceCount} sub="ingested" />
        <StatCard title="Memory" value="Active" sub={`dataset: ${datasetName?.split('_').pop()?.substring(0, 8)}`} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-mono text-black/40 uppercase tracking-wider mb-4">Entity breakdown</div>
          <div className="flex flex-col gap-2.5">
            {Object.entries(typeCounts).length === 0 && <div className="text-black/30 text-[13px]">No entities yet.</div>}
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-black/70 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: entityColor(type) }} />
                  {type}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxTypeCount) * 100}%`, backgroundColor: entityColor(type) }} />
                  </div>
                  <span className="w-5 text-right font-mono text-[11px] text-black/50">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-mono text-black/40 uppercase tracking-wider mb-4">Trust distribution</div>
          <div className="flex flex-col gap-2.5">
            {[
              { label: "High (70+)", key: "high" as const, color: trustColor(80) },
              { label: "Medium (40–69)", key: "medium" as const, color: trustColor(55) },
              { label: "Low (<40)", key: "low" as const, color: trustColor(20) },
            ].map(({ label, key, color }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-black/70 flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${(trustCounts[key] / maxTrustCount) * 100}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-5 text-right font-mono text-[11px] text-black/50">{trustCounts[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-[18px] font-medium tracking-[-0.01em] text-[#0d0d0d] mb-4" style={{ fontFamily: "var(--font-geist)" }}>
        Relationship explorer
      </h2>
      <div className="bg-white border border-black/[0.08] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] mb-12">
        {loading ? (
          <div className="p-8 text-center text-black/40 animate-pulse font-mono text-sm">Extracting triplets...</div>
        ) : (
          <table className="w-full text-sm font-mono text-left">
            <thead className="bg-[#fafafa] text-black/40 border-b border-black/[0.08] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-4 w-[30%] font-medium">Subject</th>
                <th className="p-4 w-[20%] font-medium">Relation</th>
                <th className="p-4 w-[30%] font-medium">Object</th>
                <th className="p-4 w-[20%] font-medium">Trust</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((insight, i) => (
                <tr key={i} className="border-b border-black/[0.06] hover:bg-black/[0.02]">
                  <td className="p-4 text-[#0d0d0d]">
                    <span className="inline-flex items-center gap-1.5">
                      {insight.subjectType && <span className="size-1.5 rounded-full" style={{ backgroundColor: entityColor(insight.subjectType) }} />}
                      {insight.subject}
                    </span>
                  </td>
                  <td className="p-4 text-[#f35918] text-[10px] uppercase tracking-wide">{insight.relation || 'CONNECTED_TO'}</td>
                  <td className="p-4 text-[#0369a1]">
                    <span className="inline-flex items-center gap-1.5">
                      {insight.objectType && <span className="size-1.5 rounded-full" style={{ backgroundColor: entityColor(insight.objectType) }} />}
                      {insight.object}
                    </span>
                  </td>
                  <td className="p-4 text-[11px] text-black/40">
                    {typeof insight.subjectTrust === "number" && typeof insight.objectTrust === "number"
                      ? Math.round((insight.subjectTrust + insight.objectTrust) / 2)
                      : "—"}
                  </td>
                </tr>
              ))}
              {insights.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-black/40">No relationships found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-[#0d0d0d] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-geist)" }}>
            <Activity className="size-4 text-black/40" /> Ingestion activity
          </h2>
          <div className="bg-white border border-black/[0.08] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-black/[0.06]">
            {activity.length === 0 && <div className="p-5 text-center text-black/35 text-[13px]">No pipeline runs yet.</div>}
            {activity.map((run) => {
              const isError = /error|fail/i.test(run.status);
              const isRunning = /process|start/i.test(run.status);
              return (
                <div key={run.id} className="p-4 flex items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`size-1.5 rounded-full shrink-0 ${isError ? "bg-red-500" : isRunning ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                    <span className="text-[#0d0d0d] truncate">{run.type || "pipeline"}</span>
                  </div>
                  <span className="text-black/35 font-mono text-[11px] shrink-0">
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : run.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-[#0d0d0d] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-geist)" }}>
            <MessageCircle className="size-4 text-black/40" /> Recent questions
          </h2>
          <div className="bg-white border border-black/[0.08] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] divide-y divide-black/[0.06]">
            {questions.length === 0 && <div className="p-5 text-center text-black/35 text-[13px]">Nothing asked yet.</div>}
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => router.push(`/ask?q=${encodeURIComponent(q.question)}`)}
                className="w-full text-left p-4 flex items-center justify-between gap-3 text-[13px] hover:bg-black/[0.02] transition-colors"
              >
                <span className="text-[#0d0d0d] truncate">"{q.question}"</span>
                <span className="text-black/35 font-mono text-[11px] shrink-0">{q.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub }: any) {
  return (
    <div className="bg-white border border-black/[0.08] p-6 rounded-lg text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="text-[32px] font-medium tracking-[-0.02em] text-[#0d0d0d] mb-1" style={{ fontFamily: "var(--font-geist)" }}>{value}</div>
      <div className="text-[11px] font-mono text-black/50 uppercase tracking-wider">{title}</div>
      <div className="text-[10px] text-black/35 mt-1">{sub}</div>
    </div>
  );
}
