const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const http = require('http'); 
const { Server } = require("socket.io"); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { processAndStore, getMatchesFromEmbeddings } = require('./vectorStore');
const connectDB = require('./database');
const authRoutes = require('./routes/authRoutes');
const auth = require('./middleware/auth'); // ✅ Auth Middleware
const ChatHistory = require('./models/ChatHistory'); // ✅ Chat History Model

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// ✅ 1. Create HTTP Server & Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (for development)
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Auth Routes setup
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

// ✅ ROUTE 1: INGEST (Protected with Auth)
// Ab sirf logged-in users hi repo scan kar sakte hain
app.post('/api/ingest', auth, async (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    const cleanURL = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');
    
    console.log(`\n🔍 STARTING SCAN: ${cleanURL}`);
    io.emit("log", `🔍 Starting scan for: ${cleanURL}`); 

    try {
        const parts = cleanURL.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repo = parts[1];

        const fileList = await getRepoStructure(owner, repo);
        io.emit("log", `📊 Found ${fileList.length} relevant files.`);
        console.log(`\n📊 Found ${fileList.length} files. Downloading content...`);

        // Parallel Download
        const filePromises = fileList.map(async (file) => {
            try {
                const contentRes = await axios.get(file.download_url);
                io.emit("log", `⬇️ Downloaded: ${file.path}`);
                return {
                    ...file,
                    content: contentRes.data,
                    repoUrl: cleanURL // 🔥 FIX: Store repoUrl with file content
                };
            } catch (err) {
                return null;
            }
        });

        const filesWithContent = await Promise.all(filePromises);
        const validFiles = filesWithContent.filter(f => f !== null);

        console.log(`✅ Downloaded ${validFiles.length} files.`);
        io.emit("log", `✅ Successfully downloaded ${validFiles.length} files.`);

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

// ✅ ROUTE 2: CHAT (Updated with History Save Logic)
app.post('/api/chat', auth, async (req, res) => { 
    // Frontend ko 'repoUrl' bhi bhejna padega taaki hum sahi history dhoond sakein
    const { question, repoUrl } = req.body; 
    
    if (!question) return res.status(400).json({ error: 'Question required' });

    // Agar repoUrl nahi aaya (purane frontend code se), to default string use karenge
    const currentRepo = repoUrl ? repoUrl.replace(/\/$/, '').replace(/\.git$/, '') : "Unknown-Repo";

    console.log(`\n💬 User (${req.userId}) asked: "${question}" on ${currentRepo}`);

    try {
        // --- 1. FIND OR CREATE CHAT HISTORY ---
        // req.userId humein 'auth' middleware se mila hai
        let chat = await ChatHistory.findOne({ userId: req.userId, repoUrl: currentRepo });

        if (!chat) {
            chat = new ChatHistory({ 
                userId: req.userId, 
                repoUrl: currentRepo, 
                messages: [] 
            });
        }

        // --- 2. SAVE USER QUESTION ---
        chat.messages.push({ role: 'user', text: question });
        await chat.save(); // DB mein save

        // --- 3. RAG PIPELINE (Generate Answer) ---
        // 🔥 FIX: Pass repoUrl to filter search results
        const contextChunks = await getMatchesFromEmbeddings(question, 15, currentRepo);
        const contextText = contextChunks.map(chunk =>
            `📄 FILE: ${chunk.path}\nCODE:\n${chunk.content}\n`
        ).join('\n---\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using Gemini 1.5 Flash (Stable & Fast)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are 'RepoRover', an expert AI Senior Software Engineer and Code Reviewer.

        YOUR RULES:
        1. **CLEAN OUTPUT:** Your response must be clean and well-formatted using Markdown. Do not mix code snippets directly into narrative sentences. Use code blocks (\`\`\`) for all code.
        2. **GREETINGS/SMALL TALK:** If the user says "hi", "hello", "thanks", or "good job", reply naturally and politely. Do NOT use the code context.
        3. **CODE REVIEW & DEBUGGING:** If the user asks to "review", "find bugs", "optimize", or "improve" the code, be critical and precise.
        4. **EXPLANATION:** Explain complex logic clearly using the provided code context.
        5. **FLEXIBLE ANSWERING:** If the answer is not fully in the provided context, provide a partial answer based on the available information or general knowledge. Note any limitations if the context is insufficient.

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

        // --- 4. SAVE BOT ANSWER ---
        chat.messages.push({ role: 'bot', text: answer });
        chat.lastAccessed = Date.now();
        await chat.save(); // DB mein firse save

        res.json({ answer });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to generate answer" });
    }
});

// ✅ Route 3: Get Chat History (For loading old chats)
app.get('/api/chat/history', auth, async (req, res) => {
    const { repoUrl } = req.query;
    try {
        const chat = await ChatHistory.findOne({ userId: req.userId, repoUrl });
        res.json(chat ? chat.messages : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Route 4: Get Chat List (For Sidebar Menu)
app.get('/api/chats', auth, async (req, res) => {
    try {
        // Sirf unique repoUrls chahiye list ke liye
        const chats = await ChatHistory.find({ userId: req.userId })
            .select('repoUrl lastAccessed')
            .sort({ lastAccessed: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🚀 Use server.listen for Socket.io
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});