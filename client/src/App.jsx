import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Github, Bot, User, Loader2, Database, Terminal, Sparkles, Code2, ChevronRight, Command } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { io } from "socket.io-client";

function App() {
  // State variables
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | scanning | ready | chatting
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi there! I am **RepoRover**. Paste a GitHub link, and I will help you decode the code! 🚀' }
  ]);
  const [question, setQuestion] = useState('');
  
  // Real-time Logs ke liye state
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);
  const chatEndRef = useRef(null); // Chat auto-scroll ke liye

  // 🔌 Socket Connection Setup (Robust)
  useEffect(() => {
    // Robust connection setup: Agar disconnect ho, to reconnect try karega
    const socket = io("http://localhost:5000", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });
    
    // Log listener
    socket.on("log", (message) => {
      setLogs(prev => [...prev, message]);
    });

    socket.on("connect_error", (err) => {
        console.error("Socket Connection Error:", err.message);
    });

    // Cleanup function: Zaroori hai
    return () => socket.disconnect();
  }, []); 

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Repo Scan karne wala function
  const handleIngest = async () => {
    if (!repoUrl) return;
    setStatus('scanning');
    setLogs([]); 
    
    try {
      const res = await axios.post('http://localhost:5000/api/ingest', { repoUrl });
      setStatus('ready');
      setMessages(prev => [...prev, { role: 'bot', text: `🚀 **Mission Success!** I've analyzed **${res.data.totalFiles} files**. I'm ready for your questions.` }]);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setMessages(prev => [...prev, { role: 'bot', text: "❌ **Error:** Failed to scan repo. Please check the URL." }]);
    }
  };

  // 2. Sawal puchne wala function
  const handleAsk = async () => {
    if (!question) return;
    
    const userQ = question;
    setQuestion(''); 
    setMessages(prev => [...prev, { role: 'user', text: userQ }]); 
    setStatus('chatting');

    try {
      const res = await axios.post('http://localhost:5000/api/chat', { question: userQ });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "⚠️ Signal Lost. Please try again." }]);
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-200 font-sans overflow-hidden selection:bg-purple-500/30 selection:text-white">
      
      {/* SIDEBAR: Pure Black & Zinc (Dark Aesthetic) */}
      <div className="w-[400px] flex flex-col border-r border-white/10 bg-black relative z-20 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-black">
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-white tracking-tighter hover:text-violet-400 transition-colors duration-300 cursor-default">
            <Database className="w-8 h-8 text-white animate-pulse" /> RepoRover
          </h1>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono tracking-[0.3em] uppercase pl-1">Build v1.0 // Neural Core</p>
        </div>

        {/* Input Section */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar relative">
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Github className="w-3 h-3" /> Target Repository
            </label>
            <div className="relative group transition-all duration-300 rounded-lg">
              {/* Input Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
              <input 
                type="text" 
                placeholder="https://github.com/owner/repo"
                className="relative w-full p-4 pl-4 bg-zinc-900/90 rounded-lg border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:outline-none text-sm transition-all text-white placeholder-zinc-600 font-mono"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={status === 'scanning' || status === 'ready'}
              />
            </div>
          </div>
          
          {/* Button: White/Black High Contrast with Glow */}
          <button 
            onClick={handleIngest}
            disabled={status === 'scanning' || status === 'ready'}
            className={`w-full py-4 rounded-lg font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-lg transform active:scale-[0.98] border border-transparent relative overflow-hidden group
              ${status === 'ready' 
                ? 'bg-zinc-900 text-green-400 border-green-500/30 cursor-default shadow-[0_0_15px_rgba(74,222,128,0.1)]' 
                : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
              ${status === 'scanning' ? 'opacity-80 cursor-wait bg-zinc-800 text-white' : ''}
            `}
          >
            {status === 'scanning' ? <><Loader2 className="animate-spin w-4 h-4" /> SCANNING...</> : 
             status === 'ready' ? <><Sparkles className="w-4 h-4 animate-pulse" /> SYSTEM ONLINE</> : 
             <>INITIALIZE SCAN <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
          </button>

          {/* SYSTEM LOGS (Matrix Green on Black) */}
          {(status === 'scanning' || logs.length > 0) && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between mb-2 px-1">
                 <div className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-wider font-mono">
                   <Code2 className="w-3 h-3" /> Process Stream
                 </div>
                 <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse delay-75"></div>
                 </div>
               </div>
               <div className="bg-black rounded-lg border border-white/10 p-4 h-64 overflow-y-auto font-mono text-[10px] leading-relaxed shadow-inner custom-scrollbar relative group">
                  {/* CRT Scanline Effect (Subtle) */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20 group-hover:opacity-10 transition-opacity"></div>
                  
                  {logs.length === 0 && <span className="text-zinc-700 animate-pulse">&gt; Waiting for signal...</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="border-l-2 border-transparent hover:border-green-500/50 pl-2 transition-all text-zinc-400 hover:text-green-400 hover:bg-white/5 break-all">
                      <span className="text-zinc-700 mr-2 opacity-50">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <span className="opacity-90">{log}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 text-center text-[9px] text-zinc-700 font-mono tracking-widest uppercase hover:text-zinc-500 transition-colors cursor-help">
          Powered by Gemini 1.5 • Pinecone • MERN
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-[#050505]">
        
        {/* Background Grid - Very Subtle */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none"></div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth relative z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/10 transition-transform duration-300 hover:scale-110 shadow-lg
                ${msg.role === 'bot' ? 'bg-black animate-float' : 'bg-white'}`}>
                {msg.role === 'bot' ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-black" />}
              </div>
              
              {/* Message Bubble */}
              <div className={`p-5 rounded-xl max-w-[80%] leading-relaxed shadow-sm border transition-all duration-300 hover:shadow-md
                ${msg.role === 'bot' 
                  ? 'bg-zinc-900/50 border-white/5 text-gray-300 rounded-tl-none hover:border-white/10' 
                  : 'bg-white border-white text-black rounded-tr-none hover:bg-gray-100'}`}>
                
                <ReactMarkdown 
                  components={{
                    code: ({node, inline, className, children, ...props}) => {
                      return !inline ? (
                        <div className="bg-black rounded-md my-4 overflow-hidden border border-white/10 group">
                          <div className="bg-zinc-900/50 px-4 py-1.5 text-[10px] text-zinc-500 border-b border-white/5 flex items-center justify-between font-mono uppercase group-hover:text-zinc-300 transition-colors">
                            <span>Code Snippet</span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <code className="text-sm font-mono text-gray-300" {...props}>
                              {children}
                            </code>
                          </div>
                        </div>
                      ) : (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-white border border-white/10 hover:bg-white/20 transition-colors" {...props}>
                          {children}
                        </code>
                      )
                    },
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1 text-zinc-400" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1 text-zinc-400" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold my-3 border-b border-white/10 pb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    a: ({node, ...props}) => <a className="underline hover:text-blue-400 transition-colors" target="_blank" {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {status === 'chatting' && (
             <div className="flex gap-4 animate-pulse ml-14">
               <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center border border-white/10">
                 <Loader2 className="animate-spin w-4 h-4 text-white"/>
               </div>
               <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/5 text-zinc-500 text-xs italic flex items-center gap-2 font-mono">
                 Processing query...
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-zinc-950 border-t border-zinc-900 z-20">
          <div className="max-w-4xl mx-auto relative transition-all duration-300">
            {/* Input Glow: Purple/Pink */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg blur opacity-20 group-hover:opacity-50 transition duration-700"></div>
            <div className="relative flex gap-3 items-center bg-black rounded-lg p-2 border border-zinc-800 focus-within:border-white/30 transition-colors shadow-2xl">
              <div className="pl-3 text-zinc-600">
                <Command className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Ask a follow-up question..."
                className="flex-1 p-2 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm font-medium"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                disabled={status !== 'ready' && status !== 'chatting'} 
              />
              <button 
                onClick={handleAsk}
                disabled={status !== 'ready' && status !== 'chatting'}
                className="p-2 bg-white hover:bg-zinc-200 rounded-md text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-zinc-600 text-[10px] mt-4 font-mono">
              REPO ROVER CAN MAKE MISTAKES. CHECK IMPORTANT INFO.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  )
}

export default App