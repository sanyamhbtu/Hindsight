import { NextRequest, NextResponse } from "next/server";
import { addData, cognify, ontoIngest } from "@/lib/cognee/client";
import { DETECTIVE_EXTRACTION_PROMPT } from "@/lib/detective/fragments";

export async function POST(req: NextRequest) {
  try {
    const { sources, mode, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";

    const urlSources = sources.filter((src: any) => src.type === "url").map((src: any) => src.content);
    const otherSources = sources.filter((src: any) => src.type !== "url");

    if (urlSources.length > 0) {
      // Custom Cognee pipeline Task: the service cleans + trust-scores each
      // URL via Onto and writes it straight onto a Document node.
      await ontoIngest(dataset, urlSources, true);
    }

    if (otherSources.length > 0) {
      await addData(dataset, otherSources);
      const customPrompt = mode === 'detective' ? DETECTIVE_EXTRACTION_PROMPT : undefined;
      cognify(dataset, true, customPrompt);
    }

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
