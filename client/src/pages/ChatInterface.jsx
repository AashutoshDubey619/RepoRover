import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Github, Bot, User, Loader2, Database, Terminal, Sparkles, Code2, ChevronRight, Command, MessageSquare, Plus, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { io } from "socket.io-client";
import { useNavigate } from 'react-router-dom';

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
  
  const logsEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // Security Check
  useEffect(() => {
    if (!localStorage.getItem('token')) {
        navigate('/login');
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
  };

  const loadChat = async (url) => {
      setRepoUrl(url);
      setStatus('ready'); 
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
      setMessages(prev => [...prev, { role: 'bot', text: `${res.data.totalFiles} files activated — query engine is now online.` }]);
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
      
      {/* SIDEBAR */}
      <div className="w-[300px] flex flex-col border-r border-zinc-800 bg-black relative z-20 shrink-0">
        
        {/* Header / New Chat */}
        <div className="p-4 border-b border-zinc-800">
            <button 
                onClick={startNewChat}
                className="w-full flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-md font-medium text-sm hover:bg-zinc-200 transition-all shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            >
                <Plus className="w-4 h-4" /> New Chat
            </button>
        </div>

        {/* Recent Chats List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
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
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group mb-1 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]
                            ${repoUrl === chat.repoUrl ? 'bg-zinc-900 text-white border border-zinc-700' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'}
                        `}
                    >
                        <Github className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:text-white transition-colors" />
                        <span className="truncate font-mono text-xs">{chat.repoUrl.replace('https://github.com/', '')}</span>
                    </button>
                ))
            )}
        </div>

        {/* User / Logout Footer */}
        <div className="p-4 border-t border-zinc-800 bg-black">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400 group cursor-default">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 group-hover:border-zinc-500 transition-colors">
                        <User className="w-4 h-4 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">User</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-green-400 transition-colors">Online</span>
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative bg-zinc-950 min-w-0">
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
        
        {/* Top Bar */}
        <div className="p-4 border-b border-zinc-800 bg-black/50 backdrop-blur-md z-30 flex gap-4 items-center sticky top-0">
             <div className="relative flex-1 max-w-2xl group">
                {/* Glow effect on input focus */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-md blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                
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
                className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-md font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95"
            >
                {status === 'scanning' ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 text-yellow-500 fill-current" />}
                {status === 'scanning' ? 'Scanning' : 'Analyze'}
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth relative z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar: Robot Icon with Float Animation */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-xs font-bold shadow-sm transition-all hover:scale-110
                ${msg.role === 'bot' 
                  ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)] animate-float' 
                  : 'bg-black text-white border-zinc-700'}`}>
                {msg.role === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
              </div>
              
              <div className={`max-w-[85%] leading-relaxed text-[15px]
                ${msg.role === 'bot' ? 'text-zinc-300' : 'bg-zinc-900 px-4 py-2 rounded-lg text-white font-medium border border-zinc-800'}`}>
                <ReactMarkdown 
                  components={{
                    code: ({node, inline, className, children, ...props}) => {
                      return !inline ? (
                        <div className="bg-black rounded-md my-4 overflow-hidden border border-zinc-800 shadow-sm group">
                           <div className="bg-zinc-900 px-4 py-2 text-[10px] text-zinc-500 border-b border-zinc-800 flex items-center justify-between font-mono uppercase group-hover:text-zinc-300 transition-colors">
                            <span>Code Snippet</span>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <code className="text-sm font-mono text-zinc-300" {...props}>{children}</code>
                          </div>
                        </div>
                      ) : (
                        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200 border border-zinc-700" {...props}>{children}</code>
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
            <div className="mx-12 mt-4 bg-black border border-zinc-800 rounded-md font-mono text-[10px] h-48 overflow-y-auto custom-scrollbar shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
               {logs.map((log, i) => (
                 <div key={i} className="text-zinc-500 py-0.5 border-l-2 border-transparent pl-2 hover:text-green-400 hover:border-green-500 transition-colors cursor-default">
                   <span className="text-green-500 mr-2">{'>'}</span>{log}
                 </div>
               ))}
               <div ref={logsEndRef} />
            </div>
           )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-zinc-950 border-t border-zinc-900 z-20">
          <div className="max-w-4xl mx-auto relative group">
            
            {/* Glow Effect on Input Container */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-lg blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
            
            <div className="relative flex gap-3 items-center bg-black rounded-lg p-2 border border-zinc-800 focus-within:border-zinc-600 transition-colors shadow-2xl">
              <div className="pl-3 text-zinc-600"><Command className="w-4 h-4" /></div>
              <input 
                type="text" 
                placeholder="Ask a follow-up question..."
                className="flex-1 p-2 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm font-medium"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                disabled={status === 'scanning'} 
              />
              <button 
                onClick={handleAsk} 
                disabled={status === 'scanning'} 
                className="p-2 bg-white hover:bg-zinc-200 rounded-md text-black transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95"
              >
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