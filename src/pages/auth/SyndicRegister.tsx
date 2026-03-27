import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { buildFullName } from '../../lib/app-helpers';
import { getNominatimSearchUrl } from '../../lib/url-config';

type SyndicRegisterProps = {
  onRegister: () => void;
  onBack: () => void;
};

export const SyndicRegister = ({ onRegister, onBack }: SyndicRegisterProps) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    name: '',
    first_name: '',
    last_name: '',
    company_name: '',
    phone: '',
    street: '',
    number: '',
    box: '',
    zip: '',
    city: '',
    vat_number: '',
    bce_number: '',
    ipi_number: '',
    is_ipi_certified: false,
    accept_legal: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleStreetChange = (val: string) => {
    setForm({ ...form, street: val });
    if (val.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          format: 'json',
          q: val,
          addressdetails: '1',
          countrycodes: 'be,fr,lu,ch',
          limit: '5',
        });
        const res = await fetch(`${getNominatimSearchUrl()}?${params.toString()}`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (e) {
        console.error(e);
      }
    }, 500);
  };

  const selectSuggestion = (s: any) => {
    const street = s.address?.road || s.address?.pedestrian || s.name || s.display_name.split(',')[0];
    const zip = s.address?.postcode || form.zip;
    const city = s.address?.city || s.address?.town || s.address?.village || s.address?.municipality || form.city;

    setForm({
      ...form,
      street,
      zip,
      city
    });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (!form.accept_legal) {
      setError('Vous devez accepter les mentions legales et la politique de confidentialite.');
      return;
    }

    const cleanVat = form.vat_number.replace(/[\s.-]/g, '').toUpperCase();
    if (!/^(BE)?(0|1)\d{9}$/.test(cleanVat)) {
      setError("Le numéro de TVA n'est pas valide pour la Belgique (ex: BE0123456789).");
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        name: buildFullName(form.first_name, form.last_name, form.name)
      })
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const d = await res.json();
      setError(d.error || "Erreur lors de l'inscription");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Inscription Réussie !</h2>
          <p className="text-zinc-500 text-sm mb-8">
            Un email de vérification a été envoyé à <strong>{form.email}</strong>.
            Veuillez cliquer sur le lien qu&apos;il contient pour activer votre compte.
            Vérifiez également vos courriers indésirables (spams).
          </p>
          <button onClick={onRegister} className="w-full bg-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-2xl border border-black/5">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tighter uppercase">Inscription Syndic</span>
          </div>
          <button onClick={onBack} className="text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prénom</label>
              <input required type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom</label>
              <input required type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Société de Syndic</label>
              <input required type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email Professionnel</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mot de passe</label>
              <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
              <p className="text-[10px] text-zinc-500">Minimum 8 caracteres.</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Confirmer mot de passe</label>
            <input required minLength={8} type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Téléphone</label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numéro de TVA</label>
              <input required type="text" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numéro BCE</label>
              <input type="text" value={form.bce_number} onChange={(e) => setForm({ ...form, bce_number: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numéro IPI</label>
              <input type="text" value={form.ipi_number} onChange={(e) => setForm({ ...form, ipi_number: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-zinc-50 px-4 py-4 mt-6 md:mt-0 cursor-pointer">
              <input type="checkbox" checked={form.is_ipi_certified} onChange={(e) => setForm({ ...form, is_ipi_certified: e.target.checked })} className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Certifié IPI</span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Rue</label>
              <input
                required
                type="text"
                value={form.street}
                onChange={(e) => handleStreetChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-black/5 last:border-0 text-sm"
                    >
                      <div className="font-bold">{s.address?.road || s.address?.pedestrian || s.name || s.display_name.split(',')[0]}</div>
                      <div className="text-xs text-zinc-500">{s.address?.postcode} {s.address?.city || s.address?.town || s.address?.village || s.address?.municipality}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Numéro</label>
                <input required type="text" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Boîte</label>
                <input type="text" value={form.box} onChange={(e) => setForm({ ...form, box: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Code Postal</label>
                <input required type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Commune</label>
                <input required type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-4">
            <input
              required
              type="checkbox"
              checked={form.accept_legal}
              onChange={(e) => setForm({ ...form, accept_legal: e.target.checked })}
              className="mt-0.5"
            />
            <span className="text-xs text-zinc-600 leading-relaxed">
              J&apos;accepte les <a href="/mentions-legales" className="underline hover:text-black">mentions legales</a> et la <a href="/confidentialite" className="underline hover:text-black">politique de confidentialite</a>.
            </span>
          </label>

          <button type="submit" disabled={!form.accept_legal} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50">
            Créer mon compte syndic
          </button>
        </form>
      </div>
    </div>
  );
};
