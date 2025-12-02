const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const http = require('http'); // ✅ Added for Socket.io
const { Server } = require("socket.io"); // ✅ Added for Socket.io
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { processAndStore, getMatchesFromEmbeddings } = require('./vectorStore');
const connectDB = require('./database');
const authRoutes = require('./routes/authRoutes');

connectDB();
dotenv.config();
const app = express();

// ✅ 1. Create HTTP Server & Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // <--- Star (*) ka matlab "Sabko Aane Do"
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Socket Connection Check
io.on("connection", (socket) => {
    console.log("⚡ Client connected:", socket.id);
});

// 👇 SMART FILTER: Kachra files ko ignore karo
const isCodeFile = (filename) => {
    if (
        filename.includes('node_modules') || 
        filename.includes('dist') || 
        filename.includes('build') || 
        filename.includes('coverage') ||
        filename.includes('package-lock.json') ||
        filename.includes('yarn.lock') ||
        filename.includes('.git')
    ) {
        return false;
    }

    const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', 'README.md', '.css', '.html', '.json'];
    return allowedExtensions.some(ext => filename.endsWith(ext));
};

// 🌀 The Recursive Function
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

        for (const item of response.data) {
            if (item.type === 'dir') {
                // 🛑 STOP: Agar folder 'node_modules' ya '.git' hai, to andar mat jao
                if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') {
                    continue; 
                }
                const subFiles = await getRepoStructure(owner, repo, item.path);
                allFiles = allFiles.concat(subFiles);
            } 
            else if (item.type === 'file' && isCodeFile(item.name)) {
                console.log(`📄 Found: ${item.path}`);
                allFiles.push({
                    name: item.name,
                    path: item.path,
                    download_url: item.download_url
                });
            }
        }
        return allFiles;

    } catch (error) {
        console.error(`Error at ${path}:`, error.message);
        return [];
    }
}

// ✅ ROUTE 1: INGEST (Scan + Download + Store)
app.post('/api/ingest', async (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    // ✅ FIX: URL Cleaning (.git aur slash hatana)
    const cleanURL = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');
    
    console.log(`\n🔍 STARTING SCAN: ${cleanURL}`);
    io.emit("log", `🔍 Starting scan for: ${cleanURL}`); // Send log to frontend

    try {
        const parts = cleanURL.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repo = parts[1];

        const fileList = await getRepoStructure(owner, repo);
        io.emit("log", `📊 Found ${fileList.length} relevant files.`);
        console.log(`\n📊 Found ${fileList.length} files. Downloading content...`);

        // Parallel Download with Promise.all
        const filePromises = fileList.map(async (file) => {
            try {
                const contentRes = await axios.get(file.download_url);
                io.emit("log", `⬇️ Downloaded: ${file.path}`);
                return {
                    ...file,
                    content: contentRes.data
                };
            } catch (err) {
                console.error(`Failed to download ${file.path}`);
                return null;
            }
        });

        const filesWithContent = await Promise.all(filePromises);
        const validFiles = filesWithContent.filter(f => f !== null);

        console.log(`✅ Downloaded ${validFiles.length} files.`);
        io.emit("log", `✅ Successfully downloaded ${validFiles.length} files.`);

        // 🔥 STORE IN PINECONE (Pass callback for logs)
        await processAndStore(validFiles, (logMsg) => {
            io.emit("log", logMsg);
        });

        io.emit("log", `🎉 System Ready! You can now chat.`);
        
        res.json({
            message: `Scan & Download Successful! 🚀`,
            totalFiles: validFiles.length
        });

    } catch (error) {
        console.error(error);
        io.emit("log", `❌ Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ROUTE 2: CHAT (RAG Logic)
app.post('/api/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    console.log(`\n💬 User asked: "${question}"`);

    try {
        const contextChunks = await getMatchesFromEmbeddings(question, 15); // Top 15 chunks

        const contextText = contextChunks.map(chunk => 
            `📄 FILE: ${chunk.path}\nCODE:\n${chunk.content}\n`
        ).join('\n---\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 🔥 SUPER PROMPT (Senior Developer Mode)
        const prompt = `
        You are 'RepoRover', an expert AI Senior Software Engineer and Code Reviewer.

        YOUR RULES:
        1. **CLEAN OUTPUT:** Your response must be clean and well-formatted using Markdown. Do not mix code snippets directly into narrative sentences. Use code blocks (\`\`\`) for all code.
        2. **GREETINGS/SMALL TALK:** If the user says "hi", "hello", "thanks", or "good job", reply naturally and politely. Do NOT try to find code for this.
        
        3. **CODE REVIEW & DEBUGGING:** If the user asks to "review", "find bugs", "optimize", or "improve" the code:
           - Act like a Senior Engineer.
           - Point out potential bugs 🐛.
           - Suggest performance improvements 🚀.
           - Highlight security risks 🔓.
           - Be critical but constructive.

        4. **EXPLANATION:** If the user asks "how does this work?", explain simply using the provided code context.

        If the answer is not in the provided context, strictly say: "I don't have enough info in the scanned files to answer this."

        USER QUESTION: "${question}"

        --- CODE CONTEXT START ---
        ${contextText}
        --- CODE CONTEXT END ---

        Your Answer (Format with Markdown):
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        console.log("✅ Answer Generated!");
        res.json({ answer });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to generate answer" });
    }
});

// ✅ Route 3: Test Gemini (Optional)
app.get('/api/test-gemini', async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = "Explain 'Recursion' to a 5-year-old in one funny sentence.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ message: "Gemini is Working! 🎉", answer: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚀 Use server.listen instead of app.listen for Socket.io
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});