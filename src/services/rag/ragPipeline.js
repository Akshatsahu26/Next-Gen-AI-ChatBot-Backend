const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const faiss = require('faiss-node');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

let pipeline; // Xenova pipeline

async function getEmbedder() {
  if (!pipeline) {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
  }
  return await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: false, // For exact FAISS matching
  });
}

function splitText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Initializes and runs the native FAISS RAG pipeline.
 */
async function buildRAGPipeline() {
  console.log('🔄 1. Loading documents...');
  const docPath = path.join(__dirname, '../../../data/banking_guidelines.txt');
  if (!fs.existsSync(docPath)) {
    throw new Error(`File not found at ${docPath}. Please create the banking_guidelines.txt file first.`);
  }

  const fileContent = fs.readFileSync(docPath, 'utf-8');

  console.log('✂️ 2. Splitting documents into chunks...');
  const splitDocs = splitText(fileContent);
  console.log(`   - Created ${splitDocs.length} document chunks.`);

  console.log('🧠 3. Generating Embeddings via Xenova Transformers...');
  const embedder = await getEmbedder();
  
  const embeddings = [];
  for (const chunk of splitDocs) {
    const output = await embedder(chunk, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }

  console.log('🗄️ 4. Storing in FAISS VectorDB...');
  const dimension = embeddings[0].length;
  const index = new faiss.IndexFlatL2(dimension);
  
  // Flatten embeddings into a standard Array for faiss-node
  index.add(embeddings.flat());
  
  console.log('✅ Pipeline Ready!\n');
  
  return async function queryRAG(query) {
    // Generate query embedding
    const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
    const queryEmb = Array.from(queryOutput.data);
    
    // Search FAISS for top 2 matches
    const searchResult = index.search(queryEmb, 2);
    
    // Extract labels (which map to array indices of splitDocs)
    const contextChunks = searchResult.labels.map(idx => splitDocs[idx]);
    const context = contextChunks.join('\n\n');

    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is missing');

    const prompt = `
You are a strictly knowledge-based Banking AI Assistant.
You must answer the user's question using ONLY the provided Context below.
If the answer is not contained within the Context, say "I don't have the information to answer that."

IMPORTANT RULE:
You are a Read-Only RAG assistant. DO NOT attempt to trigger any actions, function calls, or API requests.
DO NOT ask for user details like account numbers or PINs.

Context:
${context}

User Question:
${query}

Answer:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  };
}

// ============== EXECUTION EXAMPLE ==============
if (require.main === module) {
  (async () => {
    try {
      const askRAG = await buildRAGPipeline();

      const queries = [
        "What is the eligibility for a personal loan?",
        "How do I report fraud?",
        "Can you transfer 5000 to Rahul?", // Should trigger the rule-based rejection
      ];

      for (const query of queries) {
        console.log(`\n🗣️  User Query: "${query}"`);
        console.log('⏳ Retrieving and generating answer...');
        const answer = await askRAG(query);
        console.log(`🤖 Answer: ${answer}`);
      }

    } catch (err) {
      console.error('❌ Pipeline Error:', err);
    }
  })();
}

module.exports = { buildRAGPipeline };
