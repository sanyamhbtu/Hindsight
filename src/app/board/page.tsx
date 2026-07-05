"use client";

import { useState, useEffect, useRef } from "react";
import type { GraphNode, GraphEdge } from "@/components/EvidenceBoard";
import dynamic from 'next/dynamic';

const EvidenceBoard = dynamic(() => import('@/components/EvidenceBoard'), { 
  ssr: false,
  loading: () => <div>Loading graph...</div>
});
import MemoryControls from "@/components/MemoryControls";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDatasetSession } from "@/hooks/useDatasetSession";
import { motion, AnimatePresence } from "framer-motion";
import { entityColor, trustColor } from "@/lib/entityTheme";

export default function BoardPage() {
  const router = useRouter();
  const { datasetName } = useDatasetSession();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [forgetComparison, setForgetComparison] = useState<{ query: string, before: string, after: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Status check state
  const [cognifyStatus, setCognifyStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [lastCognified, setLastCognified] = useState<string>("Never");
  const [liveStats, setLiveStats] = useState({ nodes: 0, edges: 0 });
  const [showRestoredToast, setShowRestoredToast] = useState(false);

  const fetchGraph = async () => {
    if (!datasetName) return;
    try {
      const res = await fetch(`/api/graph?dataset=${datasetName}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      }
    } catch (error) {
      console.error("Error fetching graph:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datasetName) {
      fetchGraph();
      
      // MEMORY RESTORED toast
      const remembered = localStorage.getItem(`remembered_${datasetName}`);
      if (remembered) {
        setShowRestoredToast(true);
        setTimeout(() => setShowRestoredToast(false), 3000);
      }
      localStorage.setItem(`remembered_${datasetName}`, "true");

      // Polling for stats
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/graph?dataset=${datasetName}`);
          if (res.ok) {
            const data = await res.json();
            setLiveStats({ nodes: data.nodes?.length || 0, edges: data.edges?.length || 0 });
            // If the board was empty but now has data (e.g. from background ingest), fetch graph
            if (nodes.length === 0 && data.nodes?.length > 0) {
              fetchGraph();
            }
          }
        } catch (e) {}
      }, 5000);
      
      return () => clearInterval(pollInterval);
    }
  }, [datasetName, nodes.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/'
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Toggle shortcuts on '?' (only if not typing in an input)
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT') {
        setShowShortcuts(prev => !prev);
      }
      // Submit on Cmd+Enter or Ctrl+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (question.trim()) {
          router.push(`/ask?q=${encodeURIComponent(question)}`);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, router]);

  // Poll for cognify status if we know it's processing
  useEffect(() => {
    if (cognifyStatus !== 'processing' || !datasetName) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?dataset=${datasetName}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'done') {
            setCognifyStatus('done');
            setLastCognified("Just now");
            fetchGraph(); // Auto-refresh graph
          } else if (data.status === 'error') {
            setCognifyStatus('idle'); // Should handle error state, keeping simple for now
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [cognifyStatus, datasetName]);

  // When coming back to the board after ingest, we might need to start polling
  // This could be passed via router state or context, but for now we'll just check status once on mount
  useEffect(() => {
    if (datasetName) {
      fetch(`/api/status?dataset=${datasetName}`).then(res => res.json()).then(data => {
        if (data.status === 'processing') {
          setCognifyStatus('processing');
        }
      }).catch(() => {});
    }
  }, [datasetName]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      router.push(`/ask?q=${encodeURIComponent(question)}`);
    }
  };

  const handleMemify = async () => {
    // Left as placeholder - not currently in the spec's demo flow but good for extension
  };

  const handleForget = async () => {
    if (selectedNode) {
      setNodes(nodes.filter(n => n.id !== selectedNode.id));
      setEdges(edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    } else {
      try {
        const lastQuery = localStorage.getItem("chow_last_query") || "Where is Doug?";
        const lastAnswer = localStorage.getItem("chow_last_answer") || "Doug is on the roof of Caesar's Palace.";
        
        const res = await fetch(`/api/forget-all`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datasetName })
        });
        
        if (res.ok) {
          setNodes([]);
          setEdges([]);
          
          setTimeout(async () => {
            try {
              const askRes = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: lastQuery, datasetName, searchType: "GRAPH_COMPLETION" })
              });
              const askData = await askRes.json();
              
              setForgetComparison({
                query: lastQuery,
                before: lastAnswer,
                after: askData.graph?.answer || "I have no information about this topic."
              });
            } catch (e) {
              setForgetComparison({
                query: lastQuery,
                before: lastAnswer,
                after: "I have no information about this topic."
              });
            }
          }, 1500);
        }
      } catch (err) {
        console.error("Error forgetting dataset:", err);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] relative">
      {/* Header Bar */}
      <header className="flex-none h-16 border-b border-black/[0.08] bg-white/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div
          className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-[#0d0d0d] cursor-pointer"
          style={{ fontFamily: "var(--font-geist)" }}
          onClick={() => router.push("/")}
        >
          <img src="/chow-icon.svg" alt="" className="size-[18px]" />
          CHOW
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-black/40">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cognifyStatus === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            Memory: {cognifyStatus === 'processing' ? 'processing' : 'active'}
          </div>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">{liveStats.nodes || nodes.length} nodes</span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">{liveStats.edges || edges.length} edges</span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">Last cognified: {lastCognified}</span>
          <span className="hidden lg:inline">·</span>
          <span className="hidden lg:inline opacity-60">{datasetName}</span>
        </div>

        {/* RESTORED TOAST */}
        <AnimatePresence>
          {showRestoredToast && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-50 border border-emerald-300 text-emerald-700 px-4 py-1 text-xs font-mono tracking-widest rounded-full shadow-xl"
            >
              MEMORY RESTORED
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Board Area */}
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-medium tracking-[-0.02em] text-black/50 animate-pulse" style={{ fontFamily: "var(--font-geist)" }}>
            Connecting the dots…
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-2xl font-medium tracking-[-0.02em] text-black/50" style={{ fontFamily: "var(--font-geist)" }}>
            <div>The Wolf Pack's memory is blank.</div>
            <button
              onClick={() => router.push("/")}
              className="mt-4 text-[14px] font-medium rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] text-white px-6 py-2.5 shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity hover:opacity-90"
            >
              Add evidence
            </button>
          </div>
        ) : (
          <EvidenceBoard
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNode?.id}
            onNodeClick={(node) => setSelectedNode(node)}
            onBackgroundClick={() => setSelectedNode(null)}
          />
        )}

        {/* Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="absolute top-4 left-4 z-40 w-64 bg-white border border-black/[0.08] rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.1)] overflow-hidden"
            >
              <div className="h-1 w-full" style={{ backgroundColor: entityColor(selectedNode.type) }} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                      style={{ color: entityColor(selectedNode.type) }}
                    >
                      {selectedNode.type}
                    </div>
                    <div className="text-[15px] font-medium text-[#0d0d0d] leading-tight">{selectedNode.label}</div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-black/30 hover:text-black shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {typeof selectedNode.trust === "number" && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-black/40 mb-1">
                      <span>Trust score</span>
                      <span className="font-mono">{Math.round(selectedNode.trust)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(selectedNode.trust)}%`, backgroundColor: trustColor(selectedNode.trust) }}
                      />
                    </div>
                  </div>
                )}

                {selectedNode.sourceFragment && (
                  <div className="pt-3 border-t border-black/[0.06]">
                    <div className="text-[11px] text-black/40 mb-1">Source</div>
                    <div className="text-[12px] font-mono text-black/60 truncate">{selectedNode.sourceFragment}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Bottom Question Input */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-6">
          <form onSubmit={handleAsk} className="relative">
            <div className="absolute -top-6 left-4 text-[11px] font-medium uppercase tracking-[0.08em] text-black/40">
              What do you need to know?
            </div>
            <div className="relative rounded-[10px] border border-[#e6e6e5] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Where's Doug?"
                className="w-full bg-transparent px-4 py-3 text-[#0d0d0d] text-[15px] focus:outline-none placeholder-black/30 relative z-10"
              />
              <button
                type="submit"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] text-white shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity hover:opacity-90 relative z-10 mr-1"
              >
                <Search className="size-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Forget Comparison Panel */}
        <AnimatePresence>
          {forgetComparison && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="absolute bottom-0 left-0 w-full bg-white border-t border-black/[0.08] p-8 z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] flex flex-col items-center"
            >
              <div className="max-w-4xl w-full">
                <h3 className="text-[#0d0d0d] font-medium tracking-[-0.01em] text-xl mb-6 text-center" style={{ fontFamily: "var(--font-geist)" }}>
                  "{forgetComparison.query}"
                </h3>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 bg-[#fafafa] p-6 border border-black/[0.08] rounded-lg">
                    <div className="text-[11px] font-mono text-black/40 mb-4 uppercase tracking-wide">Before forget</div>
                    <div className="text-[#0d0d0d] text-[15px] leading-relaxed">{forgetComparison.before}</div>
                  </div>
                  <div className="flex-1 bg-white p-6 border border-[#C0392B]/25 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#C0392B]/[0.03] pointer-events-none" />
                    <div className="text-[11px] font-mono text-[#C0392B] mb-4 uppercase tracking-wide">After forget</div>
                    <div className="text-black/50 text-[15px] leading-relaxed italic">"{forgetComparison.after}"</div>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setForgetComparison(null)}
                    className="text-black/50 hover:text-black font-mono text-sm border border-black/[0.08] rounded-full px-4 py-2 transition-colors"
                  >
                    Close record
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcuts Tooltip */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur border border-black/[0.08] p-4 rounded-lg text-sm font-mono text-black/70 shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between gap-8">
                  <span>Focus Search</span>
                  <span className="bg-black/[0.04] px-2 rounded border border-black/[0.08]">/</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Submit</span>
                  <span className="bg-black/[0.04] px-2 rounded border border-black/[0.08]">⌘/Ctrl + Enter</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Toggle Help</span>
                  <span className="bg-black/[0.04] px-2 rounded border border-black/[0.08]">?</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forget Panel is typically hidden unless node selected or global forget invoked */}
        <MemoryControls onMemify={handleMemify} onForget={handleForget} selectedNode={selectedNode} />
      </main>
    </div>
  );
}
