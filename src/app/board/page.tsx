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
import { Search } from "lucide-react";
import { useDatasetSession } from "@/hooks/useDatasetSession";
import { motion, AnimatePresence } from "framer-motion";

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
        const lastQuery = localStorage.getItem("hindsight_last_query") || "Where is Doug?";
        const lastAnswer = localStorage.getItem("hindsight_last_answer") || "Doug is on the roof of Caesar's Palace.";
        
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
    <div className="flex flex-col h-screen bg-[#1A1108] relative">
      {/* Header Bar */}
      <header className="flex-none h-16 border-b border-[#2C1F0E] bg-[#0D0D0D]/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div 
          className="font-heading tracking-widest text-xl text-white cursor-pointer"
          onClick={() => router.push("/")}
        >
          HINDSIGHT
        </div>
        
        {/* Status Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-[#8B6914]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cognifyStatus === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            MEMORY: {cognifyStatus === 'processing' ? 'PROCESSING' : 'ACTIVE'}
          </div>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">{liveStats.nodes || nodes.length} nodes</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">{liveStats.edges || edges.length} edges</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline">Last cognified: {lastCognified}</span>
          <span className="hidden lg:inline">|</span>
          <span className="hidden lg:inline opacity-50">{datasetName}</span>
        </div>

        {/* RESTORED TOAST */}
        <AnimatePresence>
          {showRestoredToast && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#10b981]/20 border border-[#10b981] text-[#10b981] px-4 py-1 text-xs font-mono tracking-widest rounded shadow-xl"
            >
              MEMORY RESTORED
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Board Area */}
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center font-heading text-3xl text-[#F5C842] animate-pulse">
            Connecting the dots... (This is where the magic happens)
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center font-heading text-3xl text-[#8B6914]">
            <div>The Wolf Pack's memory is blank.</div>
            <button 
              onClick={() => router.push("/")}
              className="mt-4 text-lg bg-[#2C1F0E] hover:bg-[#F5C842] hover:text-[#1A1108] px-6 py-2 rounded transition-colors"
            >
              Add Evidence
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
        
        {/* Bottom Question Input */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-6">
          <form onSubmit={handleAsk} className="relative">
            <div className="absolute -top-6 left-4 text-xs font-heading tracking-wider text-[#F5C842]">
              WHAT DO YOU NEED TO KNOW?
            </div>
            <div className="relative bg-[#F5EDD4] rounded-sm overflow-hidden shadow-2xl border-l-8 border-[#C0392B] border-b-2 border-b-[#8B6914] flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Where's Doug?"
                className="w-full bg-transparent px-6 py-4 text-[#1A1108] font-body text-lg focus:outline-none placeholder-[#1A1108]/40 relative z-10"
              />
              <button 
                type="submit"
                className="px-6 py-4 text-[#C0392B] hover:bg-black/5 transition-colors relative z-10"
              >
                <Search className="w-6 h-6" />
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
              className="absolute bottom-0 left-0 w-full bg-[#0D0D0D] border-t-2 border-[#C0392B] p-8 z-[60] shadow-2xl flex flex-col items-center"
            >
              <div className="max-w-4xl w-full">
                <h3 className="text-[#F5C842] font-heading tracking-widest text-2xl mb-6 text-center">
                  "{forgetComparison.query}"
                </h3>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 bg-[#1A1108] p-6 border border-[#2C1F0E] rounded">
                    <div className="text-xs font-mono text-[#8B6914] mb-4 uppercase">Before Forget</div>
                    <div className="text-[#F5EDD4] font-body text-lg">{forgetComparison.before}</div>
                  </div>
                  <div className="flex-1 bg-[#1A1108] p-6 border border-[#C0392B]/50 rounded relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#C0392B]/5 pointer-events-none" />
                    <div className="text-xs font-mono text-[#C0392B] mb-4 uppercase">After Forget</div>
                    <div className="text-[#F5EDD4]/60 font-body text-lg italic">"{forgetComparison.after}"</div>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setForgetComparison(null)}
                    className="text-[#8B6914] hover:text-[#F5C842] font-mono text-sm border border-[#2C1F0E] px-4 py-2"
                  >
                    CLOSE RECORD
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
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-[#0D0D0D]/90 backdrop-blur border border-[#F5C842]/30 p-4 rounded text-sm font-mono text-[#F5C842]"
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between gap-8">
                  <span>Focus Search</span>
                  <span className="bg-[#2C1F0E] px-2 rounded border border-[#6B4F2A]">/</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Submit</span>
                  <span className="bg-[#2C1F0E] px-2 rounded border border-[#6B4F2A]">⌘/Ctrl + Enter</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Toggle Help</span>
                  <span className="bg-[#2C1F0E] px-2 rounded border border-[#6B4F2A]">?</span>
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
