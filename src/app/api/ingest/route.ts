import { NextRequest, NextResponse } from "next/server";
import { addData, cognify } from "@/lib/cognee/client";
import { readAndScore } from "@/lib/onto/client";
import { DETECTIVE_EXTRACTION_PROMPT } from "@/lib/detective/fragments";

export async function POST(req: NextRequest) {
  try {
    const { sources, mode, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";

    const processedData = await Promise.all(
      sources.map(async (src: any) => {
        if (src.type === "url") {
          try {
            const ontoData = await readAndScore(src.content);
            return {
              content: ontoData.markdown || `Fallback content for ${src.content}`,
              trust: ontoData.trust_score || 50,
              source: src.content
            };
          } catch (err) {
            console.warn(`Failed to process URL ${src.content}:`, err);
            return {
              content: `Failed to fetch or parse content from ${src.content}`,
              trust: 50,
              source: src.content
            };
          }
        }
        return src;
      })
    );

    // 1. Add data to Cognee
    await addData(dataset, processedData);

    // 2. Trigger graph build (cognify) with runInBackground: true
    const customPrompt = mode === 'detective' ? DETECTIVE_EXTRACTION_PROMPT : undefined;
    
    // We already wrapped this in fire-and-forget in client.ts
    // with run_in_background = true
    cognify(dataset, true, customPrompt);

    return NextResponse.json({ 
      success: true, 
      status: 'processing',
      datasetName: dataset,
      message: 'Evidence received. Cognee is building the graph...'
    }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
