import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export const CachetsPage = ({ onBack }: { onBack?: () => void }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: 'Demande de cachet' })
      });
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-[100svh] pt-32 pb-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        {onBack && (
          <button onClick={onBack} className="mb-8 text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
          </button>
        )}
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
          Vous souhaitez commander un <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">cachet pour votre entreprise ?</span>
        </h1>
        <p className="text-zinc-500 text-lg mb-12">
          Contactez-nous dès aujourd&apos;hui pour concevoir votre cachet professionnel sur mesure.
        </p>

        {status === 'success' ? (
          <div className="bg-emerald-50 text-emerald-600 p-8 rounded-2xl text-center">
            <h3 className="text-xl font-bold mb-2">Message envoyé !</h3>
            <p>Nous vous recontacterons dans les plus brefs délais.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom de l&apos;entreprise / Contact</label>
              <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Détails de votre demande</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none resize-none" placeholder="Précisez le texte à inclure, le format souhaité..." />
            </div>
            <button disabled={status === 'loading'} type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50">
              {status === 'loading' ? 'Envoi...' : 'Nous contacter'}
            </button>
            {status === 'error' && <p className="text-red-500 text-sm text-center">Une erreur est survenue. Veuillez réessayer.</p>}
          </form>
        )}
      </div>
    </div>
  );
};
