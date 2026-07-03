# Hindsight - Project Architecture & Handover Document

This document provides a complete top-to-bottom overview of the **Hindsight** project. It is designed to act as a handover document for frontend, backend, or database engineers joining the project.

---

## 1. High-Level Overview
Hindsight is a full-stack web application designed to demonstrate the power of **Graph Retrieval-Augmented Generation (Graph RAG)** vs. Standard Vector RAG. 
Users upload unstructured documents (text, PDF, etc.) which are sent to a cloud-based graph engine (Cognee). The AI builds a knowledge graph from the documents, allowing users to ask complex questions that require multi-hop reasoning across different documents, which traditional vector databases fail at.

---

## 2. Frontend Architecture
The frontend is built for performance, interactivity, and aesthetics.

*   **Framework:** **Next.js 14 (App Router)** using React Server Components and Client Components.
*   **Styling:** **Tailwind CSS v4** combined with raw CSS tokens in `index.css` for custom parchment/noir/detective aesthetics.
*   **Animations:** **Framer Motion** handles page transitions, layout shifts, and micro-interactions (like the confetti or traversal trail).
*   **Graph Visualization:** **react-force-graph-2d / 3d** is used to render the interactive memory board.

### Core Pages (Routes):
1.  **`/` (Landing Page):** Handles file uploading and ingestion. It routes users into either "Detective Mode" (noir aesthetic) or "Research Mode" (clean aesthetic) based on a toggle state stored in a custom hook (`useDatasetSession`).
2.  **`/board` (Memory Board):** The interactive Knowledge Graph visualization. It pulls raw nodes and edges from the backend and renders them in a physics-based physics simulation.
3.  **`/ask` (The Query Interface):** A split-screen comparison.
    *   **Left (Hangover AI):** Displays standard vector search chunks.
    *   **Right (Hindsight):** Displays the graph-synthesized answer and the step-by-step traversal trail.
4.  **`/dashboard` (Memory Dashboard):** A stats page showing the number of nodes, edges, sources, and a table of extracted relationship triplets. Allows pruning via "Improve Memory".

---

## 3. Backend Architecture (Next.js API Routes)
The backend acts primarily as a secure proxy layer between the frontend and the **Cognee Cloud API**. It is completely serverless and runs on Next.js API Route Handlers (`src/app/api/...`).

### Internal API Routes:
*   **`POST /api/ingest`**: Receives `FormData` (files) from the frontend. It bypasses the standard SDK due to bugs and directly posts the raw text to Cognee's `/api/v1/add` endpoint, followed immediately by `/api/v1/cognify` to trigger the graph processing.
*   **`POST /api/ask`**: Handles user queries. It runs parallel fetch requests to Cognee:
    *   One request for `CHUNKS` (Vector search).
    *   One request for the specified graph search (e.g., `GRAPH_COMPLETION` or `SUMMARIES`).
    *   It cleanly maps and formats the results so the frontend doesn't crash on raw `[object Object]` responses.
*   **`GET /api/graph`**: Fetches the raw graph structure (nodes and edges) for a given dataset using Cognee's `/api/v1/datasets/{datasetId}/graph` endpoint. Used heavily by the `/board` and `/dashboard`.
*   **`POST /api/improve`**: Simulates graph pruning/optimization.
*   **`POST /api/forget`**: Instructs Cognee to delete the dataset from the cloud, wiping the memory.

---

## 4. Database & AI Engine (Cognee Cloud)
Hindsight does not use a traditional local database (like Prisma/Postgres) to store app state. **All document state, embeddings, and graph triplets are hosted remotely in the Cognee Cloud.**

### Database (Postgres via Neon)
While the app uses Cognee for the AI graph, the environment is pre-configured with Neon Postgres credentials. If future features require user authentication or saving search history, this database is ready to be used.

### Cognee Cloud (Graph/Vector Database)
Cognee acts as a hybrid engine:
1.  **Vector Store:** It chunks incoming text, embeds it, and stores it in a vector database.
2.  **Graph Database:** It runs an LLM over the text to extract Subject-Relation-Object triplets and stores them in a NetworkX-style graph.

---

## 5. External API Calls to Cognee Cloud
Because the standard `cognee-vercel-ai-sdk` had routing bugs, all external calls to Cognee are handled via direct `fetch` implementations located in `src/lib/cognee/client.ts`. 

**The primary Cognee Cloud Endpoints used:**
*   **ADD:** `POST {COGNEE_API_URL}/add` -> Uploads the payload to a dataset.
*   **COGNIFY:** `POST {COGNEE_API_URL}/cognify` -> Triggers the LLM processing pipeline.
*   **SEARCH:** `POST {COGNEE_API_URL}/search` -> Runs queries against the dataset. We pass specific `searchType` enums:
    *   `CHUNKS` -> Returns raw text pieces (Vector RAG).
    *   `GRAPH_COMPLETION` -> Returns the synthesized Graph RAG answer.
    *   `GRAPH_SUMMARY_COMPLETION` -> Returns broad dataset overviews (mapped from the UI's "Wolf Pack" mode).
*   **GRAPH DATA:** `GET {COGNEE_API_URL}/datasets/{datasetId}/graph` -> Returns `{ nodes: [], edges: [] }`.

---

## 6. Environment Variables & Keys
The project requires the following keys in the `.env` file to function. **Do not expose these to the frontend client.**

```env
# Neon Postgres Database (Ready for future auth/state storage)
DB_PROVIDER="postgres"
DB_HOST="YOUR_NEON_DB_HOST"
DB_PORT="5432"
DB_USERNAME="YOUR_DB_USERNAME"
DB_PASSWORD="YOUR_DB_PASSWORD"
DB_NAME="neondb"

# Cognee Cloud Engine Credentials (Required for all core RAG/Graph features)
# These MUST match the specific AWS tenant provided by Cognee
COGNEE_API_URL="https://YOUR_TENANT.aws.cognee.ai/api/v1"
COGNEE_TENANT_ID="YOUR_TENANT_ID"
COGNEE_USER_ID="YOUR_USER_ID"
COGNEE_API_KEY="YOUR_API_KEY"

# Optional: For web-scraping features if implemented in the future
ONTO_API_KEY="your_onto_api_key"
```
