# HINDSIGHT 🧠🕵️‍♂️
> *"Your AI woke up on the roof with no memory of last night. Hindsight connects the dots you don't remember."*

Hindsight is a next-generation AI reasoning platform built to showcase the power of **Graph-based Retrieval-Augmented Generation (Graph RAG)** compared to standard Vector RAG. 

Designed with a vintage detective noir aesthetic combined with modern, glowing interactive elements, the platform allows users to ingest scattered, chaotic data ("evidence" or "research") and watch the AI seamlessly piece together the truth using multi-hop graph traversal.

---

## 📖 The Problem
Standard Vector RAG is excellent at finding *similar text*. It is fundamentally flawed when asked to synthesize a conclusion that exists **between** multiple chunks of data.

**Example Scenario:**
- **Fragment A:** "Phil texted that Doug was with them at 11:47pm."
- **Fragment B:** "Security found a man on the rooftop at 8am, Suite 3200 key in his pocket."
- **Question:** "Where is Doug?"

**The Result:**
- **Vector RAG (Hangover AI)** → *"I'm not sure where Doug is."* (Because no single sentence explicitly says Doug is on the roof).
- **Graph RAG (Hindsight)** → *"Doug is on the roof of Caesar's Palace."* (By extracting entities, building relationships, and traversing the graph).

---

## 🎯 Product Requirements (PRD)

### 1. User Personas & Modes
The platform supports two distinct visual and functional modes to cater to different demonstrations:
- **Detective Mode (Default):** Noir styling, typewriters, case files, suspects, and chaotic crime scenes. Ideal for the "Hangover" style demo.
- **Research Mode:** Clinical, neon, academic styling. Designed for demonstrating medical, scientific, or dense analytical document parsing.

### 2. Core Features & Architecture
- **Dynamic File Ingestion:** Users can drag-and-drop `.txt`, `.pdf`, `.docx`, `.md`, or `.json` files. The system uploads these to the Cognee cloud engine for processing (`add()` -> `cognify()`).
- **Memory Board (Graph Visualizer):** An interactive 2D/3D force-directed graph built using `react-force-graph` that visualizes nodes (entities) and edges (relationships) in real-time as data is ingested.
- **The "Ask" Interface (A/B Testing):** A split-screen UI that queries the dataset. 
  - *Left Side (Hangover AI):* Displays standard Vector RAG chunk results (showing the raw, unconnected data).
  - *Right Side (Hindsight):* Displays the synthesized Graph Completion answer, alongside a visual "Traversal Trail" proving how the AI arrived at the conclusion.
- **Search Modes:**
  - `STANDARD (Graph Completion)`: Standard entity extraction and multi-hop traversal.
  - `DEEP REASONING (Chain of Thought)`: Forces the AI to show its step-by-step logic.
  - `WOLF PACK (Summaries)`: High-level overview and synthesized summary of the entire dataset.
- **Memory Dashboard:** A control center showing total nodes, edges, and sources. Includes an "Improve Memory" feature that allows users to prune redundant connections (`improve()`) and view extracted relationship triplets.

### 3. Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion (micro-animations, page transitions).
- **Graph Visualization:** `react-force-graph-2d` / `3d`
- **AI / Memory Engine:** Cognee Cloud (Graph Database & Vector Store)
- **Styling:** Custom CSS tokens, grain filters, and CSS grids.

---

## ⚙️ Cognee API Integration Strategy

Hindsight heavily utilizes the **Cognee SDK** to manage memory states:

| Operation | Implementation in Hindsight |
|---|---|
| `add()` | Appends the uploaded documents/fragments into the selected dataset. |
| `cognify()` | Triggers the knowledge graph construction (extracting entities/relationships). |
| `search(GRAPH_COMPLETION)` | Performs multi-hop traversal to provide the synthesized "Hindsight" answer. |
| `search(CHUNKS)` | Retrieves raw vector embeddings for the "dumb" Hangover AI comparison. |
| `search(GRAPH_SUMMARY_COMPLETION)` | Triggers the Wolf Pack mode for broad dataset understanding. |
| `api/graph` (Custom) | Fetches raw nodes and edges for rendering the interactive Memory Board and Dashboard. |

---

## 📂 Project Structure

```
hindsight/
├── src/
│   ├── app/
│   │   ├── ask/         # The split-screen A/B search interface
│   │   ├── board/       # Interactive Force-Graph visualizer
│   │   ├── dashboard/   # Node/Edge stats and pruning interface
│   │   ├── api/         # Next.js Serverless routes proxying Cognee Cloud
│   ├── components/      # Reusable UI (Sidebar, Dropzone, Modals, TraversalTrail)
│   ├── hooks/           # useDatasetSession (Manages Detective vs Research modes)
│   ├── lib/
│   │   ├── cognee/      # Direct fetch wrappers for the Cognee API
│   │   ├── detective/   # Pre-loaded mock data for the demo
```

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/your-username/hindsight.git
cd hindsight
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Cognee Cloud credentials:
```env
COGNEE_API_URL="https://tenant-...aws.cognee.ai/api/v1"
COGNEE_TENANT_ID="your_tenant_id"
COGNEE_API_KEY="your_api_key"
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to begin your investigation.

---

*Hindsight - Because the truth is in the connections.*
