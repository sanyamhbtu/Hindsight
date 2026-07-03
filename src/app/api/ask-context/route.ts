import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/cognee/client";

export async function POST(req: NextRequest) {
  try {
    const { question, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";

    const contextResult = await search(dataset, question, 'GRAPH_COMPLETION', {
      only_context: true
    });
    
    let answerText = "No context found.";
    if (contextResult) {
       if (Array.isArray(contextResult) && contextResult.length > 0) {
          answerText = typeof contextResult[0] === 'string' ? contextResult[0] : (contextResult[0].text || contextResult[0].search_result || JSON.stringify(contextResult[0], null, 2));
       } else if (typeof contextResult === 'object') {
          answerText = contextResult.text || contextResult.search_result || JSON.stringify(contextResult, null, 2);
       } else if (typeof contextResult === 'string') {
          answerText = contextResult;
       }
    }

    return NextResponse.json({
      context: answerText
    });
  } catch (error: any) {
    console.error("Ask-context error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
