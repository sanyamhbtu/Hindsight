import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/cognee/client";

const COT_PROMPT = `You are a meticulous investigator. Think step by step.
Question each assumption. Show your work. If you find a contradiction, call it out.
The goal is to find Doug Billings. Every clue matters.`;

function parseReasoningSteps(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return lines.filter(l => /^\d+\./.test(l.trim()) || l.includes('→') || l.includes('therefore'));
}

export async function POST(req: NextRequest) {
  try {
    const { question, datasetName } = await req.json();
    const dataset = datasetName || "detective_core";

    const cotResult = await search(dataset, question, 'GRAPH_COMPLETION_COT', {
      save_interaction: true,
      systemPrompt: COT_PROMPT
    });
    
    let answerText = "No data found.";
    if (cotResult) {
       if (Array.isArray(cotResult) && cotResult.length > 0) {
          answerText = typeof cotResult[0] === 'string' ? cotResult[0] : (cotResult[0].text || cotResult[0].search_result || JSON.stringify(cotResult[0]));
       } else if (typeof cotResult === 'object') {
          answerText = cotResult.text || cotResult.search_result || JSON.stringify(cotResult);
       } else if (typeof cotResult === 'string') {
          answerText = cotResult;
       }
    }
    
    const reasoningSteps = parseReasoningSteps(answerText);
    
    // Fire and forget session logging
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    fetch(`${protocol}://${host}/api/session/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer: answerText, sessionId: "detective_session_1" })
    }).catch(() => {});

    return NextResponse.json({
      vector: { answer: "Vector RAG not used for Deep Reasoning." },
      graph: { answer: answerText, trail: reasoningSteps.map((s, i) => ({ type: 'graph', subject: `Step ${i+1}`, relation: 'REASONED', object: s.replace(/^\d+\.\s*/, '') })), searchTypeUsed: "GRAPH_COMPLETION_COT" }
    });
  } catch (error: any) {
    console.error("Ask-deep error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
