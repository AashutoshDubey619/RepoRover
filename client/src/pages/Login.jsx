import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, LogIn, Mail, Lock } from 'lucide-react';
import logo from '../assets/logo.png';  

const API_BASE_URL = 'https://reporover-backend.onrender.com';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.result));
      alert("Login Successful! 🚀");
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || "Login Failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 py-10 selection:bg-purple-500/30 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[150px] top-[-20%] left-[-10%]" />
      <div className="absolute w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[150px] bottom-[-20%] right-[-10%]" />

      <div className="w-full max-w-md bg-zinc-950/60 backdrop-blur-xl p-8 sm:p-10 rounded-2xl border border-white/10 shadow-2xl z-10">

        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-6">
     <div className="relative mb-3">
  {/* outer glow layer */}
  <div className="absolute inset-0 blur-2xl bg-[#d06bff]/40 rounded-full scale-150 opacity-90"></div>

  {/* inner glow behind logo */}
  <div className="absolute inset-0 blur-xl bg-[#e39fff]/60 rounded-full scale-110 opacity-90"></div>

  {/* actual logo */}
  <img
    src={logo}
    alt="RepoRover Logo"
    className="
      relative w-20 h-20   /* slightly larger for clarity */
      brightness-150
      contrast-140
      drop-shadow-[0_0_45px_rgba(255,190,255,1)]
      transition-all duration-500
      hover:drop-shadow-[0_0_70px_rgba(255,200,255,1)]
      hover:brightness-[1.7]
      hover:scale-[1.1]
    "
  />
</div>





          <h1 className="text-3xl font-extrabold tracking-wide bg-gradient-to-r from-violet-300 via-white to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(200,100,255,0.4)] animate-[glow_3s_ease-in-out_infinite]">
            RepoRover
          </h1>
        </div>

        <h2 className="text-xl font-bold text-center mb-2">Welcome Back</h2>
        <p className="text-zinc-500 text-center text-sm mb-6">Login to access your RepoRover workspace</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-zinc-500" />
            <input type="email" placeholder="Email Address" required
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-600 transition"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-zinc-500" />
            <input type="password" placeholder="Password" required
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-600 transition"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>

          <button disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition flex justify-center items-center gap-2 disabled:opacity-70">
            {isLoading ? <Loader2 className="animate-spin" /> : <>Sign In <LogIn /></>}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-xs mt-8">
          New to RepoRover? <Link to="/signup" className="text-violet-400 hover:text-fuchsia-400 underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
