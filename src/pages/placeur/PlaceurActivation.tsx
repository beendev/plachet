import React, { useState } from 'react';

export const PlaceurActivation = ({ token }: { token: string }) => {
  const [form, setForm] = useState({ password: '', confirm: '', phone: '', street: '', number: '', box: '', zip: '', city: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const canSubmit = form.password.length >= 8 && form.password === form.confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/placeurs/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password, phone: form.phone, street: form.street, number: form.number, box: form.box, zip: form.zip, city: form.city })
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
        <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-500 flex items-center justify-center text-xl font-bold mx-auto">✔</div>
          <h1 className="text-2xl font-bold">Compte activé</h1>
          <p className="text-sm text-zinc-500">Vous pouvez maintenant vous connecter et consulter vos poses.</p>
          <a href="/syndic/login" className="inline-block bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest">Se connecter</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-black/5 w-full max-w-2xl border border-black/5">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Activer votre accès placeur</h1>
        <p className="text-sm text-zinc-500 mb-6">Définissez votre mot de passe et complétez vos coordonnées avant de commencer.</p>
        {status === 'error' && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-4">Lien invalide ou erreur. Réessayez.</div>}
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
            <input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            <p className="text-[10px] text-zinc-500">Minimum 8 caractères.</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer</label>
            <input type="password" minLength={8} required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rue</label>
            <input type="text" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numéro</label>
            <input type="text" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Boîte</label>
            <input type="text" value={form.box} onChange={(e) => setForm({ ...form, box: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Code postal</label>
            <input type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ville</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={!canSubmit || status === 'loading'} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50">
              {status === 'loading' ? 'Activation...' : 'Activer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
