"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import TraversalTrail, { TrailStep } from "@/components/TraversalTrail";
import TemporalTimeline from "@/components/TemporalTimeline";
import { motion, AnimatePresence } from "framer-motion";
import { useDatasetSession } from "@/hooks/useDatasetSession";

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

function AskPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { datasetName } = useDatasetSession();
  const [searchMode, setSearchMode] = useState<'GRAPH_COMPLETION' | 'GRAPH_COMPLETION_COT' | 'GRAPH_SUMMARY_COMPLETION' | 'TEMPORAL'>('GRAPH_COMPLETION');
  const query = searchMode === 'TEMPORAL' ? "What happened after 2am on the night Doug disappeared?" : (searchParams.get("q") || "");

  const [loading, setLoading] = useState(true);
  const [ragAnswer, setRagAnswer] = useState("");
  const [graphAnswer, setGraphAnswer] = useState("");
  const [rawContext, setRawContext] = useState("");
  const [trail, setTrail] = useState<TrailStep[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [autoSelectedMode, setAutoSelectedMode] = useState<string | null>(null);

  const fetchAnswers = async () => {
    if (!datasetName) return;
    setLoading(true);
    try {
      let endpoint = "/api/ask";
      if (searchMode === 'GRAPH_COMPLETION_COT') {
        endpoint = "/api/ask-deep";
      } else if (searchMode === 'GRAPH_SUMMARY_COMPLETION') {
        endpoint = "/api/recall";
      }

      const [res, contextRes] = await Promise.all([
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, datasetName, searchType: searchMode })
        }),
        fetch("/api/ask-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, datasetName })
        })
      ]);
      
      if (contextRes.ok) {
        const cData = await contextRes.json();
        setRawContext(cData.context || "No context found.");
      } else {
        setRawContext("Error fetching context.");
      }

      if (res.ok) {
        const data = await res.json();
        setRagAnswer(data.vector?.answer || "No RAG response.");
        if (searchMode === 'GRAPH_COMPLETION_COT' && data.graph?.answer) {
          // Parse numbered lists into trail steps if COT is returned as text
          const lines = data.graph.answer.split('\n').filter((l: string) => /^\d+\./.test(l.trim()));
          if (lines.length > 0) {
             setGraphAnswer("Chain of Thought Reasoning Complete.");
             const cotTrail = lines.map((l: string, i: number) => ({
                type: 'graph',
                subject: `Step ${i + 1}`,
                relation: 'REASONED',
                object: l.replace(/^\d+\.\s*/, '')
             }));
             setTrail(cotTrail);
          } else {
             setGraphAnswer(data.graph?.answer || "No Graph response.");
             setTrail([]);
          }
        } else {
          setGraphAnswer(data.graph?.answer || "No Graph response.");
          const rawTrail = data.graph?.trail || [];
          const enrichedTrail = rawTrail.length > 0 
            ? [
                { type: 'vector', subject: `Document Chunk`, relation: 'SEEDED', object: rawTrail[0].subject },
                ...rawTrail.map((t: any) => ({ ...t, type: 'graph' }))
              ] 
            : [];
          setTrail(enrichedTrail);
        }

        if (searchMode === 'GRAPH_SUMMARY_COMPLETION') {
          setAutoSelectedMode(data.graph?.searchTypeUsed || "GRAPH_COMPLETION");
        } else {
          setAutoSelectedMode(null);
        }
        
        // Save for the forget demo
        localStorage.setItem("chow_last_query", query);
        localStorage.setItem("chow_last_answer", data.graph?.answer || "No Graph response.");

        // Trigger confetti
        setShowConfetti(false);
        setTimeout(() => setShowConfetti(true), 100);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setRagAnswer("Error contacting server.");
        setGraphAnswer("Error contacting server.");
        setRawContext("Error contacting server.");
      }
    } catch (error) {
      setRagAnswer("Search failed.");
      setGraphAnswer("Search failed.");
      setRawContext("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      router.push("/board");
      return;
    }
    if (datasetName) {
      fetchAnswers();
    }
  }, [query, router, datasetName, replayKey, searchMode]);

  const handleReplay = () => {
    setGraphAnswer("");
    setRagAnswer("");
    setRawContext("");
    setTrail([]);
    setReplayKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col relative overflow-hidden w-full">
      {/* Header */}
      <header className="flex-none h-16 border-b border-black/[0.08] bg-white/80 backdrop-blur-md px-6 flex items-center z-10 gap-4">
        <button
          onClick={() => router.back()}
          className="text-black/40 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-[17px] font-semibold tracking-[-0.02em] text-[#0d0d0d]" style={{ fontFamily: "var(--font-geist)" }}>
          What do you need to know?
        </div>
        <button
          onClick={handleReplay}
          className="ml-auto flex items-center gap-2 text-black/50 hover:text-black border border-black/[0.08] px-3 py-1.5 rounded-full transition-colors text-sm font-mono"
        >
          <Play className="w-4 h-4" /> Replay
        </button>
      </header>

      {/* Query Banner */}
      <div className="bg-white border-b border-black/[0.08] py-6 px-12 text-center relative z-10 flex flex-col items-center">
        <h2 className="text-2xl font-medium tracking-[-0.01em] text-[#0d0d0d] relative z-10 mb-6" style={{ fontFamily: "var(--font-geist)" }}>"{query}"</h2>

        {/* Mode Toggle */}
        <div className="relative z-10 flex bg-[#f0f0ef] p-1 rounded-full border border-black/[0.06]">
          <button
            onClick={() => setSearchMode('GRAPH_COMPLETION')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
              searchMode === 'GRAPH_COMPLETION' ? 'bg-white text-[#0d0d0d] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-black/45 hover:text-black/70'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setSearchMode('GRAPH_COMPLETION_COT')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
              searchMode === 'GRAPH_COMPLETION_COT' ? 'bg-white text-[#0d0d0d] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-black/45 hover:text-black/70'
            }`}
          >
            🧠 Deep reasoning
          </button>
          <button
            onClick={() => setSearchMode('GRAPH_SUMMARY_COMPLETION')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
              searchMode === 'GRAPH_SUMMARY_COMPLETION' ? 'bg-white text-[#0d0d0d] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-black/45 hover:text-black/70'
            }`}
          >
            🎲 Wolf pack
          </button>
          <button
            onClick={() => setSearchMode('TEMPORAL')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
              searchMode === 'TEMPORAL' ? 'bg-white text-[#0d0d0d] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-black/45 hover:text-black/70'
            }`}
          >
            ⏱️ Timeline
          </button>
        </div>
        {searchMode === 'GRAPH_SUMMARY_COMPLETION' && autoSelectedMode && (
          <div className="relative z-10 mt-3 text-xs font-mono text-black/45 bg-[#f0f0ef] px-3 py-1 rounded-full">
            The Wolf Pack doesn't plan. Cognee chose: {autoSelectedMode}
          </div>
        )}
      </div>

      {/* Split Screen */}
      <main className="flex-1 flex flex-col md:flex-row relative z-10">
        
        {/* Left Panel: RAG */}
        <div className="flex-1 border-r border-black/[0.08] p-8 flex flex-col relative opacity-80">
          <h2 className="text-xl font-medium tracking-[-0.01em] text-black/50 mb-6 flex items-center gap-3" style={{ fontFamily: "var(--font-geist)" }}>
            <span className="text-2xl opacity-60">🤕</span>
            Hangover AI
            <span className="text-[11px] font-mono tracking-widest ml-auto uppercase text-black/35 border border-black/[0.08] px-2 py-1 rounded-full">Vector RAG (chunks)</span>
          </h2>

          <div className="bg-white p-6 rounded-lg flex-1 border border-black/[0.08] relative">
            <div className="absolute top-2 right-2 text-[10px] font-mono text-black/35 bg-[#fafafa] px-2 py-1 rounded-full border border-black/[0.06]">
              🤷 Stu energy
            </div>
            {ragAnswer ? (
              <p className="text-black/45 text-[16px] leading-relaxed">
                {renderMarkdown(ragAnswer)}
              </p>
            ) : (
              <div className="flex items-center gap-3 text-black/35 h-full justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-sm">Searching embeddings...</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel: Context */}
        <div className="flex-1 border-r border-black/[0.08] p-8 flex flex-col relative overflow-hidden">
          <h2 className="text-xl font-medium tracking-[-0.01em] text-black/60 mb-6 flex items-center gap-3" style={{ fontFamily: "var(--font-geist)" }}>
            <span className="text-2xl opacity-60">📂</span>
            Raw graph context
            <span className="text-[11px] font-mono tracking-widest ml-auto uppercase text-black/35 border border-black/[0.08] px-2 py-1 rounded-full">What Cognee fed the LLM</span>
          </h2>
          <div className="bg-white p-6 rounded-lg flex-1 border border-black/[0.08] relative font-mono text-xs text-black/55 whitespace-pre-wrap overflow-y-auto">
            {rawContext ? (
               rawContext
            ) : (
               <div className="flex items-center gap-3 text-black/35 h-full justify-center">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span>Fetching context...</span>
               </div>
            )}
          </div>
        </div>

        {/* Right Panel: Graph */}
        <div className="flex-[1.2] p-8 flex flex-col relative overflow-hidden">
          <h2 className="text-xl font-medium tracking-[-0.01em] text-[#0d0d0d] mb-6 flex items-center gap-3" style={{ fontFamily: "var(--font-geist)" }}>
            <span className="text-2xl">🧠</span>
            Chow
            <span className="text-[11px] font-mono tracking-widest ml-auto text-black/60 border border-black/[0.1] px-2 py-1 rounded-full">Graph completion</span>
          </h2>

          <div className="bg-white p-8 rounded-lg flex-1 border border-black/[0.12] shadow-[0_1px_2px_rgba(0,0,0,0.04)] relative flex flex-col overflow-y-auto">
            {graphAnswer ? (
              <>
                {searchMode === 'TEMPORAL' ? (
                  <TemporalTimeline answerText={graphAnswer} />
                ) : (
                  <>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-[#0d0d0d] text-xl leading-relaxed mb-auto"
                    >
                      {renderMarkdown(graphAnswer)}
                    </motion.p>
                    {trail.length > 0 && <TraversalTrail trail={trail} />}
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-black/50 h-full justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-mono">Traversing graph relationships...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div 
            className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 70 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: "100vw", 
                  y: Math.random() * 100 + "vh", 
                  rotate: 0,
                  opacity: 1
                }}
                animate={{ 
                  x: "-10vw", 
                  y: Math.random() * 100 + "vh",
                  rotate: 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  ease: "easeOut"
                }}
                className="absolute text-3xl drop-shadow-md"
                style={{ color: ['#f35918', '#C0392B', '#929c05', '#0d0d0d'][Math.floor(Math.random() * 4)] }}
              >
                {['♠', '♥', '♦', '♣'][Math.floor(Math.random() * 4)]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-black/40 animate-spin" />
      </div>
    }>
      <AskPageContent />
    </Suspense>
  );
}
