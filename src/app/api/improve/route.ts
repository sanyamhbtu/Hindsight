import { NextResponse } from "next/server";
import { getApiUrl, getHeaders } from "@/lib/cognee/client";
import { getDatasetId } from "@/lib/cognee/datasetCache";

async function fetchGraphStats(datasetId: string) {
  try {
    const res = await fetch(`${getApiUrl()}/datasets/${datasetId}/graph`, {
      headers: getHeaders()
    });
    if (!res.ok) return { nodeCount: 0, edgeCount: 0 };
    const data = await res.json();
    return {
      nodeCount: data.nodes?.length || 0,
      edgeCount: data.edges?.length || 0
    };
  } catch {
    return { nodeCount: 0, edgeCount: 0 };
  }
}

export async function POST(req: Request) {
  try {
    const { datasetName } = await req.json();
    if (!datasetName) return NextResponse.json({ error: "No dataset" }, { status: 400 });

    const datasetId = await getDatasetId(datasetName);
    if (!datasetId) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    // Step 1: get before stats
    const beforeGraph = await fetchGraphStats(datasetId);

    // Step 2: run cognee.memify() for real and wait for it -- this is a
    // second pipeline pass over the already-cognified graph (triplet
    // embedding / enrichment), not a placeholder.
    const memifyRes = await fetch(`${getApiUrl()}/memify`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ datasets: [datasetName] })
    });
    if (!memifyRes.ok) {
      return NextResponse.json({ error: `memify failed: ${await memifyRes.text()}` }, { status: 502 });
    }

    // Step 3: get after stats
    const afterGraph = await fetchGraphStats(datasetId);

    return NextResponse.json({
      status: "success",
      message: "Memory improved via cognee.memify()",
      before: { nodes: beforeGraph.nodeCount, edges: beforeGraph.edgeCount },
      after: { nodes: afterGraph.nodeCount, edges: afterGraph.edgeCount },
      delta: {
        nodesChanged: afterGraph.nodeCount - beforeGraph.nodeCount,
        edgesChanged: afterGraph.edgeCount - beforeGraph.edgeCount
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
