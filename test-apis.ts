async function testApi(name: string, url: string, options: any = {}) {
  try {
    console.log(`\n--- Testing ${name} ---`);
    const res = await fetch(url, options);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(`Response:`, JSON.stringify(json, null, 2).substring(0, 500));
    } catch {
      console.log(`Response text:`, text.substring(0, 500));
    }
  } catch (error) {
    console.error(`Error in ${name}:`, error);
  }
}

async function runTests() {
  const baseUrl = "http://localhost:3000/api";
  
  await testApi("Status API", `${baseUrl}/status?datasetName=detective_core`);
  await testApi("Graph API", `${baseUrl}/graph?dataset=detective_core`);
  await testApi("Activity API", `${baseUrl}/activity?datasetName=detective_core`);
  await testApi("Session Recall API", `${baseUrl}/session/recall`);
  
  await testApi("Ask API", `${baseUrl}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Who is Doug?", datasetName: "detective_core" })
  });

  await testApi("Session Remember API", `${baseUrl}/session/remember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "detective_session_1", question: "Test Q", answer: "Test A" })
  });
}

runTests();
