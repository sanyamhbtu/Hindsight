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
        localStorage.setItem("hindsight_last_query", query);
        localStorage.setItem("hindsight_last_answer", data.graph?.answer || "No Graph response.");

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
    <div className="min-h-screen bg-[#1A1108] flex flex-col relative overflow-hidden w-full">
      {/* Header */}
      <header className="flex-none h-16 border-b border-[#2C1F0E] bg-[#0D0D0D]/80 backdrop-blur-md px-6 flex items-center z-10 gap-4">
        <button 
          onClick={() => router.back()}
          className="text-[#8B6914] hover:text-[#F5EDD4] transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-heading tracking-widest text-xl text-white">
          WHAT DO YOU NEED TO KNOW?
        </div>
        <button 
          onClick={handleReplay}
          className="ml-auto flex items-center gap-2 text-[#8B6914] hover:text-[#F5C842] border border-[#2C1F0E] px-3 py-1.5 rounded-sm transition-colors text-sm font-mono"
        >
          <Play className="w-4 h-4" /> REPLAY
        </button>
      </header>

      {/* Query Banner */}
      <div className="bg-[#F5EDD4] border-b-4 border-[#C0392B] py-6 px-12 text-center relative z-10 shadow-lg flex flex-col items-center">
        {/* Yellow legal pad styling */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #93C5FD 27px, #93C5FD 28px)" }} />
        <h2 className="text-3xl font-body text-[#1A1108] font-bold relative z-10 mb-6">"{query}"</h2>
        
        {/* Mode Toggle */}
        <div className="relative z-10 flex bg-[#2C1F0E] p-1 rounded border border-[#8B6914] shadow-md">
          <button
            onClick={() => setSearchMode('GRAPH_COMPLETION')}
            className={`px-4 py-1.5 font-heading text-sm tracking-widest transition-all ${
              searchMode === 'GRAPH_COMPLETION' ? 'bg-[#F5EDD4] text-[#1A1108]' : 'text-[#8B6914] hover:text-[#F5C842]'
            }`}
          >
            STANDARD
          </button>
          <button
            onClick={() => setSearchMode('GRAPH_COMPLETION_COT')}
            className={`px-4 py-1.5 font-heading text-sm tracking-widest transition-all ${
              searchMode === 'GRAPH_COMPLETION_COT' ? 'bg-[#F5EDD4] text-[#1A1108]' : 'text-[#8B6914] hover:text-[#F5C842]'
            }`}
          >
            🧠 DEEP REASONING
          </button>
          <button
            onClick={() => setSearchMode('GRAPH_SUMMARY_COMPLETION')}
            className={`px-4 py-1.5 font-heading text-sm tracking-widest transition-all flex items-center gap-2 ${
              searchMode === 'GRAPH_SUMMARY_COMPLETION' ? 'bg-[#F5EDD4] text-[#1A1108]' : 'text-[#8B6914] hover:text-[#F5C842]'
            }`}
          >
            🎲 WOLF PACK
          </button>
          <button
            onClick={() => setSearchMode('TEMPORAL')}
            className={`px-4 py-1.5 font-heading text-sm tracking-widest transition-all flex items-center gap-2 ${
              searchMode === 'TEMPORAL' ? 'bg-[#F5EDD4] text-[#1A1108]' : 'text-[#8B6914] hover:text-[#F5C842]'
            }`}
          >
            ⏱️ TIMELINE
          </button>
        </div>
        {searchMode === 'GRAPH_SUMMARY_COMPLETION' && autoSelectedMode && (
          <div className="relative z-10 mt-3 text-xs font-mono text-[#8B6914] bg-[#2C1F0E] px-3 py-1 rounded">
            The Wolf Pack doesn't plan. Cognee chose: {autoSelectedMode}
          </div>
        )}
      </div>

      {/* Split Screen */}
      <main className="flex-1 flex flex-col md:flex-row relative z-10">
        
        {/* Left Panel: RAG */}
        <div className="flex-1 border-r border-[#2C1F0E] p-8 flex flex-col relative">
          <div className="absolute inset-0 bg-[#0D0D0D]/20 pointer-events-none" />
          <h2 className="font-heading text-3xl text-[#8B6914]/80 mb-6 flex items-center gap-3">
            <span className="text-4xl opacity-50">🤕</span> 
            HANGOVER AI
            <span className="text-xs font-mono tracking-widest ml-auto opacity-50 uppercase border border-[#8B6914]/30 px-2 py-1 rounded">Vector RAG (Chunks)</span>
          </h2>
          
          <div className="bg-[#2C1F0E]/20 p-6 rounded-sm flex-1 border border-[#2C1F0E]/40 relative">
            <div className="absolute top-2 right-2 text-[10px] font-mono text-[#8B6914]/50 bg-[#1A1108] px-2 py-1 rounded-sm">
              🤷 Stu Energy
            </div>
            {ragAnswer ? (
              <p className="text-[#F5EDD4]/60 font-body text-lg leading-relaxed filter grayscale-[50%] blur-[0.5px]">
                {renderMarkdown(ragAnswer)}
              </p>
            ) : (
              <div className="flex items-center gap-3 text-[#8B6914]/50 h-full justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-sm">Searching embeddings...</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel: Context */}
        <div className="flex-1 border-r border-[#2C1F0E] p-8 flex flex-col relative overflow-hidden">
          <h2 className="font-heading text-3xl text-[#38bdf8]/80 mb-6 flex items-center gap-3">
            <span className="text-4xl opacity-50">📂</span> 
            RAW GRAPH CONTEXT
            <span className="text-[10px] font-mono tracking-widest ml-auto opacity-50 uppercase border border-[#38bdf8]/30 px-2 py-1 rounded">What Cognee fed to the LLM</span>
          </h2>
          <div className="bg-[#2C1F0E]/20 p-6 rounded-sm flex-1 border border-[#2C1F0E]/40 relative font-mono text-xs text-[#38bdf8]/70 whitespace-pre-wrap overflow-y-auto">
            {rawContext ? (
               rawContext
            ) : (
               <div className="flex items-center gap-3 text-[#38bdf8]/50 h-full justify-center">
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span>Fetching context...</span>
               </div>
            )}
          </div>
        </div>

        {/* Right Panel: Graph */}
        <div className="flex-[1.2] p-8 flex flex-col relative overflow-hidden">
          <h2 className="font-heading text-3xl text-[#F5C842] mb-6 flex items-center gap-3">
            <span className="text-4xl">🧠</span> 
            HINDSIGHT
            <span className="text-xs font-mono tracking-widest ml-auto text-[#F5C842] border border-[#F5C842]/30 px-2 py-1 rounded">Graph Completion</span>
          </h2>

          <div className="bg-[#0D0D0D]/80 p-8 rounded-sm flex-1 border-2 border-[#F5C842]/50 shadow-[0_0_30px_rgba(245,200,66,0.1)] relative flex flex-col overflow-y-auto">
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
                      className="text-[#F5EDD4] font-body text-xl leading-relaxed mb-auto"
                    >
                      {renderMarkdown(graphAnswer)}
                    </motion.p>
                    {trail.length > 0 && <TraversalTrail trail={trail} />}
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-[#F5C842] h-full justify-center">
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
                style={{ color: ['#F5C842', '#C0392B', '#FFFFFF', '#000000'][Math.floor(Math.random() * 4)] }}
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
      <div className="min-h-screen bg-[#1A1108] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F5C842] animate-spin" />
      </div>
    }>
      <AskPageContent />
    </Suspense>
  );
}
