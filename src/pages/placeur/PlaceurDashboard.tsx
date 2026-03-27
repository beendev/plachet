import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { getOrderStatusLabel, getOrderItemLines } from '../../lib/app-helpers';

type Order = any;

export const PlaceurDashboard = ({ user, authToken }: { user: any, authToken?: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiFetch = React.useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    return globalThis.fetch(input, { ...init, headers });
  }, [authToken]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/placeurs/orders');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Chargement impossible');
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadPhoto = async (orderId: number, type: 'before' | 'after', file: File | null) => {
    if (!file) return;
    const b64 = await file.arrayBuffer().then((buf) => Buffer.from(buf).toString('base64'));
    const res = await apiFetch(`/api/orders/${orderId}/photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, image: `data:${file.type};base64,${b64}`, role: 'placeur', userId: user.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Upload échoué');
    } else {
      load();
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Placeur</div>
          <div className="text-lg font-bold">{user?.name || 'Profil'}</div>
        </div>
        <div className="text-xs text-zinc-500">Immeubles attribués: {orders.length > 0 ? new Set(orders.map((o) => o.building_id)).size : 0}</div>
      </header>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-4">
        {orders.length === 0 && <div className="bg-white border border-black/5 rounded-2xl p-6 text-zinc-500">Aucune plaquette à poser pour le moment.</div>}
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-black/5 rounded-[24px] p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">ACP / Immeuble</div>
                <div className="text-lg font-bold">{order.building_name}</div>
                <div className="text-xs text-zinc-500">{order.building_address}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-700">
                {getOrderStatusLabel(order.status)}
              </span>
            </div>
            <div className="bg-zinc-50 rounded-2xl border border-black/5 p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Plaquettes à poser</div>
              {order.details?.items?.map ? (
                order.details.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="font-semibold">{getOrderItemLines(item).join(' / ') || item.name}</div>
                    <div className="text-xs text-zinc-500">Qté {item.quantity || 1}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500">Détails non disponibles</div>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 bg-zinc-50 border border-dashed border-black/10 rounded-2xl px-4 py-3 cursor-pointer">
                <Camera size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Photo avant</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(order.id, 'before', e.target.files?.[0] || null)} />
              </label>
              <label className="flex items-center gap-3 bg-zinc-50 border border-dashed border-black/10 rounded-2xl px-4 py-3 cursor-pointer">
                <Camera size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Photo après</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(order.id, 'after', e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
