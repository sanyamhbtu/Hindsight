import { NextRequest, NextResponse } from "next/server";
import { search, getDatasetGraph } from "@/lib/cognee/client";
import { DETECTIVE_SYSTEM_PROMPT } from "@/lib/detective/fragments";

const PROMPTS: any = {
  GRAPH_COMPLETION: DETECTIVE_SYSTEM_PROMPT,
  CHUNKS: undefined
};

// The traversal trail is derived from the real node/edge graph (via
// getDatasetGraph), not a SearchType search -- TRIPLET_COMPLETION requires
// memify() to have already run and returns an LLM completion string, not
// structured triplets, so it can't back this.
function relationsFromGraph(graph: { nodes?: any[]; edges?: any[] }): any[] {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const labelById = new Map(nodes.map((n: any) => [n.id, n.label || n.id]));

  return edges.map((edge: any) => ({
    subject: labelById.get(edge.source) || edge.source || 'Unknown',
    relation: edge.relation || 'CONNECTED_TO',
    object: labelById.get(edge.target) || edge.target || 'Unknown'
  })).filter(t => t.subject !== 'Unknown' && t.object !== 'Unknown');
}

export async function POST(req: NextRequest) {
  try {
    const { question, datasetName, searchType = "GRAPH_COMPLETION" } = await req.json();
    const dataset = datasetName || "detective_core";
    
    // Extract synthesized answers directly from Cognee's output
    const extractAnswer = (results: any, isChunks = false) => {
      if (!results) return "No data found.";
      const formatItem = (r: any) => {
        let text = "";
        if (typeof r === 'string') text = r;
        else if (r && r.text) text = r.text;
        else if (r && r.content) text = r.content;
        else text = JSON.stringify(r);

        if (isChunks && text.length > 150) {
          return text.substring(0, 150) + "...";
        }
        return text;
      };

      if (Array.isArray(results)) {
        if (results.length > 0 && results[0].search_result) {
          const sr = Array.isArray(results[0].search_result) ? results[0].search_result : [results[0].search_result];
          return sr.map(formatItem).join("\n");
        }
        return results.map(formatItem).join("\n\n");
      }
      
      if (typeof results === 'object' && results !== null) {
         if (results.search_result) {
            const sr = Array.isArray(results.search_result) ? results.search_result : [results.search_result];
            return sr.map(formatItem).join("\n");
         }
         return formatItem(results);
      }
      
      return "No data found.";
    };

    const activeSearchType = searchType === 'TEMPORAL' ? 'TEMPORAL' : 'GRAPH_COMPLETION_CONTEXT_EXTENSION';

    // Parallel searches + the raw graph (for the traversal trail)
    const [graphResults, chunksResults, graphData] = await Promise.all([
      search(dataset, question, activeSearchType, {
        topK: 5,
        systemPrompt: PROMPTS["GRAPH_COMPLETION"],
        save_interaction: true
      }).catch((e) => { console.warn(`${activeSearchType} search failed:`, e); return []; }),
      search(dataset, question, "CHUNKS", { topK: 3 }).catch((e) => { console.warn("CHUNKS search failed:", e); return []; }),
      getDatasetGraph(dataset).catch((e) => { console.warn("graph fetch for trail failed:", e); return { nodes: [], edges: [] }; })
    ]);

    const graphAnswer = extractAnswer(graphResults);
    const chunksAnswer = extractAnswer(chunksResults, true);

    const normalizedInsights = relationsFromGraph(graphData);

    let trail: any[] = [];
    if (normalizedInsights.length > 0) {
      trail = normalizedInsights
        .filter((triplet: any) => {
          const sub = (triplet.subject || "").toLowerCase();
          const obj = (triplet.object || "").toLowerCase();
          const ans = graphAnswer.toLowerCase();
          return ans.includes(sub) || ans.includes(obj);
        })
        .slice(0, 5); // max 5 hops
    }

    // Call out to session memory to persist interaction
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const sessionId = "detective_session_1"; // Default for demo
    
    fetch(`${protocol}://${host}/api/session/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer: graphAnswer, sessionId })
    }).catch(e => console.error("Session remember failed", e)); // Fire and forget

    return NextResponse.json({
      vector: { answer: chunksAnswer },
      graph: { answer: graphAnswer, trail, insights: normalizedInsights, searchTypeUsed: activeSearchType },
      raw: { graphResults, chunksResults }
    });
  } catch (error: any) {
    console.error("Ask error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
