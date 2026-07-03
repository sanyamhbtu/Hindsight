import { NextRequest, NextResponse } from "next/server";
import { getDatasetGraph } from "@/lib/cognee/client";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dataset = url.searchParams.get("dataset") || "detective_core";
    
    let rawGraph;
    try {
      rawGraph = await getDatasetGraph(dataset);
    } catch (error) {
      console.warn("Graph API: Failed to get dataset graph, returning empty graph.", error);
      rawGraph = { nodes: [], edges: [] };
    }

    // Transform raw graph for the EvidenceBoard UI
    const nodes = (rawGraph.nodes || []).map((node: any) => {
      let displayLabel = node.label || node.id;
      if (node.properties) {
        if (node.properties.name) {
          displayLabel = node.properties.name;
        } else if (node.properties.text) {
          displayLabel = node.properties.text.substring(0, 25) + (node.properties.text.length > 25 ? "..." : "");
        }
      }
      return {
        id: node.id,
        label: displayLabel,
        type: node.type || "Object",
        sourceFragment: node.properties?.document_id || node.properties?.source_id || undefined,
        trust: 85 // Mock trust score for now
      };
    });

    const edges = (rawGraph.edges || []).map((edge: any) => ({
      source: edge.source_node_id || edge.source,
      target: edge.target_node_id || edge.target,
      relation: edge.relationship_name || edge.relation || "connected_to"
    }));

    return NextResponse.json({ nodes, edges });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
