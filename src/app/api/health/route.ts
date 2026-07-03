import { NextResponse } from "next/server";
import { getApiUrl, getHeaders } from "@/lib/cognee/client";

export async function GET() {
  const checks = await Promise.allSettled([
    // Check 1: Can we reach Cognee Cloud at all?
    fetch(`${getApiUrl()}/datasets`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000)
    })
  ]);
  
  const cogneeOk = checks[0].status === 'fulfilled' && (checks[0].value as Response).ok;
  
  return NextResponse.json({
    cognee: cogneeOk ? 'ok' : 'unreachable',
    apiUrl: getApiUrl().replace(/api_key=.*/, 'api_key=REDACTED'), // never expose key
    timestamp: new Date().toISOString()
  });
}
