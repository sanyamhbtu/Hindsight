import { NextRequest, NextResponse } from "next/server";
import { getApiUrl, getHeaders, addData, cognify } from "@/lib/cognee/client";

export async function POST(req: NextRequest) {
  try {
    const { sources, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";

    const dataPayload = sources.map((src: any) => {
      if (typeof src === 'string') return src;
      return src.content || src.text || JSON.stringify(src);
    }).join("\n\n");

    // Try V2 remember endpoint first
    const v2Attempt = await fetch(`${getApiUrl()}/remember`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        data: dataPayload,
        dataset_name: dataset
      })
    });

    if (v2Attempt.ok) {
      return NextResponse.json({ success: true, status: 'processing', v2: true });
    }

    if (v2Attempt.status === 404) {
      // Fall back to V1 pipeline
      await addData(dataset, sources);
      cognify(dataset, true); // runInBackground
      return NextResponse.json({ success: true, status: 'processing', v2: false, fallback: true });
    }

    // It failed for some other reason
    const errText = await v2Attempt.text();
    return NextResponse.json({ error: `V2 remember failed: ${errText}` }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
