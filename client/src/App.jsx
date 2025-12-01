import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Github, Bot, User, Loader2, Database, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { io } from "socket.io-client";

function App() {
  // State variables
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | scanning | ready | chatting
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! Enter a GitHub URL to start chatting with your codebase. 🤖' }
  ]);
  const [question, setQuestion] = useState('');
  
  // Real-time Logs ke liye state
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  // 🔌 Socket Connection Setup
  useEffect(() => {
    const socket = io("http://localhost:5000");
    
    socket.on("log", (message) => {
      setLogs(prev => [...prev, message]);
    });

    return () => socket.disconnect();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 1. Repo Scan karne wala function
  const handleIngest = async () => {
    if (!repoUrl) return;
    setStatus('scanning');
    setLogs([]); // Purane logs saaf karo
    
    try {
      // Backend ko call lagayi
      const res = await axios.post('http://localhost:5000/api/ingest', { repoUrl });
      console.log(res.data);
      setStatus('ready');
      setMessages(prev => [...prev, { role: 'bot', text: `Success! I've analyzed ${res.data.totalFiles} files. Ask me anything!` }]);
    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert('Failed to scan repo. Check console.');
    }
  };

  // 2. Sawal puchne wala function
  const handleAsk = async () => {
    if (!question) return;
    
    const userQ = question;
    setQuestion(''); // Input clear karo
    setMessages(prev => [...prev, { role: 'user', text: userQ }]); // Screen pe user ka msg dikhao
    setStatus('chatting');

    try {
      // Backend se answer mango
      const res = await axios.post('http://localhost:5000/api/chat', { question: userQ });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Oops! Something went wrong." }]);
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      
      {/* SIDEBAR: Repo Setup */}
      <div className="w-1/4 bg-gray-800 p-6 border-r border-gray-700 flex flex-col">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-8 text-blue-400">
          <Database className="w-8 h-8" /> RepoRover
        </h1>

        <div className="space-y-4">
          <label className="text-sm text-gray-400 uppercase tracking-wider">GitHub Repository</label>
          <input 
            type="text" 
            placeholder="https://github.com/owner/repo"
            className="w-full p-3 bg-gray-900 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={status === 'scanning' || status === 'ready'}
          />
          
          <button 
            onClick={handleIngest}
            disabled={status === 'scanning' || status === 'ready'}
            className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 transition-all
              ${status === 'ready' ? 'bg-green-600 cursor-default' : 'bg-blue-600 hover:bg-blue-500'}
              ${status === 'scanning' ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {status === 'scanning' ? <Loader2 className="animate-spin" /> : 
             status === 'ready' ? 'System Ready' : <><Github className="w-4 h-4" /> Scan Codebase</>}
          </button>
        </div>

        {/* LOGS WINDOW (Matrix Style) */}
        {(status === 'scanning' || logs.length > 0) && (
          <div className="mt-6 flex-1 flex flex-col min-h-0">
             <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider">
               <Terminal className="w-3 h-3" /> System Logs
             </div>
             <div className="flex-1 bg-black rounded border border-gray-700 p-3 overflow-y-auto font-mono text-xs">
                {logs.length === 0 && <span className="text-gray-600">Waiting for logs...</span>}
                {logs.map((log, i) => (
                  <div key={i} className="text-gray-400 border-b border-gray-900 py-1 break-all">
                    <span className="text-green-500 mr-2">➜</span>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
             </div>
          </div>
        )}

        <div className="mt-auto pt-4 text-xs text-gray-500">
          Powered by Gemini & Pinecone
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        
        {/* Messages */}
        <div className="flex-1 p-8 overflow-y-auto space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 
                ${msg.role === 'bot' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                {msg.role === 'bot' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              
              {/* MARKDOWN RENDERING */}
              <div className={`p-4 rounded-lg max-w-[80%] leading-relaxed shadow-lg
                ${msg.role === 'bot' ? 'bg-gray-800 text-gray-100' : 'bg-purple-900 text-white'}`}>
                
                <ReactMarkdown 
                  components={{
                    // Code Blocks ko sundar banao
                    code: ({node, inline, className, children, ...props}) => {
                      return !inline ? (
                        <div className="bg-gray-950 p-3 rounded-md my-2 overflow-x-auto border border-gray-700">
                          <code className="text-sm font-mono text-blue-300" {...props}>
                            {children}
                          </code>
                        </div>
                      ) : (
                        <code className="bg-gray-700 px-1 py-0.5 rounded font-mono text-sm text-yellow-300" {...props}>
                          {children}
                        </code>
                      )
                    },
                    // Lists ko bullet points do
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                    // Headings ko bada karo
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2 text-blue-200" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2 text-blue-200" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>

              </div>
            </div>
          ))}
          
          {status === 'chatting' && (
             <div className="flex gap-4">
               <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"><Loader2 className="animate-spin w-5 h-5"/></div>
               <div className="p-4 rounded-lg bg-gray-800 text-gray-400 italic">Reading code & thinking...</div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gray-800 border-t border-gray-700">
          <div className="flex gap-4 max-w-4xl mx-auto">
            <input 
              type="text" 
              placeholder="Ask a question about the code..."
              className="flex-1 p-4 bg-gray-900 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              disabled={status !== 'ready' && status !== 'chatting'} 
            />
            <button 
              onClick={handleAsk}
              disabled={status !== 'ready' && status !== 'chatting'}
              className="px-6 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
        
      </div>
    </div>
  )
}

export default App;