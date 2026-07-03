import { config } from 'dotenv';
import { search } from './src/lib/cognee/client';

config();

async function testSearch() {
  try {
    const dataset = "detective_core"; // The default dataset name
    const query = "Where is Doug?";
    
    console.log("Searching GRAPH_COMPLETION...");
    const gRes = await search(dataset, query, "GRAPH_COMPLETION");
    console.log("Graph:", JSON.stringify(gRes, null, 2));
    
    console.log("\nSearching GRAPH_COMPLETION_CONTEXT_EXTENSION...");
    const rRes = await search(dataset, query, "GRAPH_COMPLETION_CONTEXT_EXTENSION");
    console.log("Extended Graph:", JSON.stringify(rRes, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testSearch();
