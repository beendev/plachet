import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPassword = ({ onBack }: { onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5">
        <button onClick={onBack} className="mb-8 text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
        </button>
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Mot de passe oublié</h2>
        <p className="text-sm text-zinc-500 mb-8">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>

        {status === 'success' ? (
          <div className="bg-emerald-50 text-emerald-600 p-6 rounded-2xl text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-4" />
            <p className="font-bold text-sm">Email envoyé !</p>
            <p className="text-xs mt-2 opacity-80">Vérifiez votre boîte de réception.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {status === 'error' && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold">Une erreur est survenue.</div>}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" placeholder="pl@chet.be" />
            </div>
            <button onClick={handleSubmit} disabled={status === 'loading' || !email} className="w-full bg-black text-white rounded-xl py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50">
              {status === 'loading' ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
