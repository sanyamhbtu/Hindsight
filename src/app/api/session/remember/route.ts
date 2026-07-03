import { NextRequest, NextResponse } from "next/server";
import { addToSession } from "@/lib/session/store";

export async function POST(req: NextRequest) {
  try {
    const { question, answer, sessionId } = await req.json();
    
    if (!sessionId || !question || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    await addToSession(sessionId, {
      question,
      answer,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ stored: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
