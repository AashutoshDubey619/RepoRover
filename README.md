# 🤖 RepoRover  
### AI-Powered Codebase Auditor & Intelligence Platform

RepoRover is a sophisticated developer tool designed to bridge the gap between complex codebases and developer understanding. By leveraging **Retrieval-Augmented Generation (RAG)**, it allows users to _chat_ with any public GitHub repository, ask technical questions, identify bugs, and receive senior-level code reviews instantly — **without cloning a single file locally.**

---

## 🚀 Key Features

- 🔍 **Recursive Repository Ingestion**  
  Automatically traverses file trees to fetch and process code from GitHub repositories, intelligently filtering out noise (e.g., `node_modules`, `dist`).

- 🧠 **RAG Pipeline (Retrieval-Augmented Generation)**  
  Uses **Google Gemini 2.5** + **Pinecone Vector Database** to provide context-aware, accurate answers based on the actual code.

- ⚡ **Real-Time Feedback Loop**  
  Implements **Socket.io** to stream ingestion logs (scanning, downloading, embedding) directly to the UI in real-time.

- 🛡️ **Senior Code Reviewer Mode**  
  Specialized prompt engineering enables the AI to act as a **Senior Engineer**, detecting vulnerabilities, performance bottlenecks, and anti-patterns.

- 💾 **Persistent Chat History**  
  Saves user sessions and chat history using **MongoDB**, allowing users to revisit past analyses anytime.

- 🎨 **Aesthetic Hacker UI**  
  Vercel-inspired dark theme with glassmorphism, neon accents, and smooth animations.

---

## 🛠 Tech Stack

| Component   | Technology         | Description                               |
|------------|--------------------|-------------------------------------------|
| Frontend   | React.js + Vite    | Fast, modern UI                           |
| Styling    | Tailwind CSS       | Utility-first CSS framework               |
| Backend    | Node.js + Express  | REST API & server logic                   |
| Database   | MongoDB            | Persistent storage                        |
| Vector DB  | Pinecone           | High-dimensional code embeddings          |
| AI Model   | Google Gemini 2.5  | Code reasoning & generation               |
| Real-Time  | Socket.io          | Live ingestion logs                       |
| DevOps     | Docker             | Containerized deployment                  |

---

## 🏗️ Architecture Workflow

1. **Ingestion**: User submits a GitHub URL → Server fetches file structure using GitHub API  
2. **Processing**: Files filtered & chunked intelligently  
3. **Embedding**: Chunks embedded via Gemini and stored in Pinecone  
4. **Retrieval**: User query transformed into vector → Pinecone fetches relevant chunks  
5. **Generation**: Gemini LLM produces context-aware answer based on retrieved code  

---

## ⚡ Getting Started

### 🔧 Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- API Keys for:
  - Google Gemini
  - Pinecone
  - GitHub Personal Access Token

---

### 📌 1. Clone the Repository
```bash
git clone https://github.com/your-username/RepoRover.git
cd RepoRover
```

## 📌 2. Backend Setup

Navigate to the server directory and install dependencies:  
```bash
cd server
npm install
```


Create a .env file in the server directory with the following variables:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/reporover_db  # Or your MongoDB Atlas URL
GEMINI_API_KEY=your_gemini_key_here
PINECONE_API_KEY=your_pinecone_key_here
GITHUB_TOKEN=your_github_personal_access_token
JWT_SECRET=your_secret_key_for_auth
```

Start the backend server:
```bash
npm run dev
```

## 📌 3. Frontend Setup

Open a new terminal, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```

Start the React application:
```bash
npm run dev
```

### 📌 4. Access the App

Open your browser and navigate to:

http://localhost:5173
You will be redirected to the Login page. Create an account and start auditing code!





