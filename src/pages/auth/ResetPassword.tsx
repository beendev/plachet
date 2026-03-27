import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const ResetPassword = ({ token }: { token: string }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setStatus('error');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm_password: confirmPassword })
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Mot de passe modifié</h2>
          <p className="text-sm text-zinc-500 mb-8">Votre mot de passe a été mis à jour avec succès.</p>
          <a href="/" className="inline-block bg-black text-white rounded-xl px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5">
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Nouveau mot de passe</h2>
        <p className="text-sm text-zinc-500 mb-8">Choisissez votre nouveau mot de passe.</p>
        <div className="space-y-6">
          {status === 'error' && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold">Le lien est invalide/expiré, les mots de passe ne correspondent pas, ou le mot de passe contient moins de 8 caracteres.</div>}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nouveau mot de passe</label>
            <input minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" placeholder="••••••••" />
            <p className="text-[10px] text-zinc-500">Minimum 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer mot de passe</label>
            <input minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" placeholder="••••••••" />
          </div>
          <button onClick={handleSubmit} disabled={status === 'loading' || password.length < 8 || confirmPassword.length < 8 || password !== confirmPassword} className="w-full bg-black text-white rounded-xl py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50">
            {status === 'loading' ? 'Modification...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};
