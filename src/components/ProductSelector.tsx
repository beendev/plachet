// components/ProductSelector.tsx
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

type SizeKey = '50x140' | '100x70' | '100x140';
type Finish = 'adhesif' | 'ventouses';

const SIZE_OPTIONS: { key: SizeKey; label: string; colorName: string; colorClass: string }[] = [
  { key: '100x70',  label: '100 × 70 cm',  colorName: 'Mauve',  colorClass: 'bg-[#8b5cf6]' },
  { key: '50x140',  label: '50 × 140 cm',  colorName: 'Orange', colorClass: 'bg-[#f59e0b]' },
  { key: '100x140', label: '100 × 140 cm', colorName: 'Bleu',   colorClass: 'bg-[#3b82f6]' },
];

const IMAGE_BY_SIZE: Record<SizeKey, string> = {
  '100x70':  '/panneau-mauve.png',
  '50x140':  '/panneau-orange.png',
  '100x140': '/panneau-bleu.png',
};

const FINISH_OPTIONS: { key: Finish; label: string; desc: string }[] = [
  { key: 'adhesif',   label: 'Ruban adhésif', desc: 'Pose rapide, double face' },
  { key: 'ventouses', label: '4 ventouses',   desc: 'Fixation amovible' },
];

// Réponse attendue de l'API
type ApiResponse = { ok: boolean; error?: string };

export default function ProductSelector() {
  // produit
  const [size, setSize] = useState<SizeKey>('100x70');
  const [finish, setFinish] = useState<Finish>('adhesif');
  const [qty, setQty] = useState<number>(1); // unités

  // formulaire client
  const [company, setCompany] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes]     = useState('');

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg]     = useState<string | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);

  // tarification
  const pricePerPiece = 15;  // €/pièce
  const shipBE = 4.99;       // € livraison Belgique

  const { merchandise, total, freeUnits, discountPct } = useMemo(() => {
    const freeUnits = Math.floor(qty / 10);          // 1 offert par tranche de 10
    const payUnits  = Math.max(0, qty - freeUnits);  // unités payées
    const merchandise = payUnits * pricePerPiece;    // articles
    const total = merchandise + shipBE;              // articles + livraison fixe BE
    const undiscounted = qty * pricePerPiece;
    const discountPct = qty >= 10 && undiscounted > 0
      ? Math.round((1 - merchandise / undiscounted) * 100)
      : 0;
    return { merchandise, total, freeUnits, discountPct };
  }, [qty]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setOkMsg(null);
    setErrMsg(null);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company, name, email, phone, address, notes,
          size, finish, qty,
        }),
      });

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error ?? `Erreur (HTTP ${res.status})`);
      }

      setOkMsg("Commande envoyée. Vous allez recevoir un e-mail de confirmation avec le récapitulatif. La facture suivra pour valider la commande.");
      // reset minimal (on garde le produit choisi)
      setCompany(''); setName(''); setEmail(''); setPhone(''); setAddress(''); setNotes('');
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      {/* Visuel */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-white">
          <Image
            src={IMAGE_BY_SIZE[size]}
            alt={`Panneau ${SIZE_OPTIONS.find(s => s.key === size)?.label}`}
            fill
            sizes="(min-width:1024px) 40vw, 90vw"
            className="object-contain"
            priority
          />
        </div>
        <div className="mt-3 flex gap-2">
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSize(s.key)}
              className={`h-8 w-8 rounded ${s.colorClass} border border-black/5 ring-offset-2 focus:outline-none focus:ring-2 focus:ring-black/20 ${size === s.key ? 'opacity-100' : 'opacity-60 hover:opacity-90'}`}
              title={`${s.label} – ${s.colorName}`}
            />
          ))}
        </div>
      </div>

      {/* Options + Formulaire */}
      <div>
        <h3 className="text-xl font-semibold">Panneau de fenêtre (à l’unité)</h3>
        <p className="mt-1 text-sm text-gray-600">
          15€ / pièce — à l’achat de 10, <span className="font-medium">1 panneau offert</span>. Livraison partout en Belgique : 4,99€.
        </p>

        {/* Taille */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Taille</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSize(s.key)}
                className={`rounded-xl border px-3 py-2 text-sm text-left transition ${size === s.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-3 w-3 rounded ${s.colorClass}`} />
                  <span className="font-medium">{s.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Finition */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Finition</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FINISH_OPTIONS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFinish(f.key)}
                className={`rounded-xl border px-3 py-2 text-left transition ${finish === f.key ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="font-medium text-sm">{f.label}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantité */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Quantité (unités)</label>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-gray-300">
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">−</button>
              <div className="px-4 py-2 min-w-12 text-center select-none">{qty}</div>
              <button className="px-3 py-2" onClick={() => setQty((q) => q + 1)} aria-label="Plus">+</button>
            </div>
            <div className="text-sm text-gray-600">
              15€ / pièce · 1 offert par tranche de 10
            </div>
          </div>
          {qty >= 10 && (
            <p className="mt-2 text-xs text-gray-700">
              Vous économisez {discountPct}% à l’achat de 10.
            </p>
          )}
        </div>

        {/* Récap prix */}
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Articles</span>
            <span>{merchandise.toFixed(2)}€</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Livraison (Belgique)</span>
            <span>{shipBE.toFixed(2)}€</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span>Total</span>
            <span className="text-lg font-semibold">{total.toFixed(2)}€</span>
          </div>
          {freeUnits > 0 && (
            <p className="text-xs text-gray-500">Unités offertes : {freeUnits}</p>
          )}
        </div>

        {/* Formulaire client + submit */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            placeholder="Société (optionnel)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
          <input
            placeholder="Nom & prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>
          <textarea
            placeholder="Adresse de livraison"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
          <textarea
            placeholder="Remarques (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />

          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-black text-white px-5 py-3 hover:opacity-90 disabled:opacity-60"
          >
            {sending ? 'Envoi…' : 'Commander par e-mail'}
          </button>

          {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
          {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}
        </form>
      </div>
    </div>
  );
}
