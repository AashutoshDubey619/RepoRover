// server/vectorStore.js (Final Fixed Version)
const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const dotenv = require('dotenv');
dotenv.config();

// 1. Connection Setup
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

// ✅ FIX 1: Use Latest Model (text-embedding-004)
const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004", 
    apiKey: process.env.GEMINI_API_KEY
});

// ✅ FIX 2: Helper Function to Pause (Sleep)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processAndStore(files) {
    console.log(`\n⚙️ Processing ${files.length} files for Vector DB...`);

    const index = pinecone.index("reporover"); 
    
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, 
        chunkOverlap: 200, 
    });

    let totalVectors = 0;

    for (const file of files) {
        if (!file.content || typeof file.content !== 'string') continue;

        console.log(`Processing: ${file.path}`);
        
        const chunks = await splitter.createDocuments([file.content]);
        const vectors = [];
        
        for (const chunk of chunks) {
            try {
                // ✅ FIX 3: Add 1-second delay before request
                await sleep(1000); // 1 second ka break

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
                // Agar ek chunk fail ho, to poora process mat roko, aage badho
                continue; 
            }
        }

        if (vectors.length > 0) {
            await index.upsert(vectors);
            totalVectors += vectors.length;
            console.log(`   -> Uploaded ${vectors.length} chunks for ${file.path}`);
        }
    }

    console.log(`\n✅ Successfully stored ${totalVectors} vectors in Pinecone! 💾`);
    return totalVectors;
}

// ✅ NEW FUNCTION: Database se relevant code dhoondne ke liye
async function getMatchesFromEmbeddings(question, topK = 3) {
    console.log(`\n🔍 Searching Pinecone for: "${question}"`);

    const index = pinecone.index("reporover");

    try {
        // 1. User ke sawal ko Vector (Numbers) banao
        const queryEmbedding = await embeddings.embedQuery(question);

        // 2. Pinecone mein match dhoondo
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: topK, // Top 3 sabse relevant chunks lao
            includeMetadata: true // Hamein text bhi chahiye, sirf numbers nahi
        });

        console.log(`✅ Found ${queryResponse.matches.length} matches.`);
        
        // 3. Sirf text wapas bhejo
        return queryResponse.matches.map(match => ({
            content: match.metadata.content,
            path: match.metadata.path,
            score: match.score // Kitna match kiya (0 to 1)
        }));

    } catch (error) {
        console.error("❌ Error querying Pinecone:", error);
        return [];
    }
}


module.exports = { processAndStore, getMatchesFromEmbeddings };