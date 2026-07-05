import { config } from 'dotenv';

config();

const COGNEE_API_URL = process.env.COGNEE_API_URL || 'https://api.cognee.ai/api/v1';
const COGNEE_API_KEY = process.env.COGNEE_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-Api-Key': COGNEE_API_KEY,
} as any;

async function cleanDatasets() {
  try {
    const dRes = await fetch(`${COGNEE_API_URL}/datasets`, { headers });
    const datasets = await dRes.json();
    
    for (const name of ["detective", "detective_mode", "chow_core", "detective_core"]) {
      const ds = datasets.find((d: any) => d.name === name);
      if (ds) {
        console.log(`Deleting dataset ${name} (${ds.id})...`);
        const deleteRes = await fetch(`${COGNEE_API_URL}/datasets/${ds.id}`, { method: 'DELETE', headers });
        console.log(deleteRes.ok ? `Successfully cleared dataset: ${name}` : `Failed to delete ${name}: ${deleteRes.status}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

cleanDatasets().then(() => console.log("Done."));
