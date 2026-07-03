import { getApiUrl, getHeaders } from "./client";

const cache = new Map<string, { id: string; cachedAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchDatasets(): Promise<any[]> {
  const dRes = await fetch(`${getApiUrl()}/datasets`, { headers: getHeaders() });
  if (dRes.ok) {
    return await dRes.json();
  }
  return [];
}

export async function getDatasetId(name: string): Promise<string | null> {
  const cached = cache.get(name);
  if (cached && Date.now() - cached.cachedAt < TTL_MS) return cached.id;
  
  try {
    const datasets = await fetchDatasets();
    const match = datasets.find((d: any) => d.name === name);
    if (match) {
      cache.set(name, { id: match.id, cachedAt: Date.now() });
      return match.id;
    }
  } catch (error) {
    console.error("Failed to fetch datasets for cache:", error);
  }
  return null;
}
