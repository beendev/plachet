// components/PlaquetteConfigurator.tsx
"use client";

import { useMemo, useState } from "react";

import type { DependencyList } from "react";


/* ---------- Types ---------- */
type FixationKey =
  | "none"
  | "autocollant"
  | "trous"
  | "vis"
  | "vis_cache"
  | "entretoises"
  | "magnetique";

type MaterialKey = "plexiglas" | "pvc" | "laiton" | "aluminium" | "bois";
type ColorKey =
  | "blanc_noir"
  | "noir_blanc"
  | "gris_noir"
  | "bleu_blanc"
  | "vert_blanc"
  | "rouge_blanc"
  | "or_noir"
  | "argent_noir";

type FontKey = "system" | "serif" | "mono" | "script";

type ApiResponse = { ok: boolean; error?: string };

/* ---------- Options UI ---------- */
const MATERIALS: { key: MaterialKey; label: string }[] = [
  { key: "plexiglas", label: "Plexiglas gravé" },
  { key: "pvc", label: "PVC" },
  { key: "laiton", label: "Laiton" },
  { key: "aluminium", label: "Aluminium" },
  { key: "bois", label: "Bois" },
];

const COLORS: { key: ColorKey; label: string; plate: string; text: string }[] = [
  { key: "blanc_noir", label: "Blanc · texte Noir", plate: "#ffffff", text: "#111111" },
  { key: "noir_blanc", label: "Noir · texte Blanc", plate: "#111111", text: "#ffffff" },
  { key: "gris_noir", label: "Gris · texte Noir", plate: "#e5e7eb", text: "#111111" },
  { key: "bleu_blanc", label: "Bleu · texte Blanc", plate: "#1e3a8a", text: "#ffffff" },
  { key: "vert_blanc", label: "Vert · texte Blanc", plate: "#166534", text: "#ffffff" },
  { key: "rouge_blanc", label: "Rouge · texte Blanc", plate: "#b91c1c", text: "#ffffff" },
  { key: "or_noir", label: "Or · texte Noir", plate: "#c7a54b", text: "#111111" },
  { key: "argent_noir", label: "Argent · texte Noir", plate: "#c0c7d1", text: "#111111" },
];

const FIXATIONS: { key: FixationKey; label: string }[] = [
  { key: "none", label: "Sans fixation" },
  { key: "autocollant", label: "Autocollant (double-face)" },
  { key: "trous", label: "Trous" },
  { key: "vis", label: "Vis" },
  { key: "vis_cache", label: "Vis + cache-vis" },
  { key: "entretoises", label: "Entretoises" },
  { key: "magnetique", label: "Magnétique" },
];

/* ---------- Pricing rules (d’après ton WhatsApp) ---------- */
// Base en fonction du PLUS GRAND côté (en cm)
function basePriceFromSize(widthMm: number, heightMm: number): number {
  const maxCm = Math.max(widthMm, heightMm) / 10;
  if (maxCm <= 8) return 10;         // ≤ 8 cm
  if (maxCm <= 12) return 15;        // > 8 cm et ≤ 12 cm
  return 20;                         // > 12 cm
}

// +1€ / pièce si fixation ≠ autocollant (double-face). “none” reste 0€.
function fixationSurchargePerUnit(f: FixationKey): number {
  if (f === "autocollant" || f === "none") return 0;
  return 1;
}

const SHIPPING_BE = 4.95;
const PLACEMENT_FEE = 10; // optionnel (forfait)

/* =================================================================== */

export default function PlaquetteConfigurator() {
  /* Design */
  const [content, setContent] = useState("M. et Mme FARLADO");
  const [material, setMaterial] = useState<MaterialKey>("plexiglas");
  const [color, setColor] = useState<ColorKey>("blanc_noir");
  const [fixation, setFixation] = useState<FixationKey>("autocollant");

  // Dimensions (mm)
  const [width, setWidth] = useState<number>(93);
  const [height, setHeight] = useState<number>(25);
  const [rounded, setRounded] = useState<boolean>(true);

  // Police
  const [font, setFont] = useState<FontKey>("system");
  const fontClass =
    font === "serif"
      ? "font-serif"
      : font === "mono"
      ? "font-mono"
      : font === "script"
      ? "[font-family:'Great_Vibes',cursive]"
      : "font-sans";

  // Quantité
  const [qty, setQty] = useState<number>(1);

  // Option : placement (installation)
  const [placement, setPlacement] = useState<boolean>(false);

  // Formulaire client
  const [company, setCompany] = useState("");
  const [vatNumber, setVat] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [box, setBox] = useState("");
  const [postalCode, setPC] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  /* Prix calculé */
  const colorDef = COLORS.find((c) => c.key === color)!;

  const { baseUnit, unitPrice, merchandise, total } = useMemo(() => {
    const baseUnit = basePriceFromSize(width, height);
    const unitPrice = baseUnit + fixationSurchargePerUnit(fixation);
    const merchandise = qty * unitPrice;
    const total =
      merchandise + SHIPPING_BE + (placement ? PLACEMENT_FEE : 0);
    return { baseUnit, unitPrice, merchandise, total };
  }, [width, height, fixation, qty, placement]);

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setOkMsg(null);
    setErrMsg(null);

    // On encode les choix plaquette dans size/finish + notes (backend existant)
    const sizeLabel = `${width}×${height} mm${rounded ? " (coins arrondis)" : ""}`;
    const finishLabel = `Fixation: ${FIXATIONS.find((f) => f.key === fixation)?.label}`;

    const extra =
      `\n[PLAQUETTE]\n` +
      `- Matière: ${MATERIALS.find((m) => m.key === material)?.label}\n` +
      `- Couleur: ${COLORS.find((c) => c.key === color)?.label}\n` +
      `- Police: ${font}\n` +
      `- Texte: "${content}"\n` +
      `- Tarifs appliqués: base ${baseUnit.toFixed(2)}€ + fixation ${fixationSurchargePerUnit(fixation).toFixed(2)}€ / pièce\n` +
      (placement ? `- Option placement: +${PLACEMENT_FEE.toFixed(2)}€\n` : "");

    try {
      const res = await fetch("/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                company, vatNumber, name, email, phone,
                addressStreet: street,
                addressNumber: number,
                addressBox: box,
                postalCode, city,
                notes: notes ? notes + extra : extra, // ton récap plaquette
                size: sizeLabel,
                finish: finishLabel,
                qty,

                // NEW
                product: "plaquette",
                pricing: {
                unitPrice,            // calculé côté client pour la plaquette
                merchandise,          // idem
                shipping: SHIPPING_BE,
                total,                // idem
                },
            }),
            });

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error ?? `Erreur (HTTP ${res.status})`);

      setOkMsg(
        "Commande envoyée. Vous allez recevoir un e-mail de confirmation avec le récapitulatif. La facture suivra pour valider la commande."
      );

      // reset minimal
      setQty(1);
      setPlacement(false);
      setCompany(""); setVat(""); setName(""); setEmail(""); setPhone("");
      setStreet(""); setNumber(""); setBox(""); setPC(""); setCity("");
      setNotes("");
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  /* UI */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      {/* Aperçu sticky */}
      <div className="rounded-2xl border border-gray-200 p-4 md:sticky md:top-24 self-start">
    <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Aperçu instantané</h3>
        <span className="text-xs text-gray-500">
        {width}×{height} mm
        </span>
    </div>

    <div className="relative w-full aspect-[3/1] rounded-xl grid place-items-center bg-neutral-100 p-4">
        {/* Plaque */}
        <div
        className="shadow-md grid place-items-center overflow-hidden"
        style={{
            background: colorDef.plate,
            color: colorDef.text,
            borderRadius: rounded ? 12 : 4,
            width: "92%",
            height: "62%",
        }}
        >
        <div
            ref={useFitText(content, { min: 12, max: 46, pad: 12, deps: [width, height, font, rounded, color] })}
            className={`px-3 text-center leading-tight ${fontClass}`}
            style={{
            lineHeight: 1.05,
            wordBreak: "break-word",
            hyphens: "auto",
            }}
            title={content}
        >
            {content}
        </div>
        </div>
    </div>

        {/* Couleurs */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Couleurs plaque / texte</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                className={`rounded-xl border p-2 text-left text-xs transition ${
                  color === c.key ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-5 w-7 rounded border border-black/5"
                    style={{
                      background: `linear-gradient(90deg, ${c.plate} 0 60%, ${c.text} 60% 100%)`,
                    }}
                  />
                  <span className="truncate">{c.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Options + Formulaire */}
      <div>
        <h3 className="text-xl font-semibold">Plaquette de sonnette (à l’unité)</h3>
        <p className="mt-1 text-sm text-gray-600">
          Tarifs&nbsp;: ≤8&nbsp;cm&nbsp;10€ · ≤12&nbsp;cm&nbsp;15€ · &gt;12&nbsp;cm&nbsp;20€ —&nbsp;
          Fixation ≠ autocollant&nbsp;+1€/pièce. Livraison BE&nbsp;: 4,95€. Option placement&nbsp;: +10€.
        </p>

        {/* Texte */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Texte à graver</label>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            maxLength={60}
            placeholder="Ex. M. et Mme FARLADO — Appartement B12"
          />
          <div className="mt-2 flex gap-2">
            <select
              value={font}
              onChange={(e) => setFont(e.target.value as FontKey)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="system">Sans-serif (clair)</option>
              <option value="serif">Serif (classique)</option>
              <option value="mono">Monospace</option>
              <option value="script">Script (calligraphie)</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={rounded}
                onChange={(e) => setRounded(e.target.checked)}
                className="h-4 w-4"
              />
              Coins arrondis
            </label>
          </div>
        </div>

        {/* Dimensions */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Dimensions (mm)</label>
          <div className="grid grid-cols-3 gap-2">
            <NumberBox label="Largeur" value={width} onChange={setWidth} />
            <NumberBox label="Hauteur" value={height} onChange={setHeight} />
            <div className="flex items-center">
              <div className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500">
                Épaisseur 3 mm
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Preset onPick={(w, h) => { setWidth(w); setHeight(h); }} label="93×25" w={93} h={25} />
            <Preset onPick={(w, h) => { setWidth(w); setHeight(h); }} label="100×30" w={100} h={30} />
            <Preset onPick={(w, h) => { setWidth(w); setHeight(h); }} label="120×40" w={120} h={40} />
          </div>
        </div>

        {/* Matière */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Matière</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MATERIALS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMaterial(m.key)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  material === m.key ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fixation */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Fixation</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIXATIONS.map((f) => {
              const surcharge = fixationSurchargePerUnit(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => setFixation(f.key)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    fixation === f.key ? "border-gray-900" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{f.label}</div>
                    <div className="text-xs text-gray-500">
                      {surcharge === 0 ? "gratuit" : `+ ${surcharge.toFixed(2)}€`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options supplémentaires */}
        <div className="mt-4">
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={placement}
              onChange={(e) => setPlacement(e.target.checked)}
              className="h-4 w-4"
            />
            Placement (installation) — +{PLACEMENT_FEE.toFixed(2)}€
          </label>
        </div>

        {/* Quantité */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Quantité (unités)</label>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-gray-300">
              <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">
                −
              </button>
              <div className="px-4 py-2 min-w-12 text-center select-none">{qty}</div>
              <button className="px-3 py-2" onClick={() => setQty((q) => q + 1)} aria-label="Plus">
                +
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Prix unitaire actuel&nbsp;: {unitPrice.toFixed(2)}€
            </div>
          </div>
        </div>

        {/* Récap prix */}
        <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>Plaquettes</span>
            <span>{merchandise.toFixed(2)}€</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Livraison (Belgique)</span>
            <span>{SHIPPING_BE.toFixed(2)}€</span>
          </div>
          {placement && (
            <div className="flex items-center justify-between text-sm">
              <span>Placement</span>
              <span>{PLACEMENT_FEE.toFixed(2)}€</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span>Total</span>
            <span className="text-lg font-semibold">{total.toFixed(2)}€</span>
          </div>
          <p className="text-xs text-gray-500">
            Base: {baseUnit.toFixed(2)}€ / pièce • Fixation: +{fixationSurchargePerUnit(fixation).toFixed(2)}€ / pièce
          </p>
        </div>

        {/* Formulaire + submit */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            placeholder="Société"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
          />
          <input
            placeholder="Numéro de TVA"
            value={vatNumber}
            onChange={(e) => setVat(e.target.value)}
            required
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

          <div className="grid sm:grid-cols-4 gap-3">
            <input
              placeholder="Rue / Adresse"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
              className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="N°"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              className="rounded-xl border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="Boîte (optionnel)"
              value={box}
              onChange={(e) => setBox(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              placeholder="Code postal"
              value={postalCode}
              onChange={(e) => setPC(e.target.value)}
              required
              className="rounded-xl border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="Commune / Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>

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
            {sending ? "Envoi…" : "Commander par e-mail"}
          </button>

          {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
          {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}
        </form>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */
function NumberBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm">
      <span className="block mb-1 font-medium">{label}</span>
      <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden">
        <input
          type="number"
          min={10}
          max={300}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 outline-none"
        />
        <span className="px-2 text-gray-500 text-xs border-l">mm</span>
      </div>
    </label>
  );
}

function Preset({
  label,
  w,
  h,
  onPick,
}: {
  label: string;
  w: number;
  h: number;
  onPick: (w: number, h: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(w, h)}
      className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-400"
    >
      {label}
    </button>
  );
}

// Taille de police simple en fonction de la longueur du texte
function clampPx(text: string) {
  const len = text.trim().length || 1;
  if (len < 10) return "36px";
  if (len < 18) return "32px";
  if (len < 26) return "28px";
  if (len < 34) return "24px";
  return "20px";
}



import { useLayoutEffect, useRef } from "react";

function useFitText(
  text: string,
  opts?: { min?: number; max?: number; pad?: number; deps?: DependencyList }
) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement as HTMLElement;
    if (!parent) return;

    const MIN = opts?.min ?? 12;
    const MAX = opts?.max ?? 46;
    const PAD = opts?.pad ?? 8;

    const calc = () => {
      el.style.whiteSpace = "pre-wrap";
      el.style.wordBreak = "break-word";

      let lo = MIN;
      let hi = MAX;
      let best = MIN;

      for (let i = 0; i < 12; i++) {
        const mid = Math.floor((lo + hi) / 2);
        el.style.fontSize = mid + "px";

        const fits =
          el.scrollWidth <= parent.clientWidth - PAD &&
          el.scrollHeight <= parent.clientHeight - PAD;

        if (fits) { best = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      el.style.fontSize = best + "px";
    };

    const ro = new ResizeObserver(calc);
    ro.observe(parent);
    calc();

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, ...(opts?.deps ?? ([] as DependencyList))]);

  return ref;
}
