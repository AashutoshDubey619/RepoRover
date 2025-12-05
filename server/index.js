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
const auth = require('./middleware/auth');
const ChatHistory = require('./models/ChatHistory');

dotenv.config();

connectDB();

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
});

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

async function getRepoStructure(owner, repo, path = '') {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
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

app.post('/api/ingest', auth, async (req, res) => {

    
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    const cleanURL = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');
    
    console.log(`\n STARTING SCAN: ${cleanURL}`);
    io.emit("log", ` Starting scan for: ${cleanURL}`);

    const existingChat = await ChatHistory.findOne({
        userId: req.userId, 
        repoUrl: cleanURL 
    });

    if (existingChat && (Date.now() - existingChat.lastAccessed.getTime() < 86400000)) {
        io.emit("log", `⚡ Repo already indexed recently. Skipping scan.`);
        return res.json({
            message: `Skipped Scan (Already Cached)`,
            totalFiles: 0 
        });
    }

    try {
        const parts = cleanURL.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repo = parts[1];

        const fileList = await getRepoStructure(owner, repo);
        io.emit("log", ` Found ${fileList.length} relevant files.`);
        console.log(`\n Found ${fileList.length} files. Downloading content...`);

        const filePromises = fileList.map(async (file) => {
            try {
                const contentRes = await axios.get(file.download_url);
                io.emit("log", `⬇️ Downloaded: ${file.path}`);
                return {
                    ...file,
                    content: contentRes.data,
                    repoUrl: cleanURL 
                };
            } catch (err) {
                console.error(`Failed to download ${file.path}`);
                return null;
            }
        });

        const filesWithContent = await Promise.all(filePromises);
        const validFiles = filesWithContent.filter(f => f !== null);

        console.log(` Downloaded ${validFiles.length} files.`);
        io.emit("log", ` Successfully downloaded ${validFiles.length} files.`);

        await processAndStore(validFiles, (logMsg) => {
            io.emit("log", logMsg);
        });

        io.emit("log", ` System Ready! You can now chat.`);
        
        res.json({
            message: `Scan & Download Successful! `,
            totalFiles: validFiles.length
        });

    } catch (error) {
        console.error(error);
        io.emit("log", ` Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', auth, async (req, res) => {
    const { question, repoUrl } = req.body;
    
    if (!question || !repoUrl) return res.status(400).json({ error: 'Question and Repo URL required' });

    console.log(`\n User asked: "${question}" on ${repoUrl}`);

    try {
        let chat = await ChatHistory.findOne({ userId: req.userId, repoUrl });

        if (!chat) {
            chat = new ChatHistory({ userId: req.userId, repoUrl, messages: [] });
        }

        chat.messages.push({ role: 'user', text: question });
        await chat.save();

         const contextChunks = await getMatchesFromEmbeddings(question, 15, repoUrl); 
        const contextText = contextChunks.map(chunk => 
            ` FILE: ${chunk.path}\nCODE:\n${chunk.content}\n`
        ).join('\n---\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

        const prompt = `
        You are 'RepoRover', an expert AI Senior Software Engineer and Code Reviewer.

        YOUR RULES:
        1. **CLEAN OUTPUT:** Your response must be clean and well-formatted using Markdown. Use code blocks (\`\`\`) for all code.
        2. **GREETINGS/SMALL TALK:** Reply naturally to greetings. Do NOT use code context.
        3. **CODE REVIEW:** If asked to review/debug, be critical and precise.
        4. **EXPLANATION:** Explain logic clearly using the context.

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

        chat.messages.push({ role: 'bot', text: answer });
        chat.lastAccessed = Date.now();
        await chat.save();

        console.log("Answer Generated and Saved!");
        res.json({ answer });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to generate answer" });
    }
});

app.get('/api/chat/history', auth, async (req, res) => {
    const { repoUrl } = req.query;
    try {
        const chat = await ChatHistory.findOne({ userId: req.userId, repoUrl });
        res.json(chat ? chat.messages : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/chats', auth, async (req, res) => {
    try {
        const chats = await ChatHistory.find({ userId: req.userId }).select('repoUrl lastAccessed').sort({ lastAccessed: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
