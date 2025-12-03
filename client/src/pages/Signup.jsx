import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Database, UserPlus, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const API_BASE_URL = 'https://reporover-backend.onrender.com';

function Signup() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      // Success hone par thoda wait karke redirect karenge
      setTimeout(() => {
        alert('Registration Successful! Please Login.');
        navigate('/login');
      }, 1000);
    } catch (err) {
      alert('Error registering user');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white items-center justify-center font-sans selection:bg-purple-500/30 selection:text-white overflow-hidden relative">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-[400px] p-8 bg-zinc-950/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl relative z-10 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-lg mb-4 group transition-all duration-300 hover:scale-110 hover:border-violet-500/30">
            <Database className="w-8 h-8 text-violet-400 group-hover:text-fuchsia-400 transition-colors duration-300" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Join RepoRover
          </h2>
          <p className="text-zinc-500 text-sm mt-2">Start analyzing code with AI power</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Username Input */}
          <div className="group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Username" 
                required
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-white placeholder-zinc-600"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              </div>
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-white placeholder-zinc-600"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                required
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-white placeholder-zinc-600"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-fuchsia-400 font-medium transition-colors hover:underline underline-offset-4">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;