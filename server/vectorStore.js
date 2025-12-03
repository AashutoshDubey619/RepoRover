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
        chunkOverlap: 50,
    });

    let totalVectors = 0;
    const batchSize = 5;

    const processFile = async (file) => {
        if (!file.content || typeof file.content !== 'string') return;

        if (onProgress) onProgress(`⚡ Processing: ${file.path}`);
        
        const chunks = await splitter.createDocuments([file.content]);
        const vectors = [];
        

        await Promise.all(chunks.map(async (chunk) => {
            try {
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
            await index.upsert(vectors);
            totalVectors += vectors.length;
            if (onProgress) onProgress(`✅ Indexed: ${file.path} (${vectors.length} chunks)`);
        }
    };

    await processBatch(files, batchSize, processFile);

    if (onProgress) onProgress(`🚀 COMPLETE: Stored ${totalVectors} vectors!`);
    return totalVectors;
}

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