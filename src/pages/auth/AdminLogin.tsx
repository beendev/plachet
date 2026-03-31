import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

type AdminLoginProps = {
  onLogin: (session: { user: any; token?: string }) => void;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
  onBack?: () => void;
};

export const AdminLogin = ({ onLogin, onRegisterClick, onForgotPasswordClick, onBack }: AdminLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload?.user && payload?.token) {
        onLogin({ user: payload.user, token: payload.token });
      } else if (payload?.id && payload?.role) {
        // Legacy backend response compatibility (user object directly)
        onLogin({ user: payload, token: '' });
      } else {
        setError('Session invalide');
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Identifiants invalides');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 relative">
        {onBack && (
          <button onClick={onBack} className="absolute top-8 left-8 text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
          </button>
        )}
        <div className="flex justify-center mb-10 mt-4">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">P</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-8 tracking-tight">Accès Portail</h2>
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">{error}</div>}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" placeholder="pl@chet.be" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
              <button onClick={onForgotPasswordClick} className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Oublié ?</button>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" placeholder="••••••••" />
          </div>
          <button onClick={handleSubmit} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
            Se connecter
          </button>
          <div className="text-center pt-4">
            <button onClick={onRegisterClick} className="text-sm font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
              Pas encore de compte ? S&apos;inscrire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
