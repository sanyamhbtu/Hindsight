"use client";

import { useEffect, useRef, useState } from "react";
import { Geist, Inter_Tight } from "next/font/google";
import {
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Code2,
  Database,
  Eraser,
  Globe,
  Layers,
  MapPin,
  MousePointer2,
  Network,
  Paperclip,
  PlusCircle,
  Repeat,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDatasetSession } from "@/hooks/useDatasetSession";
import { DETECTIVE_DEMO_SOURCES } from "@/lib/detective/fragments";

const geist = Geist({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-geist" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter-tight" });

const URL_RE = /^https?:\/\/\S+$/i;

type IngestSource = { type: string; content: string; source?: string };

/**
 * All hero copy in one place — edit this object to change what's on the
 * page without touching layout/markup below.
 */
const CONTENT = {
  brand: "CHOW",
  navLinks: [
    { label: "The problem", href: "#problem" },
    { label: "Two modes", href: "#modes" },
    { label: "The proof", href: "#proof" },
    { label: "Open source", href: "#opensource" },
    { label: "GitHub ↗", href: "https://github.com/ravixalgorithm/Chow", external: true },
    { label: "Cognee ↗", href: "https://www.cognee.ai", external: true },
  ],
  badge: "Graph memory, reconstructed",
  headline: "The memory that connects the dots you don’t remember.",
  subhead:
    "Vector search finds the sentence closest to your question. Chow finds the answer that isn’t in any single one — by walking the graph between fragments.",
  runLocallyNote:
    "This runs on a self-hosted Cognee engine, not a hosted cloud API — the box below only works when you've cloned the repo and started it yourself.",
  runLocallyCta: "Get the code + setup ↗",
  runLocallyHref: "https://github.com/ravixalgorithm/Chow",
  inputPlaceholder: "Paste evidence, drop a file, or a URL…",
  panelBadge: "Powered by Cognee",
  sequence: [
    "Reads every fragment — texts, receipts, logs.",
    "Builds a typed graph — who, where, when.",
    "Connects what no single fragment states.",
  ],
  problemEyebrow: "Why this exists",
  problemHeadline: "Every AI conversation starts from zero.",
  problemBody:
    "Every LLM call is stateless. The standard patch — vector search — only retrieves the chunk most similar to your question. It can’t synthesize an answer that’s split across several fragments, because it can’t see the edge between two facts, only the facts themselves.",
  problemCompare: [
    {
      title: "What vector search sees",
      body: "Isolated chunks, ranked by similarity. The most relevant sentence wins — even when it isn’t the answer.",
      dim: true,
    },
    {
      title: "What a graph sees",
      body: "Entities and the relationships between them. The answer can live in an edge that no single sentence states.",
      dim: false,
    },
  ],
  lifecycleEyebrow: "Every operation, on screen",
  lifecycle: [
    { icon: PlusCircle, title: "Remember", op: "cognee.add()", body: "Evidence streams into a dataset — texts, files, cleaned URLs." },
    { icon: Search, title: "Recall", op: "cognee.search()", body: "Multi-hop graph traversal assembles an answer, and shows the path it took." },
    { icon: TrendingUp, title: "Improve", op: "cognee.memify()", body: "A second pass enriches the graph and re-weights it toward trusted nodes." },
    { icon: Eraser, title: "Forget", op: "cognee.forget()", body: "Surgically remove a source — then re-ask, and watch it no longer know." },
  ],
  ontoEyebrow: "The intake membrane",
  ontoHeadlineMuted: "A graph is only as good",
  ontoHeadlineStrong: "as what you feed it.",
  ontoBody:
    "Feed a raw webpage to cognify and it cheerfully extracts nodes like “Accept Cookies” and “Subscribe” — junk that poisons every future traversal. Onto cleans and trust-scores every source before it ever reaches the graph, so Research mode builds from things worth remembering, not web sludge.",
  ontoSteps: [
    {
      title: "Feed it anything",
      body: "Drop in a raw URL — a docs page, a blog post, a wiki. No pre-cleaning required.",
    },
    {
      title: "Onto cleans it",
      body: "Strips nav chrome and cookie banners, returns clean Markdown plus a 0–100 trust score.",
    },
    {
      title: "Lands in the graph, trust-scored",
      body: "cognee.add() writes the trust score onto the node — it rides along through every traversal.",
    },
  ],
  ossEyebrow: "Not just a wrapper",
  ossHeadline: "We didn’t just call Cognee. We built on it.",
  ossBody:
    "Self-hosted, open-source Cognee — the cognee-ai/cognee repo, running locally. Depth here means going past add/cognify/search and using the machinery underneath.",
  ossItems: [
    {
      icon: Network,
      satellites: [Users, MapPin],
      title: "Custom ontology",
      body: "Typed Person / Place / Event / Object / Transaction nodes with typed relations — not a generic entity graph.",
    },
    {
      icon: Code2,
      satellites: [Globe, PlusCircle],
      title: "Custom pipeline Task",
      body: "An Onto intake + trust-scoring Task, written against Cognee’s own Task API — not a pre-call bolted on the side.",
    },
    {
      icon: Repeat,
      satellites: [Circle, CheckCircle2],
      title: "memify, for real",
      body: "The OSS self-improvement loop enriches and re-weights the graph — before/after, on screen.",
    },
    {
      icon: SlidersHorizontal,
      satellites: [Search, Layers],
      title: "Multiple search types",
      body: "GRAPH_COMPLETION for the answer, CHUNKS for the vector baseline — range, not one call.",
    },
    {
      icon: Layers,
      satellites: [Database, Database],
      title: "Swappable stores",
      body: "Pluggable graph and vector backends — the config is named on stage, not hidden.",
    },
    {
      icon: Users,
      satellites: [Circle, Circle],
      title: "Per-user isolation",
      body: "ENABLE_BACKEND_ACCESS_CONTROL scopes storage per user + dataset — a real OSS feature, not a demo trick.",
    },
  ],
  ossContribution:
    "And we're giving back: cognee-onto — an open-source ingestion adapter any Cognee user can drop in for clean, trust-scored web intake.",
  closingHeadline: "Not a memory that stores. A memory that connects.",
  closingCta: "Get the code + run it ↗",
  modesEyebrow: "One engine, two doors in",
  modesHeadline: "Same graph. Different evidence.",
  modeCards: [
    {
      eyebrow: "Detective mode",
      accent: "#f35918",
      headline: "Reconstruct last night.",
      target: "detective" as const,
      texture: "/hero/modes-orange.png",
      preview: {
        title: "The Doug case",
        rows: [
          { label: "Doug last seen — blackjack, 11:33pm", done: true },
          { label: "Elevator CCTV — tiger, going up, 2:08am", done: true },
          { label: "Tiger found on roof, 4:00am", done: true },
          { label: "Doug located", done: false },
        ],
      },
    },
    {
      eyebrow: "Research mode",
      accent: "#929c05",
      headline: "Cross-source, cited.",
      target: "research" as const,
      texture: "/hero/modes-green.png",
      preview: {
        title: "Source trust",
        rows: [
          { label: "Cognee docs", value: 92 },
          { label: "Hackathon rules", value: 78 },
          { label: "Random blog post", value: 34 },
        ],
      },
    },
  ],
  proofEyebrow: "Same question, two engines",
  proofHeadline: "Vector search stops at one sentence. Chow keeps going.",
  proofBody:
    "Ask both engines the same question over the same evidence. One returns the chunk that sounds closest. The other walks the graph between fragments and shows its work.",
  proofQuery: "“Where is Doug?”",
  vector: {
    label: "Hangover AI",
    sub: "Vector RAG · nearest chunk",
    answer: "“I’m not sure — nothing mentions where Doug ended up.”",
  },
  graph: {
    label: "Chow",
    sub: "Graph completion · full traversal",
    answer:
      "“Doug is on the roof. He left the suite with the tiger at 2am — security found the tiger on the roof at 4am.”",
    trail: "suite (2am) → left with tiger → tiger found on roof (4am) → Doug",
  },
  footerLine: "Not a memory that stores. A memory that connects.",
  footerSub: "Self-hosted Cognee for memory · Onto for clean, trust-scored intake",
};

function CornerMark({ className }: { className: string }) {
  return (
    <div
      className={`absolute size-[6px] rounded-[1px] border border-white bg-gradient-to-b from-[#6b6b6b] to-black shadow-[0_2px_2px_rgba(0,0,0,0.08)] ${className}`}
    />
  );
}

const STEP_SPIN_MS = 900;
const STEP_DONE_MS = 450;
const LOOP_PAUSE_MS = 1400;

/** Cycles through each step — spinner, then a checkmark — then loops from the top. */
function SequenceChecklist({ steps }: { steps: readonly string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<"spinning" | "done" | "pause">("spinning");

  useEffect(() => {
    if (phase === "spinning") {
      const t = setTimeout(() => setPhase("done"), STEP_SPIN_MS);
      return () => clearTimeout(t);
    }
    if (phase === "done") {
      const isLast = activeIndex === steps.length - 1;
      const t = setTimeout(() => {
        if (isLast) {
          setPhase("pause");
        } else {
          setActiveIndex((i) => i + 1);
          setPhase("spinning");
        }
      }, STEP_DONE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setActiveIndex(0);
      setPhase("spinning");
    }, LOOP_PAUSE_MS);
    return () => clearTimeout(t);
  }, [activeIndex, phase, steps.length]);

  return (
    <ol className="relative flex flex-col gap-[18px]">
      {/* connector line running behind the step dots */}
      <div className="absolute left-[7px] top-[10px] bottom-[10px] w-px bg-black/10" aria-hidden />
      {steps.map((label, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? (phase === "spinning" ? "spinning" : "done") : "pending";
        return (
          <li key={label} className="relative flex items-center gap-2 bg-white">
            {state === "spinning" ? (
              <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-black/15 border-t-black/60" />
            ) : state === "done" ? (
              <CheckCircle2 className="size-4 shrink-0 fill-emerald-600 text-white" />
            ) : (
              <Circle className="size-4 shrink-0 text-black/15" />
            )}
            <span
              className={`text-[14px] leading-[1.5] tracking-[-0.14px] transition-colors duration-300 ${
                state === "pending" ? "text-black/40" : "text-black/80"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { detectiveDatasetName, researchDatasetName, setActiveDatasetMode } = useDatasetSession();
  const [mode, setMode] = useState<"detective" | "research">("detective");
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tryingDemo, setTryingDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // Research mode stages sources before ingest (build a source list, then
  // send it as one batch) — Detective mode keeps the original one-shot
  // submit, since it's meant to feel like dropping in a single fragment.
  const [queuedSources, setQueuedSources] = useState<IngestSource[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const goHome = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleIngest = async (sources: IngestSource[], datasetToUse: string, isDetective: boolean) => {
    setActiveDatasetMode(isDetective ? "detective" : "research");
    setIsUploading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetName: datasetToUse,
          sources,
          mode: isDetective ? "detective" : "research",
        }),
      });
      if (res.ok) {
        router.push("/board");
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Upload failed: ${errData.error || "Server unreachable"}`);
        setIsUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
      setIsUploading(false);
    }
  };

  const activeDataset = mode === "detective" ? detectiveDatasetName : researchDatasetName;
  const isDetective = mode === "detective";

  const selectMode = (next: "detective" | "research") => {
    setMode(next);
    inputCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // One-click, known-good demo: reuses this browser's own detective dataset
  // (so it plays by the same per-session isolation as a real case) but seeds
  // it with the fixed Doug-case fragments instead of ad-hoc pasted text, so
  // the graph + answers are reliable every time. If this session already has
  // a populated graph (tried once before, or came back later), skip straight
  // to the board instead of re-ingesting.
  const handleTryDemo = async () => {
    if (isUploading || tryingDemo) return;
    setMode("detective");
    setTryingDemo(true);
    try {
      const statusRes = await fetch(`/api/status?datasetName=${detectiveDatasetName}`);
      const statusData = await statusRes.json().catch(() => ({}));
      if ((statusData.nodeCount || 0) > 0) {
        setActiveDatasetMode("detective");
        router.push("/board");
        return;
      }
    } catch (e) {
      // Status check failed — fall through and seed anyway.
    }
    await handleIngest(DETECTIVE_DEMO_SOURCES, detectiveDatasetName, true);
    setTryingDemo(false);
  };

  // Explicit "create new" affordance: wipes the active dataset back to blank
  // (same nuclear /api/forget-all the board's own Forget button uses) so
  // pasting new evidence afterward starts a real fresh case instead of
  // silently merging into whatever was ingested before. Two-click confirm,
  // matching the confirm-before-destroy pattern already used on the board.
  const handleStartNew = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    try {
      await fetch("/api/forget-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetName: activeDataset }),
      });
    } catch (e) {
      console.error(e);
    }
    inputCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submitTyped = () => {
    const value = inputValue.trim();
    if (!value || isUploading) return;
    const source = URL_RE.test(value) ? { type: "url" as const, content: value } : { type: "text" as const, content: value };
    if (isDetective) {
      handleIngest([source], activeDataset, true);
    } else {
      setQueuedSources((q) => [...q, source]);
      setInputValue("");
    }
  };

  const removeQueued = (index: number) => {
    setQueuedSources((q) => q.filter((_, i) => i !== index));
  };

  const buildResearchGraph = () => {
    if (queuedSources.length === 0 || isUploading) return;
    handleIngest(queuedSources, activeDataset, false);
    setQueuedSources([]);
  };

  const ingestFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const sources = await Promise.all(
      files.map(async (file) => ({ type: "text" as const, content: await file.text(), source: file.name }))
    );
    if (isDetective) {
      handleIngest(sources, activeDataset, true);
    } else {
      setQueuedSources((q) => [...q, ...sources]);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) return ingestFiles(files);
    const url = e.dataTransfer.getData("URL");
    const text = e.dataTransfer.getData("text");
    if (url) {
      if (isDetective) return handleIngest([{ type: "url", content: url }], activeDataset, true);
      return setQueuedSources((q) => [...q, { type: "url", content: url }]);
    }
    if (text) setInputValue(text);
  };

  return (
    <div
      ref={topRef}
      className={`${geist.variable} ${interTight.variable} relative min-h-screen w-full shrink-0 bg-[#fafafa] text-[#0d0d0d]`}
      style={{ fontFamily: "var(--font-inter-tight)" }}
    >
      {/* edge grain strips */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[90px] opacity-[0.06]"
        style={{ backgroundImage: "url(/hero/grain-edge.png)", backgroundSize: "220px 220px" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[90px] opacity-[0.06]"
        style={{ backgroundImage: "url(/hero/grain-edge.png)", backgroundSize: "220px 220px" }}
      />

      {/* content frame */}
      <div className="relative mx-4 mb-6 border border-black/[0.08] sm:mx-10 sm:mb-8 lg:mx-24">
        <CornerMark className="-left-[3px] -top-[3px]" />
        <CornerMark className="-right-[3px] -top-[3px]" />
        <CornerMark className="-bottom-[3px] -left-[3px]" />
        <CornerMark className="-bottom-[3px] -right-[3px]" />

        {/* nav */}
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] px-6 py-5 sm:px-10">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            <img src="/chow-icon.svg" alt="" className="size-[20px]" />
            {CONTENT.brand}
          </button>

          <div className="hidden items-center gap-8 text-[16px] tracking-[-0.16px] text-black/60 md:flex">
            {CONTENT.navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={"external" in link && link.external ? "_blank" : undefined}
                rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                className="transition-colors hover:text-black"
              >
                {link.label}
              </a>
            ))}
          </div>

        </nav>

        {/* hero */}
        <main className="grid gap-16 px-6 pt-8 pb-16 sm:px-10 sm:pt-10 sm:pb-20 lg:grid-cols-[473fr_618fr] lg:items-center lg:gap-10 lg:pt-14 lg:pb-28">
          {/* left column */}
          <div className="flex flex-col items-start gap-[52px] lg:max-w-[473px]">
            <div className="flex flex-col gap-[3px]">
              <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ebebeb] bg-white px-3.5 py-1.5">
                <Sparkles className="size-[15px] text-black" />
                <span className="text-[15px] tracking-[-0.15px] text-black">{CONTENT.badge}</span>
              </div>
              <h1
                className="text-[38px] font-medium leading-[1.08] tracking-[-2.45px] text-balance sm:text-[49px]"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                {CONTENT.headline}
              </h1>
              <p className="mt-3 max-w-[44ch] text-[16px] leading-[1.5] tracking-[-0.16px] text-black/60">
                {CONTENT.subhead}
              </p>
            </div>

            {/* honest framing: no hosted backend on this deployment — the
                engine is self-hosted Cognee, meant to be run locally */}
            <div className="flex w-full items-start gap-3 rounded-[10px] border border-[#ebebeb] bg-[#fafafa] p-4">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-black/40" />
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] leading-[1.5] text-black/60">{CONTENT.runLocallyNote}</p>
                <a
                  href={CONTENT.runLocallyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit text-[13px] font-medium text-black underline decoration-black/20 underline-offset-2 hover:decoration-black/50"
                >
                  {CONTENT.runLocallyCta}
                </a>
              </div>
            </div>

            {/* input card */}
            <div
              ref={inputCardRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`w-full rounded-[10px] border bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
                isDragging ? "border-black/30 bg-black/[0.02]" : "border-[#e6e6e5]"
              }`}
            >
              <div className="flex flex-col gap-6 rounded-[6px] border border-[#e6e6e5] bg-white p-3">
                <div className="p-2">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitTyped();
                      }
                    }}
                    rows={2}
                    placeholder={
                      isDetective ? CONTENT.inputPlaceholder : "Paste a URL or text, then add it to the list…"
                    }
                    className="w-full resize-none bg-transparent text-[15px] leading-[24px] tracking-[-0.3px] text-[#121212] placeholder:text-[#7b7b7b] focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach a file"
                    className="flex h-10 items-center gap-2 rounded-xl border border-[#e2e2e2] px-3 text-black/70 transition-colors hover:border-black/30 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    <Paperclip className="size-[16px]" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      ingestFiles(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-[3px] rounded-xl px-[10px] py-1 text-[#363636]">
                      <MousePointer2 className="size-[14px]" />
                      <span className="text-[12px] tracking-[-0.24px]">
                        {isDetective ? "Detective" : "Research"} mode
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={submitTyped}
                      disabled={isUploading || !inputValue.trim()}
                      aria-label={isDetective ? "Reconstruct" : "Add to source list"}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] text-white shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                    >
                      {isUploading ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : isDetective ? (
                        <ArrowUp className="size-4" strokeWidth={2.5} />
                      ) : (
                        <PlusCircle className="size-4" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Research mode: staged source list — paste several URLs/docs,
                see them queued with their type, then send the whole batch to
                Onto + Cognee together. */}
            {!isDetective && queuedSources.length > 0 && (
              <div className="-mt-8 flex w-full flex-col gap-2.5 rounded-[10px] border border-[#e6e6e5] bg-white p-3">
                <ul className="flex flex-col gap-1.5">
                  {queuedSources.map((src, i) => (
                    <li
                      key={`${src.type}-${i}-${src.content.slice(0, 24)}`}
                      className="flex items-center gap-2 rounded-md bg-[#f7f7f6] px-2.5 py-1.5 text-[13px] text-black/70"
                    >
                      {src.type === "url" ? (
                        <Globe className="size-3.5 shrink-0 text-black/40" />
                      ) : (
                        <Paperclip className="size-3.5 shrink-0 text-black/40" />
                      )}
                      <span className="flex-1 truncate">{src.source || src.content}</span>
                      <button
                        type="button"
                        onClick={() => removeQueued(i)}
                        aria-label="Remove source"
                        className="shrink-0 text-black/30 transition-colors hover:text-black"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={buildResearchGraph}
                  disabled={isUploading}
                  className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] px-4 py-2.5 text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
                >
                  {isUploading ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>Build the graph — {queuedSources.length} source{queuedSources.length === 1 ? "" : "s"} →</>
                  )}
                </button>
              </div>
            )}

            {/* secondary paths: a reliable canned demo vs. explicitly starting fresh */}
            <div className="-mt-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-black/50">
              <button
                type="button"
                onClick={handleTryDemo}
                disabled={tryingDemo || isUploading}
                className="underline decoration-black/20 underline-offset-2 transition-colors hover:text-black hover:decoration-black/50 disabled:opacity-50"
              >
                {tryingDemo ? "Loading the Doug case…" : "Try the Doug case →"}
              </button>
              <span className="text-black/20">·</span>
              <button
                type="button"
                onClick={handleStartNew}
                onBlur={() => setConfirmReset(false)}
                className={`underline underline-offset-2 transition-colors ${
                  confirmReset ? "text-[#C0392B] decoration-[#C0392B]/40" : "decoration-black/20 hover:text-black hover:decoration-black/50"
                }`}
              >
                {confirmReset ? "Click again to wipe & start fresh" : "Start a new case"}
              </button>
            </div>
          </div>

          {/* right column: reasoning panel */}
          <div id="engine" className="relative overflow-hidden rounded-lg border border-[#ebebeb] bg-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: "url(/hero/grain-panel.png)", backgroundSize: "230px 230px" }}
            />
            <div className="relative flex flex-col gap-[34px] p-[34px]">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ebebeb] bg-white px-3.5 py-1.5">
                <Sparkles className="size-4 text-black/90" />
                <span className="text-[15px] tracking-[-0.15px] text-black/90">{CONTENT.panelBadge}</span>
              </div>

              <SequenceChecklist steps={CONTENT.sequence} />

              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md">
                <img
                  src="/hero.png"
                  alt=""
                  className="absolute inset-0 size-full object-cover grayscale"
                />
              </div>
            </div>
          </div>
        </main>

        {/* the problem */}
        <section id="problem" className="border-t border-black/[0.08] bg-[#f6f6f4] px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <div className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-black/40">
                {CONTENT.problemEyebrow}
              </div>
              <h2
                className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-balance sm:text-[34px]"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                {CONTENT.problemHeadline}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.65] text-black/60">{CONTENT.problemBody}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {CONTENT.problemCompare.map((c) => (
                <div
                  key={c.title}
                  className={`flex flex-col gap-2 rounded-lg border p-6 ${
                    c.dim ? "border-[#ebebeb] bg-white/50 opacity-70" : "border-black/[0.12] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <h3 className="text-[15px] font-medium tracking-[-0.01em]">{c.title}</h3>
                  <p className="text-[13.5px] leading-[1.6] text-black/55">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* two modes + the lifecycle, combined — matches Figma node 27:1210 exactly:
            gradient-text headline, mono uppercase eyebrows, tilted stacked-card
            mockup preview, grainy photo-texture card backgrounds via mix-blend-multiply */}
        <section id="modes" className="relative overflow-hidden border-t border-black/[0.08] bg-[#f5f5f5] px-6 py-16 sm:px-10 sm:py-20">
          {/* diagonal-dot corner decoration */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-[140px] w-[120px] opacity-20"
            style={{ backgroundImage: "url(/hero/modes-dots.png)", backgroundSize: "6px 6px" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-0 h-[140px] w-[120px] opacity-20"
            style={{ backgroundImage: "url(/hero/modes-dots.png)", backgroundSize: "6px 6px" }}
            aria-hidden
          />

          <div className="relative mb-10 text-center">
            <div
              className="mb-1 text-[13px] font-medium uppercase tracking-[-0.15px] text-[#343434]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {`{${CONTENT.modesEyebrow.toUpperCase()}}`}
            </div>
            <h2
              className="mx-auto max-w-[22ch] text-[28px] font-medium capitalize leading-[1.25] tracking-[-0.02em] text-balance sm:text-[34px]"
              style={{
                fontFamily: "var(--font-geist)",
                backgroundImage: "linear-gradient(85deg, #000 1%, #353535 99%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {CONTENT.modesHeadline}
            </h2>
          </div>

          {/* mode preview cards */}
          <div className="relative mb-16 grid gap-5 sm:grid-cols-2">
            {CONTENT.modeCards.map((card) => (
              <div key={card.eyebrow} className="relative overflow-hidden rounded-2xl bg-white">
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-multiply"
                  style={{ backgroundImage: `url(${card.texture})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between p-7 pb-5">
                  <div>
                    <div
                      className="mb-1 text-[13px] font-medium uppercase tracking-[-0.15px]"
                      style={{ fontFamily: "var(--font-jetbrains-mono)", color: card.accent }}
                    >
                      {`{${card.eyebrow.toUpperCase()}}`}
                    </div>
                    <h3
                      className="text-[20px] font-medium capitalize tracking-[-0.02em]"
                      style={{
                        fontFamily: "var(--font-geist)",
                        backgroundImage: "linear-gradient(85deg, #000 1%, #353535 99%)",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {card.headline}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => (card.target === "detective" ? handleTryDemo() : selectMode(card.target))}
                    aria-label={card.target === "detective" ? "Try the Doug case" : `Try ${card.eyebrow}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(104deg,#19191a_0%,#262626_34%,#19191a_51%,#262626_72%,#19191a_100%)] text-[#edefff] transition-opacity hover:opacity-90 disabled:opacity-50"
                    disabled={card.target === "detective" && (tryingDemo || isUploading)}
                  >
                    {card.target === "detective" && tryingDemo ? (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <ArrowUpRight className="size-4" strokeWidth={2} />
                    )}
                  </button>
                </div>

                {/* tilted stacked-card mockup */}
                <div className="relative flex h-[300px] items-center justify-center px-8 pb-8">
                  <div className="absolute h-[220px] w-[320px] -rotate-6 rounded-xl bg-white/70" aria-hidden />
                  <div className="relative h-[220px] w-[320px] overflow-hidden rounded-xl border border-white bg-white p-4 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[13px] font-medium capitalize text-[#494949]">{card.preview.title}</span>
                      <ArrowUpRight className="size-3.5 text-black/30" />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {"rows" in card.preview &&
                        card.preview.rows.map((row) =>
                          "done" in row ? (
                            <div key={row.label} className="flex items-center gap-2">
                              {row.done ? (
                                <CheckCircle2 className="size-3.5 shrink-0 fill-emerald-600 text-white" />
                              ) : (
                                <Circle className="size-3.5 shrink-0 text-black/15" />
                              )}
                              <span
                                className={`text-[12px] leading-[1.3] ${row.done ? "text-black/35 line-through" : "text-black/75"}`}
                              >
                                {row.label}
                              </span>
                            </div>
                          ) : (
                            <div key={row.label} className="flex items-center justify-between gap-3">
                              <span className="text-[12px] text-black/70">{row.label}</span>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-black/[0.06]">
                                  <div className="h-full rounded-full bg-black/70" style={{ width: `${row.value}%` }} />
                                </div>
                                <span className="w-6 text-right font-mono text-[10.5px] text-black/50">{row.value}</span>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* the lifecycle */}
          <div id="lifecycle" className="relative mb-8 flex items-center gap-6">
            <div
              className="shrink-0 text-[13px] font-medium uppercase tracking-[-0.15px] text-[#343434]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {`{${CONTENT.lifecycleEyebrow.toUpperCase()}}`}
            </div>
            <div className="h-px flex-1 bg-black/[0.08]" aria-hidden />
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT.lifecycle.map((step) => (
              <div key={step.title} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <step.icon className="size-[18px] text-black/70" strokeWidth={1.75} />
                  <h4 className="text-[13.5px] font-medium uppercase tracking-[0.02em] text-black/85">
                    {step.title}
                  </h4>
                </div>
                <p className="text-[13.5px] leading-[1.6] text-black/50">{step.body}</p>
                <code className="mt-auto w-fit rounded bg-black/[0.04] px-2 py-1 font-mono text-[11px] text-black/50">
                  {step.op}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* the proof: split screen */}
        <section id="proof" className="border-t border-black/[0.08] bg-[#f6f6f4] px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-10 max-w-[600px]">
            <div className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-black/40">
              {CONTENT.proofEyebrow}
            </div>
            <h2
              className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-balance sm:text-[34px]"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {CONTENT.proofHeadline}
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-black/60">{CONTENT.proofBody}</p>
          </div>

          <div className="mb-5 text-[15px] font-medium text-black/80">{CONTENT.proofQuery}</div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-[#ebebeb] bg-white/60 p-7 opacity-80">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px] font-medium text-black/50">🤕 {CONTENT.vector.label}</span>
                <span className="text-[11px] uppercase tracking-[0.06em] text-black/30">{CONTENT.vector.sub}</span>
              </div>
              <p className="text-[16px] leading-[1.6] text-black/45">{CONTENT.vector.answer}</p>
            </div>
            <div className="rounded-lg border border-black/[0.12] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px] font-medium text-black">🧠 {CONTENT.graph.label}</span>
                <span className="text-[11px] uppercase tracking-[0.06em] text-black/40">{CONTENT.graph.sub}</span>
              </div>
              <p className="text-[16px] leading-[1.6] text-black/85">{CONTENT.graph.answer}</p>
              <div className="mt-4 border-t border-black/[0.06] pt-4 font-mono text-[12px] text-black/40">
                {CONTENT.graph.trail}
              </div>
            </div>
          </div>
        </section>

        {/* why onto — matches Figma node 32:1642 ("Steps"): pill badge + two-tone
            headline + right-aligned intro, then 3 numbered columns each with a
            faded number, a preview card, a bold title, and a muted description */}
        <section id="onto" className="border-t border-black/[0.08] px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-14 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex w-fit items-center rounded-full bg-[#fafafa] px-3.5 py-1.5 text-[13px] text-black/55">
                {CONTENT.ontoEyebrow}
              </div>
              <h2
                className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-balance sm:text-[34px]"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                <span className="text-black/45">{CONTENT.ontoHeadlineMuted} </span>
                <span className="text-black">{CONTENT.ontoHeadlineStrong}</span>
              </h2>
            </div>
            <p className="max-w-[42ch] text-[14.5px] leading-[1.65] text-black/55 lg:text-right">{CONTENT.ontoBody}</p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {CONTENT.ontoSteps.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-5">
                <p className="text-[56px] font-light leading-none text-black/10" style={{ fontFamily: "var(--font-geist)" }}>
                  {i + 1}
                </p>

                <div className="flex h-[180px] flex-col justify-center overflow-hidden rounded-md border border-black/[0.06] bg-[#f7f7f7] p-5">
                  {i === 0 && (
                    <div className="rounded border border-black/[0.06] bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] text-black/30">
                        <span className="size-1.5 rounded-full bg-black/15" />
                        <span className="size-1.5 rounded-full bg-black/15" />
                        <span className="size-1.5 rounded-full bg-black/15" />
                      </div>
                      <div className="flex flex-col gap-1.5 text-[11px]">
                        <span className="text-black/25 line-through">Accept Cookies</span>
                        <span className="text-black/25 line-through">Subscribe to our newsletter</span>
                        <span className="text-black/70">Doug left the suite with the tiger at 2am.</span>
                        <span className="text-black/25 line-through">© 2026 All rights reserved</span>
                      </div>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="rounded border border-black/[0.06] bg-white p-3 shadow-sm">
                      <div className="mb-2 text-[11px] font-medium text-black/70">Clean Markdown + trust</div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                          <div className="h-full w-[92%] rounded-full bg-black/70" />
                        </div>
                        <span className="font-mono text-[11px] text-black/60">92</span>
                      </div>
                      <div className="mt-2 h-1.5 w-3/4 rounded-full bg-black/[0.06]" />
                      <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-black/[0.06]" />
                    </div>
                  )}
                  {i === 2 && (
                    <code className="block rounded border border-black/[0.06] bg-white p-3 font-mono text-[11px] leading-[1.7] text-black/70 shadow-sm">
                      cognee.add(
                      <br />
                      &nbsp;&nbsp;metadata: {"{"} trust: 92 {"}"}
                      <br />
                      )
                    </code>
                  )}
                </div>

                <div>
                  <h3 className="mb-1.5 text-[16px] font-medium tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-[13.5px] leading-[1.6] text-black/55">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* built on real open source */}
        <section id="opensource" className="border-t border-black/[0.08] bg-[#f6f6f4] px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-10 max-w-[600px]">
            <div className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-black/40">
              {CONTENT.ossEyebrow}
            </div>
            <h2
              className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-balance sm:text-[34px]"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {CONTENT.ossHeadline}
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-black/60">{CONTENT.ossBody}</p>
          </div>
          {/* illustration style matches Figma node 34:1791: a nested white card holding
              a center icon badge with dotted connector lines out to satellite icons */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CONTENT.ossItems.map((item) => {
              const [Sat1, Sat2] = item.satellites;
              return (
                <div key={item.title} className="flex flex-col gap-4 rounded-lg bg-[#fafafa] p-3">
                  <div className="relative flex h-[120px] items-center justify-center overflow-hidden rounded-md bg-white shadow-[0_1.5px_1.5px_rgba(0,0,0,0.05)]">
                    <div className="absolute left-1/2 top-[30%] h-px w-[54px] -translate-x-[calc(100%+8px)] -translate-y-1/2 -rotate-[22deg] border-t border-dashed border-black/20" />
                    <div className="absolute left-1/2 top-[30%] h-px w-[54px] translate-x-[8px] -translate-y-1/2 rotate-[22deg] border-t border-dashed border-black/20" />
                    <div className="absolute left-1/2 top-[30%] flex size-8 -translate-x-[68px] -translate-y-[26px] items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                      <Sat1 className="size-3.5 text-black/50" strokeWidth={1.75} />
                    </div>
                    <div className="absolute left-1/2 top-[30%] flex size-8 translate-x-[36px] -translate-y-[26px] items-center justify-center rounded-full border border-black/[0.06] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                      <Sat2 className="size-3.5 text-black/50" strokeWidth={1.75} />
                    </div>
                    <div className="relative z-10 flex size-11 items-center justify-center rounded-full bg-[linear-gradient(104deg,#19191a_0%,#262626_34%,#19191a_51%,#262626_72%,#19191a_100%)] shadow-[0_6px_16px_rgba(0,0,0,0.18)]">
                      <item.icon className="size-5 text-white" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="px-2 pb-1">
                    <h3 className="mb-1 text-[14.5px] font-medium tracking-[-0.01em]">{item.title}</h3>
                    <p className="text-[13px] leading-[1.55] text-black/55">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-8 max-w-[68ch] text-[14px] leading-[1.6] text-black/55">
            <span className="font-medium text-black/80">{CONTENT.ossContribution}</span>
          </p>
        </section>

        {/* closing CTA */}
        <section className="border-t border-black/[0.08] px-6 py-16 text-center sm:px-10 sm:py-20">
          <h2
            className="mx-auto max-w-[20ch] text-[26px] font-medium leading-[1.2] tracking-[-0.02em] text-balance sm:text-[32px]"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            {CONTENT.closingHeadline}
          </h2>
          <a
            href={CONTENT.runLocallyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 border border-black/[0.08] bg-[#121212] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-black"
          >
            {CONTENT.closingCta}
          </a>
        </section>

        {/* footer */}
        <footer className="flex flex-col items-start gap-3 border-t border-black/[0.08] px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            <img src="/chow-icon.svg" alt="" className="size-[16px]" />
            {CONTENT.brand}
          </button>
          <p className="text-[13px] text-black/50">{CONTENT.footerLine}</p>
          <p className="text-[12px] text-black/35">{CONTENT.footerSub}</p>
        </footer>
      </div>
    </div>
  );
}
