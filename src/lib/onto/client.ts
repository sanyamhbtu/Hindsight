const ONTO_API_URL = process.env.ONTO_API_URL || "https://api.buildonto.dev";
const ONTO_API_KEY = process.env.ONTO_API_KEY;

export async function readAndScore(url: string) {
  if (!ONTO_API_KEY || ONTO_API_KEY === "your_onto_api_key") {
    console.warn("ONTO_API_KEY is not configured properly. Falling back to mock data.");
    return { markdown: `Mock content for ${url}`, trust_score: 50 };
  }

  try {
    const res = await fetch(`${ONTO_API_URL}/read_and_score`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ONTO_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      console.warn(`Onto API failed with status ${res.status}. Falling back to mock data.`);
      return { markdown: `Fallback content for ${url} (API Error)`, trust_score: 50 };
    }
    return await res.json();
  } catch (error) {
    console.warn("Onto API request failed:", error);
    return { markdown: `Fallback content for ${url} (Network Error)`, trust_score: 50 };
  }
}
