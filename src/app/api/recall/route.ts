import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/cognee/client";

export async function POST(req: NextRequest) {
  try {
    const { question, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";
    
    const data = await search(dataset, question, 'GRAPH_SUMMARY_COMPLETION', {
      save_interaction: true
    });
    
    // Extract text from the result structure
    let answerText = "No data found.";
    if (data) {
       if (Array.isArray(data) && data.length > 0) {
          answerText = typeof data[0] === 'string' ? data[0] : (data[0].text || data[0].search_result || JSON.stringify(data[0]));
       } else if (typeof data === 'object') {
          answerText = data.text || data.search_result || JSON.stringify(data);
       } else if (typeof data === 'string') {
          answerText = data;
       }
    }
    
    // Fire and forget session logging
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    fetch(`${protocol}://${host}/api/session/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer: answerText, sessionId: "detective_session_1" })
    }).catch(() => {});

    return NextResponse.json({
      vector: { answer: "Vector RAG handled automatically by recall()" },
      graph: { answer: answerText, trail: [], searchTypeUsed: data.search_type_used || 'auto' }
    });
  } catch (error: any) {
    console.error("Recall error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
