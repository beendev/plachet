import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

type AdminLoginProps = {
  onLogin: (session: { user: any; token?: string }) => void;
  onRegisterClick: () => void;
  onForgotPasswordClick: () => void;
  onBack?: () => void;
};

export const AdminLogin = ({ onLogin, onRegisterClick, onForgotPasswordClick, onBack }: AdminLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setNeedsVerification(false);
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
        onLogin({ user: payload, token: '' });
      } else {
        setError('Session invalide');
      }
    } else {
      const data = await res.json().catch(() => ({}));
      const errMsg = data?.error || 'Identifiants invalides';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('vérifier') || errMsg.toLowerCase().includes('email')) {
        setNeedsVerification(true);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) { setError('Entrez votre email pour renvoyer le lien.'); return; }
    setResendStatus('sending');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setResendStatus('sent');
        setError('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Erreur lors de l'envoi.");
        setResendStatus('idle');
      }
    } catch {
      setError("Erreur réseau.");
      setResendStatus('idle');
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
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">
            {error}
          </div>
        )}
        {resendStatus === 'sent' && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-xs font-bold mb-6">
            Email de vérification renvoyé ! Vérifiez votre boîte mail (et vos spams).
          </div>
        )}
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 pr-12 focus:ring-2 focus:ring-black outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button onClick={handleSubmit} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all">
            Se connecter
          </button>
          {needsVerification && resendStatus !== 'sent' && (
            <button
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending'}
              className="w-full bg-amber-50 text-amber-700 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Envoi en cours...' : 'Renvoyer le mail de vérification'}
            </button>
          )}
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
