import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { extractSignageMetaFromNotes, getColorHex } from '../../lib/app-helpers';

const PT_TO_MM_BY_FONT: Record<string, number> = {
  arial: 0.112,
  helvetica: 0.111,
  roboto: 0.115,
  univers: 0.111,
  din: 0.11,
  frutiger: 0.111,
};

const getCalibratedPtToMm = (font: unknown) => {
  const key = String(font || '').trim().toLowerCase();
  return PT_TO_MM_BY_FONT[key] || 0.112;
};

const clampMaxLines = (value: unknown) => {
  const parsed = Number(value || 2);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(8, Math.floor(parsed)));
};

const normalizeLines = (lines: unknown, fallback = '') => {
  if (Array.isArray(lines)) {
    const cleaned = lines.map((line) => String(line || '')).map((line) => line.trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  const fallbackLine = String(fallback || '').trim();
  return fallbackLine ? [fallbackLine] : [];
};

const buildEditorLines = (lines: unknown, fallback: string, maxLines: number) => {
  const rawLines = Array.isArray(lines)
    ? lines.map((line) => String(line ?? ''))
    : [];
  if (rawLines.length === 0) {
    const firstLine = String(fallback || '');
    rawLines.push(firstLine);
  }
  const minVisibleLines = maxLines > 1 ? 2 : 1;
  while (rawLines.length < minVisibleLines) rawLines.push('');
  return rawLines.slice(0, maxLines);
};

export const TenantOrderPage = ({ token }: { token: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [order, setOrder] = useState({ name: '', email: '', lot_number: '', quality: 'tenant', owner_name: '', owner_email: '' });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadOrderLink = async () => {
      try {
        setLoading(true);
        setLoadError('');

        const res = await fetch(`/api/order-links/${token}`, {
          headers: { Accept: 'application/json' },
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error("Le serveur n'a pas retourne une reponse valide.");
        }

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload?.error || 'Lien invalide ou indisponible.');
        }

        if (isActive) {
          setData(payload);
        }
      } catch (error: any) {
        if (isActive) {
          setData(null);
          setLoadError(error?.message || 'Impossible de charger ce lien de commande.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadOrderLink();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (orderItems.length === 0) return alert('Veuillez selectionner au moins un article.');
    if (!order.lot_number) return alert('Veuillez renseigner le numero de lot.');
    if (order.quality === 'tenant' && (!order.owner_name || !order.owner_email)) return alert("Veuillez renseigner le nom et l'email du proprietaire.");
    if (!data?.building_id) return alert("Lien invalide: immeuble introuvable.");

    const globalName = (document.getElementById('global_engraving_name') as HTMLInputElement)?.value || '';
    const finalItems = orderItems.map((item) => {
      const maxLines = clampMaxLines(item.max_lines);
      const textLines = normalizeLines(item.text_lines, item.name || globalName).slice(0, maxLines);
      return {
        ...item,
        max_lines: maxLines,
        text_lines: textLines,
        name: textLines.join(' / '),
      };
    });
    const hasMissingLines = finalItems.some((item) => item.text_lines.length === 0);
    if (hasMissingLines) return alert('Veuillez renseigner au moins une ligne de texte pour chaque plaquette.');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: data.building_id,
          requester_name: order.name,
          requester_email: order.email,
          requester_quality: order.quality,
          owner_name: order.quality === 'tenant' ? order.owner_name : null,
          owner_email: order.quality === 'tenant' ? order.owner_email : null,
          lot_number: order.lot_number,
          details: finalItems,
          order_link_token: token,
          request_source: 'public_link'
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Impossible d'envoyer la commande.");
      }

      setSubmitted(true);
    } catch (error: any) {
      alert(error?.message || "Impossible d'envoyer la commande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (loadError || !data || data.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-lg font-bold mb-2">Lien invalide</div>
          <div className="text-sm text-zinc-500">{loadError || data?.error || 'Ce lien de commande est indisponible.'}</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <Check size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-4">{order.quality === 'tenant' ? 'Demande envoyee' : 'Commande envoyee'}</h2>
          <p className="text-zinc-500 mb-8">
            {order.quality === 'tenant'
              ? "Votre demande a ete transmise au proprietaire pour validation. La commande ne sera lancee qu'apres son accord."
              : 'Votre commande a ete transmise a Plachet. Nous la traiterons dans les plus brefs delais.'}
          </p>
          <button onClick={() => { window.location.href = '/'; }} className="w-full bg-black text-white py-4 rounded-2xl font-bold uppercase tracking-widest">Retour au site</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 border border-black/5">
          <div className="mb-12">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Portail de Commande</div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{data.building_name}</h1>
            <p className="text-zinc-500 text-sm">{data.building_address}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                Vos coordonnées (Suivi & Livraison)
              </h3>
              <p className="text-xs text-zinc-500 mb-6">Ces informations sont nécessaires pour le suivi de votre commande et la livraison. Elles ne seront pas gravées sur les plaquettes.</p>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom complet</label>
                  <input required type="text" value={order.name} onChange={(e) => setOrder({ ...order, name: e.target.value })} className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email</label>
                  <input required type="email" value={order.email} onChange={(e) => setOrder({ ...order, email: e.target.value })} className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">N° de Lot / Appartement</label>
                  <input required type="text" value={order.lot_number} onChange={(e) => setOrder({ ...order, lot_number: e.target.value })} placeholder="Ex: Lot 12" className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Qualite</label>
                  <select required value={order.quality} onChange={(e) => setOrder({ ...order, quality: e.target.value })} className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none">
                    <option value="tenant">Locataire</option>
                    <option value="owner">Proprietaire</option>
                  </select>
                </div>
              </div>

              {order.quality === 'tenant' && (
                <div className="mt-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nom du proprietaire</label>
                  <input required type="text" value={order.owner_name} onChange={(e) => setOrder({ ...order, owner_name: e.target.value })} placeholder="Ex: M. et Mme Plachet" className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Email du proprietaire</label>
                      <input required type="email" value={order.owner_email} onChange={(e) => setOrder({ ...order, owner_email: e.target.value })} placeholder="Ex: pl@chet.be" className="w-full bg-white border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-black outline-none" />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">En tant que locataire, votre demande doit etre validee par le proprietaire avant traitement.</p>
                </div>
              )}
            </div>

            <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px]">2</span>
                Texte à graver
              </h3>
              <p className="text-xs text-zinc-500 mb-6">Indiquez ci-dessous le texte exact qui devra apparaître sur vos plaquettes.</p>

              <div className="space-y-6">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ligne 1 par défaut (appliquée à la sélection)</label>
                <input
                  id="global_engraving_name"
                  type="text"
                  placeholder="Ex: M. et Mme Plachet"
                  className="w-full bg-white border-none rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-black outline-none font-bold"
                  onChange={(e) => {
                    const firstLine = e.target.value;
                    setOrderItems((items) =>
                      items.map((item) => {
                        const lines = Array.isArray(item.text_lines) ? [...item.text_lines] : [];
                        if (lines.length === 0) lines.push(firstLine);
                        else lines[0] = firstLine;
                        return { ...item, text_lines: lines, name: lines.filter(Boolean).join(' / ') };
                      })
                    );
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Plaquettes à commander</label>
              <div className="space-y-4">
                {data.signage?.map((s: any) => {
                  const item = orderItems.find((i) => i.signage_id === s.id);
                  const isSelected = !!item;
                  const globalLine = ((document.getElementById('global_engraving_name') as HTMLInputElement)?.value || '').trim();
                  const maxLines = clampMaxLines(extractSignageMetaFromNotes(s.notes).maxLines);
                  const editorLines = buildEditorLines(item?.text_lines, item?.name || globalLine, maxLines);
                  const previewLines = editorLines.map((line) => line.trim()).filter(Boolean);
                  const widthNum = parseFloat(String(s.width || '0'));
                  const heightNum = parseFloat(String(s.height || '0'));
                  const fontPt = parseFloat(String(s.font_size || '16'));
                  const calibratedPtToMm = getCalibratedPtToMm(s.font);
                  const fontPtValue = Number.isFinite(fontPt) ? fontPt : 16;
                  const fontMm = fontPtValue * calibratedPtToMm;
                  const lineHeight = fontMm * 1.15;
                  const horizontalMarginMm = 3;
                  const verticalMarginMm = previewLines.length > 1 ? 4 : 3;
                  const estimatedW = previewLines.reduce((max, line) => Math.max(max, line.length * fontMm * 0.6), 0);
                  const estimatedH = Math.max(fontMm, Math.max(1, previewLines.length) * lineHeight);
                  const textFitsWidth = !widthNum || estimatedW <= Math.max(6, widthNum - horizontalMarginMm);
                  const textFitsHeight = !heightNum || estimatedH <= Math.max(6, heightNum - verticalMarginMm);
                  const textFits = textFitsWidth && textFitsHeight;
                  const displayText = previewLines.join(' / ');

                  return (
                    <div
                      key={s.id}
                      className={`p-6 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-zinc-50 border-black' : 'bg-white border-black/5 hover:border-black/20'}`}
                      onClick={() => {
                        if (isSelected) {
                          setOrderItems(orderItems.filter((i) => i.signage_id !== s.id));
                        } else {
                          const initialLines = maxLines > 1
                            ? [globalLine || '', '']
                            : [globalLine || ''];
                          setOrderItems([
                            ...orderItems,
                            {
                              signage_id: s.id,
                              name: globalLine,
                              text_lines: initialLines,
                              max_lines: maxLines,
                              quantity: 1,
                              category: s.category,
                              width: s.width,
                              height: s.height,
                              material: s.material,
                              mount_type: s.mount_type,
                              marking_method: s.marking_method,
                              color_bg: s.color_bg,
                              color_text: s.color_text,
                              font: s.font,
                              font_size: s.font_size
                            }
                          ]);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-white' : 'border-black/20'}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{s.category}</p>
                          <p className="text-sm font-bold">{s.location_detail || s.mount_type}</p>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Qté</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => setOrderItems(orderItems.map((i) => i.signage_id === s.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))} className="w-16 bg-white border border-black/10 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-black text-center" />
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                          <div className="mb-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block">Texte à graver (lignes)</label>
                              <span className="text-[9px] text-zinc-500">{previewLines.length}/{maxLines}</span>
                            </div>
                            {Array.from({ length: Math.max(1, editorLines.length) }).map((_, lineIndex) => (
                              <div key={lineIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editorLines[lineIndex] || ''}
                                  onChange={(e) => {
                                    const nextLines = [...editorLines];
                                    nextLines[lineIndex] = e.target.value;
                                    setOrderItems(orderItems.map((i) => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.filter(Boolean).join(' / ') } : i));
                                  }}
                                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black"
                                />
                                {editorLines.length > (maxLines > 1 ? 2 : 1) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextLines = editorLines.filter((_, idx) => idx !== lineIndex);
                                      setOrderItems(orderItems.map((i) => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.filter(Boolean).join(' / ') } : i));
                                    }}
                                    className="p-2 rounded-lg border border-black/10 text-zinc-500 hover:text-red-500 hover:border-red-200 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                if (editorLines.length >= maxLines) return;
                                const nextLines = [...editorLines, ''];
                                setOrderItems(orderItems.map((i) => i.signage_id === s.id ? { ...i, text_lines: nextLines, name: nextLines.filter(Boolean).join(' / ') } : i));
                              }}
                              disabled={editorLines.length >= maxLines}
                              className={`w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                                editorLines.length >= maxLines
                                  ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                                  : 'border-black/15 text-black hover:bg-zinc-50'
                              }`}
                            >
                              <Plus size={14} /> + Ligne
                            </button>
                          </div>

                          {previewLines.some((line) => String(line || '').trim()) && (
                            <>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span>Texte: {displayText || '-'}</span>
                                <span>Typo: {fontPtValue} pt</span>
                                <span>Taille estimée: {Math.round(estimatedW)} x {Math.round(estimatedH)} mm</span>
                              </div>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex justify-between">
                                <span>Aperçu visuel</span>
                                {!textFits && <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={10} /> Le texte risque de ne pas tenir (tolérance 3mm, et 2mm haut/bas en multi-lignes)</span>}
                              </div>
                              <div className="w-full flex justify-center bg-zinc-100/50 p-4 rounded-lg border border-black/5">
                                <div className="flex items-center justify-center overflow-hidden relative shadow-sm w-full" style={{ maxWidth: s.width ? `${Math.max(300, s.width * 2)}px` : '300px' }}>
                                  <svg viewBox={`0 0 ${s.width || 300} ${s.height || 60}`} className="w-full h-auto drop-shadow-sm" style={{ backgroundColor: getColorHex(s.color_bg) || '#ffffff', borderRadius: '4px' }}>
                                    <text
                                      x="50%"
                                      y={`${(s.height || 60) / 2 - ((previewLines.length - 1) * lineHeight) / 2}`}
                                      dominantBaseline="middle"
                                      textAnchor="middle"
                                      fill={getColorHex(s.color_text) || '#000000'}
                                      fontFamily={s.font || 'sans-serif'}
                                      fontSize={fontMm}
                                      fontWeight="bold"
                                    >
                                      {previewLines.map((line, idx) => (
                                        <tspan key={idx} x="50%" dy={idx === 0 ? 0 : lineHeight}>{line}</tspan>
                                      ))}
                                    </text>
                                  </svg>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={orderItems.length === 0 || isSubmitting} className="w-full bg-black text-white py-6 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {isSubmitting ? 'Envoi en cours...' : `Envoyer la commande (${orderItems.length})`} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
