// server/index.js (Day 3: Recursion & Content Edition)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { processAndStore, getMatchesFromEmbeddings } = require('./vectorStore');
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 👇 Helper: Sirf kaam ki files uthayenge (Images/Videos ignore)
const isCodeFile = (filename) => {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.h', '.html', '.css', '.json', '.md'];
    return extensions.some(ext => filename.endsWith(ext));
};

// 🌀 The Recursive Function (Dil thaam ke dekho)
async function getRepoStructure(owner, repo, path = '') {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let allFiles = [];

        // Loop through every item (file or folder)
        for (const item of response.data) {
            if (item.type === 'dir') {
                // 🔄 RECURSION: Agar folder hai, to wapas khud ko call karo
                // Lekin 'path' change karke (e.g., 'src' -> 'src/components')
                const subFiles = await getRepoStructure(owner, repo, item.path);
                allFiles = allFiles.concat(subFiles);
            } 
            else if (item.type === 'file' && isCodeFile(item.name)) {
                // ✅ Agar file hai, aur code file hai, to store karo
                console.log(`📄 Found: ${item.path}`);
                allFiles.push({
                    name: item.name,
                    path: item.path,
                    download_url: item.download_url // Is URL se hum text padhenge
                });
            }
        }
        return allFiles;

    } catch (error) {
        console.error(`Error at ${path}:`, error.message);
        return []; // Agar error aaye (permission denied etc), to khali array bhej do
    }
}


// ✅ TEST ROUTE: Check if Gemini is working
app.get('/api/test-gemini', async (req, res) => {
    try {
        // 1. Setup Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // 2. Select Model (Hum 'flash' use kar rahe hain kyunki ye fast aur free hai)
        // Hum "gemini-pro" use karenge. Ye Gemini 1.0 hai, ye kabhi fail nahi hota.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


        // 3. Ask a Question
        const prompt = "Explain 'Recursion' to a 5-year-old in one funny sentence.";
        
        console.log("🤖 Asking Gemini...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Send Answer back
        console.log("✅ Gemini Responded!");
        res.json({ 
            message: "Gemini is Working! 🎉", 
            answer: text 
        });

    } catch (error) {
        console.error("❌ Gemini Error:", error);
        res.status(500).json({ 
            error: "Gemini API Failed", 
            details: error.message 
        });
    }
});


// 🚀 Main Route
// ✅ Route: Scan + Download Content (Updated)
app.post('/api/ingest', async (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    console.log(`\n🔍 STARTING SCAN: ${repoUrl}`);

    try {
        const cleanURL = repoUrl.replace(/\/$/, '');
        const parts = cleanURL.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repo = parts[1];

        // 1. Saare files ke links nikalo
        const fileList = await getRepoStructure(owner, repo);
        console.log(`\n📊 Found ${fileList.length} files. Downloading content...`);

        // 2. ⚡ Promise.all ka Jaadu (Parallel Download)
        // Hum har file ke liye ek Promise bana rahe hain
        const filePromises = fileList.map(async (file) => {
            try {
                // Raw content download karna
                const contentRes = await axios.get(file.download_url);
                return {
                    ...file, // Purana data (name, path)
                    content: contentRes.data // Naya data (Asli Code)
                };
            } catch (err) {
                console.error(`Failed to download ${file.path}`);
                return null; // Agar fail ho jaye to null return karo
            }
        });

        // Sabke khatam hone ka wait karo
        const filesWithContent = await Promise.all(filePromises);
        
        // Null values (failed downloads) ko filter out karo
        const validFiles = filesWithContent.filter(f => f !== null);

        console.log(`✅ Downloaded ${validFiles.length} files successfully.`);

        await processAndStore(validFiles);
        console.log(`🎉 All files processed and stored in Vector DB!`);
        // 3. User ko dikhao
        res.json({
            message: `Scan & Download Successful! 🚀`,
            totalFiles: validFiles.length,
            // Preview dikhayenge taaki yakeen ho jaye
            firstFilePreview: {
                path: validFiles[0]?.path,
                contentSnippet: typeof validFiles[0]?.content === 'string' 
                    ? validFiles[0]?.content.substring(0, 200) + "..." 
                    : "Binary or non-text content"
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ CHAT ROUTE: User Question -> RAG -> Answer
app.post('/api/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    console.log(`\n💬 User asked: "${question}"`);

    try {
        // 1. Pinecone se relevant code nikalo
        const contextChunks = await getMatchesFromEmbeddings(question);

        if (contextChunks.length === 0) {
            return res.json({ answer: "I couldn't find any relevant code in the repository to answer this." });
        }

        // 2. Context taiyar karo (Chunks ko jod kar ek text banao)
        const contextText = contextChunks.map(chunk => 
            `📄 FILE: ${chunk.path}\nCODE:\n${chunk.content}\n`
        ).join('\n---\n');

        // 3. Gemini ke liye Prompt taiyar karo
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert AI Developer Assistant named 'RepoRover'.
        Use the following Code Context to answer the user's question accurately.
        If the answer is not in the context, say "I don't have enough info in the code context."
        
        USER QUESTION: "${question}"
        
        --- CODE CONTEXT START ---
        ${contextText}
        --- CODE CONTEXT END ---
        
        Your Answer (Be technical and concise):
        `;

        console.log("🤖 Asking Gemini with Context...");
        
        // 4. Gemini se answer mango
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        console.log("✅ Answer Generated!");
        res.json({ answer, sources: contextChunks.map(c => c.path) });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to generate answer" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});