async function testIngest() {
  const url = "http://localhost:3000/api/ingest";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources: [
          { type: "text", content: "Doug was seen at the casino" },
          { type: "url", content: "https://example.com" }
        ],
        mode: "detective",
        datasetName: "test_dataset"
      })
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
  } catch(e) {
    console.error(e);
  }
}
testIngest();
