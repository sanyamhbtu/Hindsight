# Hindsight — Product Requirements Document

> **The memory engine that connects the dots you don't remember.**
>
> Your AI woke up on the roof with no idea how it got there. Hindsight reconstructs the night.

**Hackathon:** Cognee "Where's My Context?" — build AI that doesn't forget.
**🏆 Prize target:** **Best Use of Open Source** (MacBook / team member) — best build on the *self-hosted, open-source* Cognee.
**Status:** Counter-proposal to *Snake*. Smaller, unbreakable, Cognee dead-center.
**Build window:** Jun 29 – Jul 5 (3 real build days).
**Powered by:** Cognee OSS, self-hosted (memory) · Onto (intake) · Claude / Groq (synthesis).

---

## 0. TL;DR (read this if you read nothing else)

Hindsight ingests a pile of **scattered, messy sources** and builds them into a **Cognee knowledge graph**. Then it answers questions whose answers are **not contained in any single source** — by *traversing the connections between facts* instead of just retrieving the most similar chunk.

That capability — **multi-hop reasoning across fragments** — is exactly what a graph memory does and what plain vector RAG cannot. It is the purest possible showcase of *why Cognee exists*.

We ship it with **two faces, one engine:**
- **Detective mode ("Find Doug")** — curated chaos from "last night," reconstructed live. The wow.
- **Research mode** — real URLs/docs (cleaned + trust-scored by **Onto**), cross-source answers with citations. The product.

**The single winning demo moment:** same question, two engines, side by side.
Vector RAG → *"I don't know"* / confidently wrong. Hindsight graph → the correct answer **+ the trail of fragments it connected to get there.**
> "No single document said this. It reasoned across the graph."

---

## 0.5 The prize we're playing for — Best Use of Open Source

> **🏆 Best Use of Open Source** — a MacBook per team member for the best build on the **open-source** Cognee.

This reframes the whole build. The prize is judged by the **Cognee maintainers** and rewards **depth of engagement with the OSS itself** — not the slickest UI. So two non-negotiables drive every decision:

1. **Run self-hosted OSS Cognee** — the `cognee-ai/cognee` repo, Dockerized, with local graph + vector stores. Cloud credits (`COGNEE-35`) are *fallback only*, and we say so out loud.
2. **Use the internals + give back** — a **custom ontology**, a **custom pipeline Task**, `memify`, multiple search types, and an **open-source contribution (`cognee-onto`)**.

The detective demo wins the *room*. The OSS depth wins the *prize*. Full playbook in §5.5.

---

## 1. The problem (and why this hackathon exists)

Every LLM call is stateless. Agents forget across sessions and overflow their context window. The standard patch — vector RAG — has a deeper flaw the theme is begging someone to expose:

**Vector search retrieves the chunk most *similar* to your question. It cannot answer a question whose answer is *distributed across several chunks*.**

- Fragment A: "Doug left the suite with the tiger at 2am."
- Fragment B: "Security found the tiger on the roof at 4am."
- Question: "Where's Doug?"

Vector RAG returns A or B (whichever is more similar) and stops. The answer — *the roof* — lives in the **edge between A and B**, not in either one. You need a graph and you need to walk it. That is Cognee's home turf, and almost nobody at the hackathon will demonstrate it this cleanly.

---

## 2. What we are building (plain English)

A web app. The user gives Hindsight a bunch of scattered sources — paste text fragments, upload files, or drop in URLs. Hindsight then:

1. **Ingests** them. URLs are cleaned + trust-scored by **Onto** first; files/text go straight in. → `cognee.add`
2. **Builds a knowledge graph** — extracts entities (people, places, things, events) and the relations between them. → `cognee.cognify`
3. **Shows you the graph** — an interactive node/edge map, nodes tinted by trust score.
4. **Answers by traversal** — you ask a question; it walks the graph to assemble an answer no single fragment held, and **shows the path it took**. → `cognee.search(GRAPH_COMPLETION)`
5. **Gets smarter** — enriches and re-weights memory from feedback. → `cognee.memify`
6. **Forgets on command** — surgically removes a source/person and proves the graph no longer knows it. → `cognee.forget` / prune

**It is one engine.** "Find Doug" is the demo costume; "research copilot" is the same engine pointed at real sources. Do not build two things — build one engine and give it two front doors.

---

## 3. The core insight (why this wins)

| | Vector RAG | Hindsight (Cognee graph) |
|---|---|---|
| Retrieves | most *similar* chunk | *connected* facts via edges |
| Answers questions in one doc | ✅ | ✅ |
| Answers questions spread across docs | ❌ | ✅ **(the whole point)** |
| Knows *why* it answered | ❌ black box | ✅ shows the traversal trail |
| Source trust | none | 0–100 per node (via Onto) |

The demo proves this in **one screen, one flag difference**: Cognee's own `search_type` switches between `RAG_COMPLETION` (vector) and `GRAPH_COMPLETION` (graph). Same question, same data, dramatically different answer. That's not a gimmick — it's the literal difference the hackathon is about.

---

## 4. Where Cognee fits (the whole lifecycle, visible on screen)

We make every Cognee operation a *thing the judge can watch happen*:

| Cognee op | What Hindsight does with it | Where it shows |
|---|---|---|
| `add` | take cleaned fragments/sources into a dataset | Ingest panel: sources stream in |
| `cognify` | extract entities + relations → build the graph | Graph viz draws itself live |
| `search(GRAPH_COMPLETION)` | multi-hop answer + traversal trail | Ask box: answer + highlighted path |
| `search(RAG_COMPLETION)` | the "dumb" vector baseline for the split-screen | Left panel of the demo |
| `memify` / improve | enrich graph, re-weight by trust + feedback | "Before/After memify" toggle on the graph |
| `forget` / prune | excise a source; graph forgets it | "Forget last night" button + re-query proof |

This is the answer to the highest-weighted criterion, **Best Use of Cognee**: we don't bury Cognee as a dependency — we put all four lifecycle ops on stage.

---

## 5. Where Onto fits (and why it's necessary, not decorative)

**Cognee is a graph. A graph is only as good as the text you feed `cognify`.** Feed it raw web HTML and it cheerfully extracts nodes like `"Accept Cookies"`, `"Subscribe"`, `"© 2026"`, plus phantom relations off nav bars — and those junk nodes poison **every future traversal**. Garbage in → untraversable graph.

**Onto is the intake membrane.** Before any URL reaches `cognee.add`:

```
URL → Onto read_and_score → { clean Markdown, trustScore 0–100 } → cognee.add(metadata: { source, trust })
```

- `map_site` → discover the full doc set when the user says "ingest our docs."
- `read_url` / `batch` → clean many sources at once.
- `read_and_score` → clean Markdown **+** a 0–100 AIO trust score that becomes **node metadata**.
- `score_url` → trust threshold drives `memify` (up-weight trusted) and `forget` (prune low-trust).

**The airtight necessity argument:** Detective mode uses curated clean fragments — fine, no Onto needed there. But the moment Research mode ingests *real* web sources (and the "here's what it does at scale" beat), Onto is the only thing standing between a clean traversable graph and noise soup. **Onto is what makes the graph worth traversing at real-world scale.** It also gives us a unique on-screen feature no other team has: a **trust-tinted knowledge graph**.

Onto → Cognee maps cleanly onto the lifecycle:
- `remember()` ← Onto `map_site` + `read_url`/`batch` (clean intake)
- `recall()` ← trust scores let traversal rank/filter by source trust
- `improve()`/memify ← Onto `score_url` re-weights trusted nodes, prunes noise
- `forget()` ← low-trust threshold → surgical prune

---

## 5.5 Winning "Best Use of Open Source" (the real target) ⭐

The prize rewards **depth on the self-hosted OSS Cognee** and **contributing back** — not UI polish. Three rules.

### Rule 1 — Run the open source, and make it obvious
The core engine is the `cognee-ai/cognee` repo, self-hosted via Docker, with a local graph store + Qdrant. Cloud is fallback only. In the demo, say the line: **"This is 100% the open-source Cognee, self-hosted — here's the repo and our config."**

### Rule 2 — Go past `add / cognify / search`. Use the machinery.
This is what separates "used a library" from "best use of the open source":

1. **Custom ontology / DataPoint models — the signature move.** Define domain-shaped Pydantic node types — `Person`, `Place`, `Event`, `Object`, `Transaction`, `Document` — with typed relations (`ATTENDED`, `LEFT_WITH`, `LOCATED_AT`, `PAID_FOR`). A generic graph = "used Cognee." A *purpose-built ontology* = "best use of Cognee." It's mostly just Pydantic, and it makes the graph traversal sharper *and* the viz legible.
2. **A custom pipeline Task.** `cognify` is a composable pipeline of Tasks — so we add our own: an **Onto intake + trust-scoring Task** that cleans web sources and writes a trust score onto nodes. Writing a Task (not just calling the API) proves you understand the architecture.
3. **`memify`, for real.** Use the OSS self-improvement loop + feedback to up-weight trusted nodes and prune noise. Show before/after on the graph.
4. **Multiple `SearchType`s.** Don't ship one. Show `GRAPH_COMPLETION` (the answer), `INSIGHTS` (raw relations), `CHUNKS` (the vector baseline for the split-screen). Range = depth.
5. **Show the swappable architecture.** Pluggable graph store (NetworkX → Kuzu / Neo4j) and vector store (Qdrant). Even naming the config on stage proves you know what's under the hood.
6. **Isolation via `ENABLE_BACKEND_ACCESS_CONTROL`.** Per-user memory stores — cheap to enable, real OSS feature, real talking point.

> ⚠️ Day-0 task: verify the exact extension points (custom Task signature, custom DataPoint/ontology API, `SearchType` enum) against the *current* Cognee repo. These are real OSS features; the exact signatures must be confirmed, not assumed.

### Rule 3 — Contribute back. This is how you actually win it.
Ship **`cognee-onto`**: an open-source ingestion adapter / custom Task that lets *any* Cognee user pull web sources in as **clean, trust-scored Markdown**. Either a PR to upstream Cognee (a new loader + example) or a standalone published package + a Cognee community example. *Submitting/publishing* is enough — merge timing doesn't matter. This one artifact:

- proves deep OSS use (built on Cognee's own extension points),
- makes **Onto structurally necessary** (it *is* a Cognee data loader),
- benefits the whole community — the literal definition of "best use of open source,"
- gives you a concrete thing to point at: a live PR / package URL.

**The one-liner for this prize:** *"We didn't just call Cognee — we gave it a custom ontology, wrote a pipeline Task, and shipped an open-source loader so the whole community can feed it clean, trust-scored web data."*

---

## 6. Features

### Detective mode ("Find Doug") — the demo skin
- Pre-loaded "last night" evidence set: ~15 messy fragments (texts, receipts, photo captions, voicemail transcripts, a hotel invoice).
- Ask anything: "Where's Doug?", "Who paid for the tiger?", "What time did it go wrong?"
- Answer comes back **with the traversal trail** highlighted on the graph.
- The split-screen toggle: vector vs graph, same question.

### Research mode — the engine's real face
- Paste URLs / upload docs → Onto-cleaned, trust-scored ingest.
- Cross-source questions with **citations + per-source trust badges**.
- "Karpathy Wiki, but yours" — a living, queryable knowledge graph of anything you read.

### Shared engine features
- **Live knowledge graph** (nodes tinted by trust score).
- **memify before/after** — watch the graph get richer/cleaner.
- **forget()** — remove a source and prove the graph no longer knows it.
- **Cross-session memory** — close the tab, come back, ask again, it still remembers.

---

## 7. The hero demo (the 90 seconds that win)

**Screen: split in two. Same evidence loaded into both. Same question typed once.**

- **Left — "AI with a hangover" (vector RAG):** searches for the most similar fragment, returns *"I'm not sure where Doug is"* or a wrong guess. Forgets between sessions.
- **Right — Hindsight (graph):** highlights Fragment A → edge → Fragment B → edge → conclusion, and answers **"Doug is on the roof."** Then you reload the page and ask again — still remembers.

Voiceover: *"Neither document said 'Doug is on the roof.' The left agent never will. The right one reasoned across the graph to get there — and it'll still know tomorrow."*

Then the kicker: switch to Research mode, drop in a real messy webpage. Show it ingested raw = junk nodes; ingested via **Onto** = clean trust-scored graph. *"And at real-world scale, this is the difference between a memory you can trust and noise."*

---

## 8. Architecture & stack (deliberately small)

```
┌────────────────────────────────────────────────┐
│  Next.js (App Router) + Tailwind + shadcn/ui    │  ← one app, that's it
│  - Ingest panel   - Graph viz   - Ask box       │
│  - Split-screen demo   - memify/forget controls │
└───────────────┬────────────────────────────────┘
                │ HTTP
        ┌───────┴────────┐         ┌──────────────┐
        │  Onto (intake) │         │  LLM (answer  │
        │ read_and_score │         │  synthesis):  │
        │ map_site/batch │         │ Claude/Groq   │
        └───────┬────────┘         └──────────────┘
                │ clean MD + trust
        ┌───────┴───────────────────────────────┐
        │  Cognee (Docker, REST service)        │
        │  add · cognify · memify · search ·    │
        │  forget · visualize_graph             │
        │     └── Qdrant (vector store)         │
        │     └── graph store (Cognee default)  │
        └───────────────────────────────────────┘
```

**Stack table**

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 15 + TS + Tailwind + shadcn | one app, fast to build |
| Graph viz | react-force-graph (or Cytoscape) | the visual wow |
| Memory | **Cognee** as a Docker REST service | the star |
| Vector | Qdrant (Docker) | Cognee's hybrid half |
| Intake | **Onto** (MCP/REST) | clean + trust-score web sources |
| Synthesis LLM | Claude Sonnet (own key) or Groq | answer phrasing; Cognee does its own extraction |
| Persistence | Cognee datasets (+ optional Postgres for sessions) | keep it minimal |

**One rule (same as Snake's):** Cognee runs as a service; the Node app calls it over HTTP. Never import Python into Node.

**Why this is safe vs Snake:** ~3 services instead of ~9. No Trigger.dev, no E2B, no Mastra, no codegen, no 12-agent orchestration. Fewer moving parts = it actually works on demo day.

---

## 9. Data flow (one request, end to end)

```
1. User drops sources (text / files / URLs)
2. For each URL:  Onto.read_and_score(url) → { markdown, trust }
3. cognee.add({ data: markdown, dataset, metadata: { source, trust } })
4. cognee.cognify(dataset)                    → graph built
5. cognee.visualize_graph(dataset)            → nodes/edges to UI (tint by trust)
6. User asks a question:
     a. cognee.search(q, RAG_COMPLETION)       → left panel (baseline)
     b. cognee.search(q, GRAPH_COMPLETION)      → right panel (answer + trail)
7. Optional: cognee.memify(dataset)           → enrich + re-weight
8. Optional: cognee.forget(source)            → prune + re-query proof
```

*(Verify exact Cognee REST paths / search-type enums against current Cognee docs on Day 0 — names like `GRAPH_COMPLETION` / `RAG_COMPLETION` and `memify` are conceptual here.)*

---

## 10. Screens (the UI)

1. **Landing / Ingest** — big drop zone, mode toggle (🕵️ Detective / 🔬 Research), "Find Doug" example button.
2. **Graph** — live force-directed knowledge graph, nodes tinted by trust, click a node to inspect its source.
3. **Ask** — question box → answer with the traversal trail highlighted on the graph; citations + trust badges in Research mode.
4. **The Split-Screen** — vector vs graph, side by side. The pitch.
5. **Memory controls** — `memify` before/after toggle, `forget()` button with re-query proof, "reload to prove cross-session memory."

---

## 11. Build order (Jun 29 – Jul 5)

**Day 0 — self-host + ontology + spine.** Self-host OSS Cognee from `cognee-ai/cognee` via Docker (+ Qdrant). Redeem `COGNEE-35` as *fallback only*. Onto key (already in `~/.claude.json`). Groq + $5 Anthropic key. **Define the custom ontology** — Pydantic `DataPoint` models: `Person / Place / Event / Object / Transaction / Document` + typed relations. Confirm the custom-Task + ontology + `SearchType` APIs against the current repo. Write the "Find Doug" fragment set (15 fragments). Goal: a script does `add → cognify → search(GRAPH_COMPLETION)` on our ontology and prints "the roof."

**Day 1 — custom Task + engine + ingest UI.** Implement the **Onto intake as a custom Cognee pipeline Task** (clean + trust-score → node metadata). Cognee client wrapper (`lib/cognee/client.ts`). Next.js skeleton: ingest panel → graph renders. Goal: drop fragments in the UI, see the *ontology-shaped* graph draw itself.

**Day 2 — the demo.** The split-screen (RAG vs GRAPH). Traversal-trail highlight on the graph. Trust tinting. `memify` before/after toggle. Goal: the hero demo works end to end on the Doug set.

**Day 3 — Research mode + the contribution + polish.** Onto URL ingest (the "scale" beat, proves Onto necessity). `forget()` demo. **Package `cognee-onto` and open the PR / publish it — this is the prize artifact.** README, 2-min recording, **and a pre-recorded fallback of the hero demo** in case live ingest is slow. Goal: shippable + presentable + un-crashable + *a contribution to point at*.

---

## 12. Scope guardrails

**Will NOT build (resist the urge):**
- No multi-agent orchestration / codegen (that was Snake).
- No auth beyond a simple session id.
- No user-generated mode-switching complexity — two preset modes only.
- No deploy-an-endpoint / MCP-export / "eject" feature for v1.

**Cut order if time is short:** graph-viz prettiness → memify before/after animation → Research-mode polish. **Never cut:** the live graph, the split-screen vector-vs-graph demo, the **custom ontology**, and the **`cognee-onto` open-source contribution**. The first two are the pitch; the last two are the prize.

**Stretch (only if ahead):** voice input for questions; "trust slider" that re-filters the graph live; export the graph as an image; a third real dataset (e.g. ingest a research paper set).

---

## 13. How we score on the judging criteria

| Criterion | How Hindsight earns it |
|---|---|
| **Potential Impact** | Same engine = detective, research copilot, investigation, support memory. Multi-hop-over-fragments is a general capability. |
| **Creativity** | Turns the event's own meme into a playable showcase; trust-tinted graph is novel. |
| **Technical Excellence** | Small, clean, ~3 services, runs live without crashing. Engineering judgment *is* the restraint. |
| **Best Use of Cognee** ⭐ | All four lifecycle ops on screen; the purest demo of graph-over-vector reasoning anyone will show. |
| **User Experience** | One question, instant visual answer with a visible "why." Intuitive, fast. |
| **Presentation** | The split-screen + "no document said this" reveal is a memorable, repeatable moment. Fallback recording guarantees it lands. |

> **🏆 Tuned for "Best Use of Open Source":** the prize rewards depth on the *self-hosted OSS* Cognee, not Cloud. Hindsight scores it directly — custom ontology + custom pipeline Task + `memify` + multiple `SearchType`s prove deep internal use, and the open-source **`cognee-onto`** loader is the give-back the maintainers reward most. See §5.5.

---

## 14. The pitch (one-liners to memorize)

- **The hook:** "Your AI woke up on the roof with no memory of last night. Hindsight reconstructs the whole night — from clues that never mention the roof."
- **The insight:** "Vector search finds the most similar sentence. Hindsight finds the answer that isn't in any single sentence."
- **The Cognee line:** "Cognee gives the agent a graph memory. We put the whole memory lifecycle — remember, recall, improve, forget — on screen where you can watch it think."
- **The Onto line:** "And Onto is the bouncer at the door: it cleans and trust-scores every source, so the graph is built from things worth remembering — not web sludge."
- **The close:** "Not a memory that *stores*. A memory that *connects.*"

---

## 15. Open questions to resolve Day 0
- Exact Cognee REST endpoints + `search_type` enum values in the current container build.
- Does the Cognee container expose `visualize_graph` over REST, or do we read nodes/edges and render ourselves? (Plan B: read graph store directly and feed react-force-graph.)
- Onto: confirm `read_and_score` returns the 0–100 score in the shape we want for node metadata.
- Trust granularity: confirm we're doing **source/document-level** trust (each doc carries its Onto score, nodes inherit it) — node-level is out of scope for 3 days.
