import { NextRequest, NextResponse } from "next/server";
import { getApiUrl, getHeaders } from "@/lib/cognee/client";
import { getDatasetId } from "@/lib/cognee/datasetCache";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const datasetName = searchParams.get('datasetName') || searchParams.get('dataset');
  
  if (!datasetName) return NextResponse.json({ error: "Dataset name is required" }, { status: 400 });
  
  const datasetId = await getDatasetId(datasetName);
  
  if (!datasetId) {
    return NextResponse.json({ status: 'not_found', nodeCount: 0, edgeCount: 0 });
  }
  
  try {
    const statusRes = await fetch(
      `${getApiUrl()}/datasets/status?dataset=${datasetId}`,
      { headers: getHeaders() }
    );
    const statusData = await statusRes.json();
    const rawStatus = statusData[datasetId] || 'DATASET_PROCESSING_COMPLETED';
    
    let nodeCount = 0, edgeCount = 0;
    if (rawStatus === 'DATASET_PROCESSING_COMPLETED' || rawStatus === 'done') {
      const graphRes = await fetch(
        `${getApiUrl()}/datasets/${datasetId}/graph`,
        { headers: getHeaders() }
      );
      if (graphRes.ok) {
        const graphData = await graphRes.json();
        nodeCount = graphData.nodes?.length || 0;
        edgeCount = graphData.edges?.length || 0;
      }
    }
    
    return NextResponse.json({
      status: mapStatus(rawStatus),
      datasetId,
      nodeCount,
      edgeCount,
      raw: rawStatus
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function mapStatus(raw: string): string {
  if (raw.includes('STARTED') || raw.includes('processing')) return 'processing';
  if (raw.includes('COMPLETED') || raw.includes('done')) return 'done';
  if (raw.includes('ERROR') || raw.includes('error')) return 'error';
  return 'done'; // safe fallback
}
