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
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

io.on("connection", () => {});

const ignorePatterns = [
    'node_modules','dist','build','coverage','.git','.next','.vercel',
    'package-lock.json','yarn.lock','.turbo','.cache','.output'
];

const isCodeFile = (filename) => {
    return !ignorePatterns.some(p => filename.includes(p));
};

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
                if (ignorePatterns.some(p => item.name.includes(p))) continue;
                const subFiles = await getRepoStructure(owner, repo, item.path);
                allFiles = allFiles.concat(subFiles);
            } else if (item.type === 'file' && isCodeFile(item.name)) {
                allFiles.push({
                    name: item.name,
                    path: item.path,
                    download_url: item.download_url
                });
            }
        }
        return allFiles;
    } catch {
        return [];
    }
}

app.post('/api/ingest', auth, async (req, res) => {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'Repo URL required' });

    const cleanURL = repoUrl.replace(/\/$/, '').replace(/\.git$/, '');

    try {
        const parts = cleanURL.split('github.com/')[1].split('/');
        const owner = parts[0];
        const repo = parts[1];

        io.emit("log", `Scanning repository...`);
        const fileList = await getRepoStructure(owner, repo);
        io.emit("log", `${fileList.length} files found`);

        const filePromises = fileList.map(async (file) => {
            try {
                const contentRes = await axios.get(file.download_url);
                io.emit("log", `Downloaded: ${file.path}`);
                return { ...file, content: contentRes.data, repoUrl: cleanURL };
            } catch {
                return null;
            }
        });

        const validFiles = (await Promise.all(filePromises)).filter(Boolean);
        io.emit("log", `Processing ${validFiles.length} files`);
        await processAndStore(validFiles, msg => io.emit("log", msg));
        io.emit("log", `Ready for chat`);

        res.json({ message: `Scan completed`, totalFiles: validFiles.length });
    } catch (error) {
        io.emit("log", `Error`);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', auth, async (req, res) => {
    const { question, repoUrl } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const currentRepo = repoUrl
        ? repoUrl.replace(/\/$/, '').replace(/\.git$/, '')
        : "Unknown-Repo";

    try {
        let chat = await ChatHistory.findOne({ userId: req.userId, repoUrl: currentRepo });
        if (!chat) chat = new ChatHistory({ userId: req.userId, repoUrl: currentRepo, messages: [] });

        chat.messages.push({ role: 'user', text: question });
        await chat.save();

        const contextChunks = await getMatchesFromEmbeddings(question, 15, currentRepo);
        const contextText = contextChunks
            .map(c => `FILE: ${c.path}\n${c.content}`)
            .join('\n\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
Question: ${question}
Context:
${contextText}
Respond in Markdown format:
        `;

        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        chat.messages.push({ role: 'bot', text: answer });
        chat.lastAccessed = Date.now();
        await chat.save();

        res.json({ answer });
    } catch {
        res.status(500).json({ error: "Response failed" });
    }
});

app.get('/api/chat/history', auth, async (req, res) => {
    const { repoUrl } = req.query;
    try {
        const chat = await ChatHistory.findOne({ userId: req.userId, repoUrl });
        res.json(chat ? chat.messages : []);
    } catch {
        res.status(500).json({ error: "Fetch failed" });
    }
});

app.get('/api/chats', auth, async (req, res) => {
    try {
        const chats = await ChatHistory.find({ userId: req.userId })
            .select('repoUrl lastAccessed')
            .sort({ lastAccessed: -1 });
        res.json(chats);
    } catch {
        res.status(500).json({ error: "Fetch failed" });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
