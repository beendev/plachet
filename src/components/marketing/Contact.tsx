import React, { useState } from 'react';
import { Check, Mail } from 'lucide-react';

export const Contact = () => {
  const [form, setForm] = useState({ name: '', company: '', email: '', message: '', consent: false });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setStatus('success');
    setForm({ name: '', company: '', email: '', message: '', consent: false });
  };

  return (
    <section id="contact" className="py-16 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="bg-zinc-50 rounded-[24px] md:rounded-[48px] p-6 md:p-12 lg:p-24 grid lg:grid-cols-2 gap-10 lg:gap-24">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase mb-4 md:mb-6">Contactez <br className="hidden md:block" /> l&apos;expert.</h2>
            <p className="text-zinc-500 text-sm md:text-lg mb-8 md:mb-12">
              Vous êtes syndic ? Déléguez-nous la gestion de vos plaques et gagnez un temps précieux.
            </p>

            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4 md:gap-6 bg-white md:bg-transparent p-4 md:p-0 rounded-2xl md:rounded-none shadow-sm md:shadow-none">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 md:bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-black shrink-0">
                  <Mail size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Email</div>
                  <div className="text-base md:text-xl font-bold">info@plachet.be</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[20px] md:rounded-[32px] shadow-xl shadow-black/5">
            {status === 'success' ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-12">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 md:mb-6">
                  <Check size={24} className="md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Message envoyé !</h3>
                <p className="text-zinc-500 text-xs md:text-sm">Nous reviendrons vers vous très rapidement.</p>
                <button onClick={() => setStatus('idle')} className="mt-6 md:mt-8 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Envoyer un autre message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
                    <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Société / Syndic</label>
                    <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none text-sm" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-400">Message / Adresse d&apos;intervention</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-black outline-none resize-none text-sm" />
                </div>
                <label className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-3">
                  <input
                    required
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span className="text-[11px] text-zinc-600 leading-relaxed">
                    J&apos;accepte que mes donnees soient utilisees pour etre recontacte par Plachet, conformement a la politique de confidentialite.
                  </span>
                </label>
                <button disabled={status === 'loading' || !form.consent} className="w-full bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all disabled:opacity-50">
                  {status === 'loading' ? 'Envoi...' : 'Nous contacter'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
