import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup'; // (Jo tumne pehle banaya tha)
import ChatInterface from './pages/ChatInterface';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Agar koi seedha '/' pe aaye, to ChatInterface dikhao (wo khud check karega login hai ya nahi) */}
        <Route path="/" element={<ChatInterface />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Agar koi galat URL dale, to wapas home bhej do */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;