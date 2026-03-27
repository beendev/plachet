import React, { useEffect, useState } from 'react';
import { parseOrderDetails, getRequesterQualityLabel, getOrderItemLines } from '../../lib/app-helpers';

export const OwnerApprovalPage = ({ token }: { token: string }) => {
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'error'>('loading');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/orders/owner-approval?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Lien invalide');
        setData(payload);
        setState(payload.alreadyProcessed ? 'done' : 'ready');
      })
      .catch(() => setState('error'));
  }, [token]);

  const handleDecision = async (nextDecision: 'approve' | 'reject') => {
    setDecision(nextDecision);
    const res = await fetch('/api/orders/owner-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, decision: nextDecision })
    });
    const payload = await res.json();
    if (!res.ok) {
      setState('error');
      return;
    }
    setData(payload);
    setState('done');
  };

  if (state === 'loading') return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl shadow-black/5 w-full max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Lien invalide</h1>
          <p className="text-zinc-500">Ce lien de validation n&apos;est plus valable ou la demande a deja ete traitee.</p>
        </div>
      </div>
    );
  }

  const detailMeta = parseOrderDetails(data?.details).meta;

  return (
    <div className="min-h-screen bg-zinc-50 py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl shadow-black/5 border border-black/5">
          <div className="mb-10">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Validation proprietaire</div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">{data.building_name}</h1>
            <p className="text-sm text-zinc-500">{data.building_address}</p>
          </div>

          <div className="grid gap-6">
            <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Demande recue</div>
              <div className="text-base font-bold">{data.requester_name}</div>
              <div className="text-sm text-zinc-500">{data.requester_email}</div>
              <div className="text-xs text-zinc-500 mt-2">
                {getRequesterQualityLabel(data.requester_quality)} • Lot {data.lot_number || 'N/A'}
              </div>
              {detailMeta?.owner_name && (
                <div className="text-xs text-zinc-500 mt-2">Proprietaire renseigne: {detailMeta.owner_name}</div>
              )}
            </div>

            <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Plaquettes demandees</div>
              <div className="space-y-3">
                {parseOrderDetails(data?.details).items.map((item: any, index: number) => (
                  <div key={`${item.signage_id || index}-${index}`} className="bg-white rounded-xl px-4 py-3 border border-black/5">
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">{item.category || 'Plaquette'}</div>
                    <div className="text-sm font-bold">{getOrderItemLines(item).join(' / ') || item.name}</div>
                    <div className="text-xs text-zinc-500">Quantite {item.quantity || 1}</div>
                  </div>
                ))}
              </div>
            </div>

            {state === 'ready' ? (
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <button onClick={() => handleDecision('approve')} disabled={decision !== null} className="bg-emerald-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all disabled:opacity-50">
                  {decision === 'approve' ? 'Validation...' : 'Valider la demande'}
                </button>
                <button onClick={() => handleDecision('reject')} disabled={decision !== null} className="bg-white border border-black/10 text-zinc-700 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-50 transition-all disabled:opacity-50">
                  {decision === 'reject' ? 'Refus...' : 'Refuser la demande'}
                </button>
              </div>
            ) : (
              <div className="bg-zinc-50 p-6 rounded-2xl border border-black/5 text-center">
                <h2 className="text-xl font-bold mb-2">
                  {data.status === 'reçue' ? 'Demande validee' : data.status === 'annulée' ? 'Demande refusee' : 'Demande deja traitee'}
                </h2>
                <p className="text-sm text-zinc-500">
                  {data.status === 'reçue'
                    ? 'La demande a bien ete validee. Plachet peut maintenant la traiter.'
                    : "Cette demande ne necessite plus d'action de votre part."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
