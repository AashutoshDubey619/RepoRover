import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Github, Bot, User, Loader2, Database, Terminal, Sparkles, Code2, ChevronRight, Command, MessageSquare, Plus, LogOut, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { io } from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo.png";


function ChatInterface() {
  const navigate = useNavigate();
  
  // State variables
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Ready to analyze. Enter a GitHub repository URL to begin.' }
  ]);
  const [question, setQuestion] = useState('');
  const [logs, setLogs] = useState([]);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  const [username, setUsername] = useState('Engineer'); // Default username
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const logsEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // Security Check & Load User
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
        navigate('/login');
    } else if (storedUser) {
        // User data load karo
        const userObj = JSON.parse(storedUser);
        setUsername(userObj.username || 'Engineer');
    }
  }, [navigate]);

  // Fetch Chat History List
  const fetchChatList = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/chats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setChatHistoryList(res.data);
    } catch (err) {
        console.error("Failed to fetch chat list");
    }
  };

  useEffect(() => {
      fetchChatList();
  }, []);

  // Socket Connection
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const startNewChat = () => {
      setRepoUrl('');
      setMessages([{ role: 'bot', text: 'Ready to analyze. Enter a GitHub repository URL to begin.' }]);
      setStatus('idle');
      setLogs([]);
      setIsSidebarOpen(false); 
  };

  const loadChat = async (url) => {
      setRepoUrl(url);
      setStatus('ready'); 
      setIsSidebarOpen(false); 
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/chat/history?repoUrl=${url}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if(res.data.length > 0) {
            setMessages(res.data);
        } else {
            setMessages([{ role: 'bot', text: 'Ready to analyze. Enter a GitHub repository URL to begin.' }]);
        }
      } catch (err) {
          console.error("Failed to load chat history");
          setMessages([{ role: 'bot', text: 'Error loading history. Please try again.' }]);
      }
  };

  const handleIngest = async () => {
    if (!repoUrl) return;
    setStatus('scanning');
    setLogs([]); 
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/ingest', { repoUrl }, {
          headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('ready');
      setMessages(prev => [...prev, { role: 'bot', text: `Analysis complete. Indexing finished for ${res.data.totalFiles} files. System ready for queries.` }]);
      fetchChatList(); 
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
        const res = await axios.post('http://localhost:5000/api/chat', { question: userQ, repoUrl }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
        fetchChatList(); 
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error generating response." }]);
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black overflow-hidden">
      
      {/* 📱 MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold shadow-sm animate-float">
               <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">RepoRover</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400 hover:text-white">
             {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      {/* 🌑 MOBILE OVERLAY */}
      {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
      )}

      {/* 📂 SIDEBAR */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-[300px] flex flex-col border-r border-zinc-800 bg-black transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 hidden md:block">
            <div className="flex items-center gap-3 mb-4 group cursor-default">
                {/* FIX: animate-float moved to the container div for consistency with chat bubbles */}
                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300 animate-float">
                    <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-purple-400 transition-colors">RepoRover</h1>
            </div>
            <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 bg-white text-black px-4 py-2.5 rounded-md font-medium text-sm hover:bg-zinc-200 transition-all shadow-md active:scale-95"
            >
                <Plus className="w-4 h-4" /> New Chat
            </button>
        </div>

        {/* Mobile New Chat Button */}
        <div className="p-4 md:hidden mt-16">
            <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 bg-white text-black px-4 py-2.5 rounded-md font-medium text-sm hover:bg-zinc-200 transition-all shadow-md active:scale-95"
            >
                <Plus className="w-4 h-4" /> New Chat
            </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2 mb-1">
                Recent Repositories
            </div>
            {chatHistoryList.length === 0 ? (
                <div className="text-zinc-600 text-xs px-3 italic">No history yet.</div>
            ) : (
                chatHistoryList.map((chat, idx) => (
                    <button
                        key={idx}
                        onClick={() => loadChat(chat.repoUrl)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group mb-1
                            ${repoUrl === chat.repoUrl 
                                ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm' 
                                : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'}
                        `}
                    >
                        <Github className="w-4 h-4 shrink-0 opacity-70 group-hover:text-purple-400 transition-colors" />
                        <span className="truncate font-mono text-xs flex-1 text-left">
                            {chat.repoUrl.replace('https://github.com/', '')}
                        </span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                    </button>
                ))
            )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-800 bg-black">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200 truncate max-w-[120px]" title={username}>
                            {username}
                        </span>
                        <span className="text-[10px] text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                        </span>
                    </div>
                </div>
                <button 
                    onClick={handleLogout} 
                    className="text-zinc-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-md"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* 💬 MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative bg-zinc-950 min-w-0 pt-16 md:pt-0"> 
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
        
        {/* Top Bar (Repo Input) */}
        <div className="p-4 border-b border-zinc-800 bg-black/50 backdrop-blur-md z-30 flex flex-col md:flex-row gap-3 items-stretch md:items-center sticky top-0">
             <div className="relative flex-1 group transition-all duration-300">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-md blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 z-10 group-focus-within:text-white transition-colors" />
                <input 
                    type="text" 
                    placeholder="https://github.com/owner/repo"
                    className="relative w-full pl-10 pr-4 py-2.5 bg-zinc-900 rounded-md border border-zinc-800 focus:border-zinc-600 focus:ring-0 focus:outline-none text-sm text-white placeholder-zinc-600 font-mono transition-all shadow-sm"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={status === 'scanning'}
                />
             </div>
             <button 
                onClick={handleIngest}
                disabled={status === 'scanning' || !repoUrl}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-white text-black rounded-md font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md whitespace-nowrap"
            >
                {status === 'scanning' ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {status === 'scanning' ? 'Scanning' : 'Analyze'}
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 md:space-y-8 scroll-smooth relative z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-xs font-bold shadow-sm transition-transform hover:scale-105
                ${msg.role === 'bot' 
                  ? 'bg-zinc-900 border-zinc-700 shadow-[0_0_15px_rgba(168,85,247,0.1)] animate-float' 
                  : 'bg-white text-black border-white'}`}>
                {msg.role === 'bot' ? <Bot className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`max-w-[85%] md:max-w-[85%] leading-relaxed text-[14px] md:text-[15px] overflow-hidden shadow-sm
                ${msg.role === 'bot' ? 'text-zinc-300' : 'bg-zinc-900 px-4 py-2 rounded-lg text-white font-medium border border-zinc-800'}`}>
                <ReactMarkdown 
                  components={{
                    code: ({node, inline, className, children, ...props}) => {
                      return !inline ? (
                        <div className="bg-black rounded-md my-4 overflow-hidden border border-zinc-800 shadow-sm w-full">
                          <div className="bg-zinc-900 px-4 py-2 text-[10px] text-zinc-500 border-b border-zinc-800 flex items-center justify-between font-mono uppercase">
                            <span>Code</span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <code className="text-xs md:text-sm font-mono text-zinc-300 whitespace-pre" {...props}>{children}</code>
                          </div>
                        </div>
                      ) : (
                        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200 border border-zinc-700 break-all" {...props}>{children}</code>
                      )
                    }
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {status === 'chatting' && (
             <div className="flex gap-4 animate-pulse ml-12">
               <div className="text-zinc-500 text-xs font-mono flex items-center gap-2">
                 <Loader2 className="animate-spin w-3 h-3"/> Thinking...
               </div>
             </div>
          )}
          
           {/* Logs Overlay */}
           {status === 'scanning' && logs.length > 0 && (
            <div className="mx-4 md:mx-12 mt-4 p-4 bg-black border border-zinc-800 rounded-md font-mono text-[10px] h-48 overflow-y-auto custom-scrollbar shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
               {logs.map((log, i) => (
                 <div key={i} className="text-zinc-500 py-0.5 border-l-2 border-transparent pl-2">
                   <span className="text-green-500 mr-2">{'>'}</span>{log}
                 </div>
               ))}
               <div ref={logsEndRef} />
            </div>
           )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-zinc-950 border-t border-zinc-900 z-20 pb-safe">
          <div className="max-w-4xl mx-auto relative group">
             {/* Input Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            
            <div className="relative flex gap-2 md:gap-3 items-center bg-black rounded-lg p-2 border border-zinc-800 focus-within:border-zinc-600 transition-colors shadow-2xl">
              <div className="pl-2 md:pl-3 text-zinc-600 hidden md:block"><Command className="w-4 h-4" /></div>
              <input 
                type="text" 
                placeholder="Ask about the code..."
                className="flex-1 p-2 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm font-medium min-w-0"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                disabled={status === 'scanning'} 
              />
              <button onClick={handleAsk} disabled={status === 'scanning'} className="p-2 bg-white hover:bg-zinc-200 rounded-md text-black transition-all disabled:opacity-50 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface;