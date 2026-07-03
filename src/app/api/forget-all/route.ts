import { NextResponse, NextRequest } from "next/server";
import { deleteDataset, getDatasetGraph, addData, cognify } from "@/lib/cognee/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dataset = body.datasetName || "detective_core";
    const mode = body.mode || 'nuclear';
    const targetFragment = body.targetFragment;
    
    if (mode === 'nuclear') {
      const success = await deleteDataset(dataset);
      if (success) {
        return NextResponse.json({ success: true, mode });
      } else {
        return NextResponse.json({ error: "Failed to delete dataset from Cognee" }, { status: 500 });
      }
    } else if (mode === 'surgical' && targetFragment) {
      // 1. Fetch current data / fragments (mocked here or use external store)
      // Since Cognee v1.1.3 doesn't have a reliable per-item delete, 
      // we do the following: delete dataset, re-add everything except the targeted one.
      // NOTE: In a real app we'd have the original sources to re-add.
      // Assuming 'body.remainingSources' is provided by the frontend for this demo.
      
      const success = await deleteDataset(dataset);
      if (!success) {
        return NextResponse.json({ error: "Failed to wipe dataset before surgical re-add" }, { status: 500 });
      }
      
      if (body.remainingSources && body.remainingSources.length > 0) {
        await addData(dataset, body.remainingSources);
        cognify(dataset, true);
      }
      
      return NextResponse.json({ success: true, mode, message: "Surgical deletion initiated. Re-building graph..." });
    }
    
    return NextResponse.json({ error: "Invalid mode or missing targetFragment" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
