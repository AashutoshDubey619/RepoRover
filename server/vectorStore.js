const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const dotenv = require('dotenv');
dotenv.config();

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004", 
    apiKey: process.env.GEMINI_API_KEY
});

// Helper: Batch processing for parallel execution with limit
async function processBatch(items, batchSize, processFn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(processFn));
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processAndStore(files, onProgress) {
    const index = pinecone.index("reporover"); 
    
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, 
        chunkOverlap: 50, // Reduced overlap for speed
    });

    let totalVectors = 0;
    const batchSize = 5; // Process 5 files at a time (Parallel)

    const processFile = async (file) => {
        if (!file.content || typeof file.content !== 'string') return;

        if (onProgress) onProgress(`⚡ Processing: ${file.path}`);
        
        const chunks = await splitter.createDocuments([file.content]);
        const vectors = [];
        
        // Chunk Embedding (Parallel within file)
        await Promise.all(chunks.map(async (chunk) => {
            try {
                // Small delay to respect rate limits even in parallel
                await sleep(200); 
                const embeddingVector = await embeddings.embedQuery(chunk.pageContent);
                
                vectors.push({
                    id: `${file.path}-${Date.now()}-${Math.random()}`,
                    values: embeddingVector,
                    metadata: {
                        path: file.path,
                        content: chunk.pageContent 
                    }
                });
            } catch (err) {
                console.error(`⚠️ Error embedding chunk: ${err.message}`);
            }
        }));

        if (vectors.length > 0) {
            // Upsert to Pinecone
            await index.upsert(vectors);
            totalVectors += vectors.length;
            if (onProgress) onProgress(`✅ Indexed: ${file.path} (${vectors.length} chunks)`);
        }
    };

    // Process files in batches
    await processBatch(files, batchSize, processFile);

    if (onProgress) onProgress(`🚀 COMPLETE: Stored ${totalVectors} vectors!`);
    return totalVectors;
}

// Search logic remains same
async function getMatchesFromEmbeddings(question, topK = 15) {
    const index = pinecone.index("reporover");
    try {
        const queryEmbedding = await embeddings.embedQuery(question);
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: topK, 
            includeMetadata: true 
        });
        return queryResponse.matches.map(match => ({
            content: match.metadata.content,
            path: match.metadata.path,
            score: match.score 
        }));
    } catch (error) {
        console.error("❌ Error querying Pinecone:", error);
        return [];
    }
}

module.exports = { processAndStore, getMatchesFromEmbeddings };