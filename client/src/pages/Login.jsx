import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Database } from 'lucide-react';

const API_BASE_URL = 'https://reporover-backend.onrender.com';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Backend Login API call
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      
      // Token save karo (Browser ki memory mein)
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.result));
      
      alert('Login Successful! 🚀');
      navigate('/'); // Chat page par bhej do
    } catch (err) {
      alert(err.response?.data?.message || 'Login Failed');
    }
  };

  return (
    <div className="flex h-screen bg-black text-white items-center justify-center selection:bg-purple-500/30">
      <div className="w-96 p-8 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="flex justify-center mb-6 text-violet-400">
          <Database className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-center tracking-tight">Welcome Back</h2>
        <p className="text-zinc-500 text-center text-sm mb-8">Login to access your RepoRover workspace</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="email" placeholder="Email Address" 
              className="w-full p-3 bg-black rounded-lg border border-zinc-800 focus:border-violet-500 focus:outline-none text-sm transition-colors"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <input 
              type="password" placeholder="Password" 
              className="w-full p-3 bg-black rounded-lg border border-zinc-800 focus:border-violet-500 focus:outline-none text-sm transition-colors"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button className="w-full p-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors mt-2">
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-zinc-600 text-xs">
          New to RepoRover? <Link to="/signup" className="text-violet-400 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;