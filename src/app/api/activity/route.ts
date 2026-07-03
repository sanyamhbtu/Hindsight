import { NextRequest, NextResponse } from "next/server";
import { getApiUrl, getHeaders } from "@/lib/cognee/client";
import { getDatasetId } from "@/lib/cognee/datasetCache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const datasetName = searchParams.get('datasetName');
    
    if (!datasetName) return NextResponse.json({ runs: [] });
    
    const datasetId = await getDatasetId(datasetName);
    if (!datasetId) return NextResponse.json({ runs: [] });
    
    const runsRes = await fetch(
      `${getApiUrl()}/activity/pipeline-runs?dataset_id=${datasetId}`,
      { headers: getHeaders() }
    );
    
    if (!runsRes.ok) {
      return NextResponse.json({ runs: [] });
    }
    
    let runs;
    try {
      runs = await runsRes.json();
    } catch (e) {
      console.warn("Activity API: Failed to parse JSON response", e);
      return NextResponse.json({ runs: [] });
    }
    
    // Safety check if response is not an array (e.g. empty object)
    if (!Array.isArray(runs)) {
      return NextResponse.json({ runs: [] });
    }
    
    return NextResponse.json({
      runs: runs.map((run: any) => ({
        id: run.id,
        type: run.pipeline_type,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        durationMs: run.duration_ms
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
