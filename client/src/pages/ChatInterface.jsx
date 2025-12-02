import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Github, Bot, User, Loader2, Database, Terminal, Sparkles, Code2, ChevronRight, Command } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { io } from "socket.io-client";
import { useNavigate } from 'react-router-dom';

function ChatInterface() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Ready to analyze. Enter a GitHub repository URL to begin.' }
  ]);
  const [question, setQuestion] = useState('');
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // 1. SECURITY CHECK: Agar token nahi hai, to Login pe bhaga do
  useEffect(() => {
    if (!localStorage.getItem('token')) {
        navigate('/login');
    }
  }, [navigate]);

  // 🔌 Socket Connection (Robust)
  useEffect(() => {
    const socket = io("http://localhost:5000", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });
    
    socket.on("log", (message) => setLogs(prev => [...prev, message]));
    socket.on("connect_error", (err) => console.error("Socket Error:", err.message));

    return () => socket.disconnect();
  }, []); 

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleIngest = async () => {
    if (!repoUrl) return;
    setStatus('scanning');
    setLogs([]); 
    try {
      // JWT token header set karna zaroori hai for Auth
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/ingest', { repoUrl }, {
          headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('ready');
      setMessages(prev => [...prev, { role: 'bot', text: `Analysis complete. Indexing finished for ${res.data.totalFiles} files. System ready for queries.` }]);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setMessages(prev => [...prev, { role: 'bot', text: "Error: Failed to process repository." }]);
    }
  };

  const handleAsk = async () => {
    if (!question) return;
    const userQ = question;
    setQuestion(''); 
    setMessages(prev => [...prev, { role: 'user', text: userQ }]); 
    setStatus('chatting');

    try {
        const token = localStorage.getItem('token');
        const res = await axios.post('http://localhost:5000/api/chat', { question: userQ }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error generating response." }]);
    } finally {
      setStatus('ready');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black">
      
      {/* SIDEBAR: Vercel Style (Minimalist Black) */}
      <div className="w-[400px] flex flex-col border-r border-zinc-800 bg-black relative z-20 shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            {/* Robot Logo */}
            <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-all group-hover:scale-105">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight group-hover:text-zinc-200 transition-colors">RepoRover</h1>
          </div>
          
          {/* LOGOUT BUTTON */}
          <button onClick={handleLogout} className="px-2 py-1 rounded-md border border-zinc-700 text-[10px] font-medium text-zinc-400 hover:text-white hover:border-white transition-colors">
            LOGOUT
          </button>
        </div>

        {/* Input Section */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-4">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Github className="w-3 h-3" /> Repository Source
            </label>
            <div className="group relative">
              <input 
                type="text" 
                placeholder="github.com/owner/repo"
                className="w-full p-3 bg-zinc-900/50 rounded-md border border-zinc-800 focus:border-white focus:ring-0 focus:outline-none text-sm transition-all text-white placeholder-zinc-600 font-mono"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={status === 'scanning' || status === 'ready'}
              />
            </div>
          </div>
          
          <button 
            onClick={handleIngest}
            disabled={status === 'scanning' || status === 'ready'}
            className={`w-full py-3 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all border group
              ${status === 'ready' 
                ? 'bg-zinc-900 text-green-400 border-green-500/30 cursor-default shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
                : 'bg-white text-black border-white hover:bg-zinc-200'}
              ${status === 'scanning' ? 'opacity-80 cursor-wait bg-zinc-800 border-zinc-800 text-white' : ''}
            `}
          >
            {status === 'scanning' ? <><Loader2 className="animate-spin w-4 h-4" /> Processing...</> : 
             status === 'ready' ? <><Sparkles className="w-4 h-4" /> Active</> : 
             <>Connect Repository <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>}
          </button>

          {/* SYSTEM LOGS (Mono-spaced, High Contrast) */}
          {(status === 'scanning' || logs.length > 0) && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
                   <Terminal className="w-3 h-3" /> BUILD LOGS
                 </div>
               </div>
               <div className="bg-zinc-950 rounded-md border border-zinc-800 p-4 h-64 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar shadow-inner">
                  {logs.length === 0 && <span className="text-zinc-600 animate-pulse">Waiting for logs...</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="py-1 border-l-2 border-transparent pl-2 text-zinc-400">
                      <span className="text-zinc-600 mr-2 select-none">{'>'}</span>
                      <span className="">{log}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
          <span>STATUS: ONLINE</span>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-zinc-950">
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-12 overflow-y-auto space-y-10 scroll-smooth relative z-10 custom-scrollbar max-w-5xl mx-auto w-full">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-xs font-bold transition-transform duration-300 hover:scale-110 shadow-sm
                ${msg.role === 'bot' ? 'bg-white text-black border-white animate-float' : 'bg-black text-white border-zinc-700'}`}>
                {msg.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
              </div>
              
              {/* Message Content */}
              <div className={`leading-relaxed text-[15px]
                ${msg.role === 'bot' ? 'text-zinc-300' : 'text-white font-medium'}`}>
                
                <ReactMarkdown 
                  components={{
                    code: ({node, inline, className, children, ...props}) => {
                      return !inline ? (
                        <div className="bg-black rounded-md my-4 overflow-hidden border border-zinc-800 shadow-sm">
                          <div className="bg-zinc-900 px-4 py-2 text-[10px] text-zinc-500 border-b border-zinc-800 flex items-center justify-between font-mono uppercase">
                            <span>Code Snippet</span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <code className="text-sm font-mono text-zinc-300" {...props}>
                              {children}
                            </code>
                          </div>
                        </div>
                      ) : (
                        <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200 border border-zinc-800" {...props}>
                          {children}
                        </code>
                      )
                    },
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1 text-zinc-400" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1 text-zinc-400" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold my-4 text-white" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-semibold my-3 text-white" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-400 hover:underline underline-offset-4" target="_blank" {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          
          {status === 'chatting' && (
             <div className="flex gap-4 animate-pulse ml-14">
               <div className="text-zinc-500 text-xs font-mono flex items-center gap-2">
                 <Loader2 className="animate-spin w-3 h-3"/> Thinking...
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-zinc-950 border-t border-zinc-900 z-20">
          <div className="max-w-4xl mx-auto relative group">
            {/* Subtle glow effect on focus */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-500 rounded-lg blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
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
                className="p-2 bg-white hover:bg-zinc-200 rounded-md text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
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

export default ChatInterface;