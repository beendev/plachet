import React, { useState } from 'react';
import { ArrowRight, Check, User, Building2, Wrench } from 'lucide-react';
import { getNominatimSearchUrl } from '../../lib/url-config';

type SyndicRegisterProps = {
  onRegister: () => void;
  onBack: () => void;
};

type RoleChoice = 'syndic' | 'placeur' | null;
type Step = 1 | 2 | 3;

const inputClass = 'w-full bg-zinc-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none';
const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-zinc-400';

export const SyndicRegister = ({ onRegister, onBack }: SyndicRegisterProps) => {
  const [step, setStep] = useState<Step>(1);
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(null);

  // Step 1 — user account
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3 syndic — professional info
  const [syndicName, setSyndicName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [isVatLiable, setIsVatLiable] = useState(true);
  const [vatNumber, setVatNumber] = useState('');
  const [ipiNumber, setIpiNumber] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [box, setBox] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [acceptLegal, setAcceptLegal] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [placeurSubmitted, setPlaceurSubmitted] = useState(false);

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleStreetChange = (val: string) => {
    setStreet(val);
    if (val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ format: 'json', q: val, addressdetails: '1', countrycodes: 'be,fr,lu,ch', limit: '5' });
        const res = await fetch(`${getNominatimSearchUrl()}?${params.toString()}`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (e) { console.error(e); }
    }, 500);
  };

  const selectSuggestion = (s: any) => {
    setStreet(s.address?.road || s.address?.pedestrian || s.name || s.display_name.split(',')[0]);
    setZip(s.address?.postcode || zip);
    setCity(s.address?.city || s.address?.town || s.address?.village || s.address?.municipality || city);
    setShowSuggestions(false);
  };

  const validateStep1 = () => {
    setError('');
    if (!firstName.trim() || !lastName.trim()) { setError('Prénom et nom requis.'); return false; }
    if (!email) { setError('Email requis.'); return false; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return false; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return false; }
    return true;
  };

  const handleStep1Next = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRoleSelect = (role: RoleChoice) => {
    setRoleChoice(role);
    setError('');
    setStep(3);
  };

  const handleSubmitSyndic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptLegal) { setError('Vous devez accepter les mentions légales et la politique de confidentialité.'); return; }
    if (!syndicName.trim()) { setError('Le nom du syndic est requis.'); return; }

    // Validate VAT if liable
    if (isVatLiable) {
      const cleanVat = vatNumber.replace(/[\s.-]/g, '').toUpperCase();
      if (!/^(BE)?(0|1)\d{9}$/.test(cleanVat)) {
        setError("Le numéro de TVA n'est pas valide (ex: BE0123456789)."); return;
      }
    }

    const fullVat = isVatLiable
      ? (vatNumber.toUpperCase().startsWith('BE') ? vatNumber : `BE${vatNumber.replace(/[\s.-]/g, '')}`)
      : vatNumber.replace(/[\s.-]/g, '');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, confirm_password: confirmPassword,
        first_name: firstName, last_name: lastName,
        name: syndicName,
        company_name: companyName,
        phone,
        vat_number: fullVat || null,
        ipi_number: ipiNumber || null,
        is_vat_liable: isVatLiable,
        street, number, box, zip, city,
        accept_legal: acceptLegal,
        role: 'syndic',
      }),
    });

    if (res.ok) { setSuccess(true); }
    else {
      const d = await res.json();
      setError(d.error || "Erreur lors de l'inscription");
    }
  };

  const handleSubmitPlaceur = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptLegal) { setError('Vous devez accepter les mentions légales et la politique de confidentialité.'); return; }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, confirm_password: confirmPassword,
        first_name: firstName, last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        accept_legal: acceptLegal,
        role: 'placeur',
      }),
    });

    if (res.ok) { setPlaceurSubmitted(true); }
    else {
      const d = await res.json();
      setError(d.error || "Erreur lors de l'inscription");
    }
  };

  // ────── Success screens ──────

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Inscription réussie !</h2>
          <p className="text-zinc-500 text-sm mb-8">
            Un email de vérification a été envoyé à <strong>{email}</strong>.
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

  if (placeurSubmitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Demande envoyée !</h2>
          <p className="text-zinc-500 text-sm mb-8">
            Votre demande pour devenir placeur a bien été enregistrée. Notre équipe l&apos;examinera et vous recevrez un email de confirmation à <strong>{email}</strong> une fois votre compte activé.
          </p>
          <button onClick={onRegister} className="w-full bg-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all">
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ────── Step indicators ──────

  const stepLabels = ['Compte', 'Profil', roleChoice === 'syndic' ? 'Syndic' : roleChoice === 'placeur' ? 'Placeur' : 'Infos'];

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1 as Step;
        const isActive = step === stepNum;
        const isDone = step > stepNum;
        return (
          <React.Fragment key={i}>
            {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-emerald-500' : 'bg-zinc-200'}`} />}
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-black text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400'}`}>
                {isDone ? <Check size={14} /> : stepNum}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest hidden sm:block ${isActive ? 'text-black' : 'text-zinc-400'}`}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  // ────── Step 1: User account ──────

  if (step === 1) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tighter uppercase">Inscription</span>
            </div>
            <button onClick={onBack} className="text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
            </button>
          </div>

          <StepIndicator />

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">{error}</div>}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={labelClass}>Prénom</label>
                <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Nom</label>
                <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Email professionnel</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="votre@email.be" />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Mot de passe</label>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
              <p className="text-[10px] text-zinc-400">Minimum 8 caractères</p>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Confirmer le mot de passe</label>
              <input type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            <button onClick={handleStep1Next} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
              Continuer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────── Step 2: Role choice ──────

  if (step === 2) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tighter uppercase">Votre profil</span>
            </div>
            <button onClick={() => setStep(1)} className="text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
            </button>
          </div>

          <StepIndicator />

          <p className="text-sm text-zinc-500 text-center mb-8">Je suis...</p>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleRoleSelect('syndic')}
              className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-zinc-100 hover:border-black transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <Building2 size={24} />
              </div>
              <div>
                <div className="font-bold text-base">Syndic</div>
                <div className="text-xs text-zinc-500 mt-0.5">Gérer mes immeubles et commandes de plaques</div>
              </div>
              <ArrowRight size={16} className="ml-auto text-zinc-300 group-hover:text-black transition-colors" />
            </button>

            <button
              onClick={() => handleRoleSelect('placeur')}
              className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-zinc-100 hover:border-black transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                <Wrench size={24} />
              </div>
              <div>
                <div className="font-bold text-base">Placeur</div>
                <div className="text-xs text-zinc-500 mt-0.5">Installer les plaques et gérer mes interventions</div>
              </div>
              <ArrowRight size={16} className="ml-auto text-zinc-300 group-hover:text-black transition-colors" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────── Step 3: Syndic professional info ──────

  if (step === 3 && roleChoice === 'syndic') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-2xl border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tighter uppercase">Infos Syndic</span>
            </div>
            <button onClick={() => setStep(2)} className="text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
            </button>
          </div>

          <StepIndicator />

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">{error}</div>}

          <form onSubmit={handleSubmitSyndic} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Nom du syndic (dénomination commerciale)</label>
                <input required type="text" value={syndicName} onChange={e => setSyndicName(e.target.value)} className={inputClass} placeholder="Ex: Gestion Immo BXL" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Dénomination sociale</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputClass} placeholder="Ex: Gestion Immo BXL SRL" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={labelClass}>Téléphone entreprise</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+32 2 xxx xx xx" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Numéro IPI</label>
                <input type="text" value={ipiNumber} onChange={e => setIpiNumber(e.target.value)} className={inputClass} placeholder="Optionnel" />
              </div>
            </div>

            {/* TVA */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className={labelClass}>Assujetti à la TVA ?</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsVatLiable(true)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${isVatLiable ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>
                    Oui
                  </button>
                  <button type="button" onClick={() => setIsVatLiable(false)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${!isVatLiable ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>
                    Non
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Numéro de TVA</label>
                <div className="flex items-center gap-0">
                  {isVatLiable && (
                    <div className="bg-black text-white px-3 py-4 rounded-l-xl text-sm font-bold">BE</div>
                  )}
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={e => setVatNumber(e.target.value)}
                    className={`flex-1 bg-zinc-50 border-none ${isVatLiable ? 'rounded-r-xl' : 'rounded-xl'} px-4 py-4 focus:ring-2 focus:ring-black outline-none`}
                    placeholder={isVatLiable ? '0123456789' : 'Numéro de TVA (optionnel)'}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Adresse du siège social</div>
              <div className="space-y-2 relative">
                <label className={labelClass}>Rue</label>
                <input
                  required type="text" value={street}
                  onChange={e => handleStreetChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className={inputClass}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button key={i} type="button" onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b border-black/5 last:border-0 text-sm">
                        <div className="font-bold">{s.address?.road || s.address?.pedestrian || s.name || s.display_name.split(',')[0]}</div>
                        <div className="text-xs text-zinc-500">{s.address?.postcode} {s.address?.city || s.address?.town || s.address?.village || s.address?.municipality}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelClass}>Numéro</label>
                  <input required type="text" value={number} onChange={e => setNumber(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Boîte</label>
                  <input type="text" value={box} onChange={e => setBox(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelClass}>Code postal</label>
                  <input required type="text" value={zip} onChange={e => setZip(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Commune</label>
                  <input required type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-4">
              <input required type="checkbox" checked={acceptLegal} onChange={e => setAcceptLegal(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-zinc-600 leading-relaxed">
                J&apos;accepte les <a href="/mentions-legales" className="underline hover:text-black">mentions légales</a> et la <a href="/confidentialite" className="underline hover:text-black">politique de confidentialité</a>.
              </span>
            </label>

            <button type="submit" disabled={!acceptLegal} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50">
              Créer mon compte syndic
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────── Step 3: Placeur ──────

  if (step === 3 && roleChoice === 'placeur') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 py-20">
        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tighter uppercase">Devenir Placeur</span>
            </div>
            <button onClick={() => setStep(2)} className="text-zinc-400 hover:text-black transition-colors flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-xs font-bold uppercase tracking-widest">Retour</span>
            </button>
          </div>

          <StepIndicator />

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold mb-6">{error}</div>}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800">
              Votre demande sera examinée par notre équipe. Une fois validée, vous recevrez un email avec vos accès pour commencer vos interventions.
            </p>
          </div>

          <form onSubmit={handleSubmitPlaceur} className="space-y-5">
            <div className="space-y-2">
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+32 4xx xx xx xx" />
            </div>

            <label className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-4">
              <input required type="checkbox" checked={acceptLegal} onChange={e => setAcceptLegal(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-zinc-600 leading-relaxed">
                J&apos;accepte les <a href="/mentions-legales" className="underline hover:text-black">mentions légales</a> et la <a href="/confidentialite" className="underline hover:text-black">politique de confidentialité</a>.
              </span>
            </label>

            <button type="submit" disabled={!acceptLegal} className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50">
              Envoyer ma demande
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};
