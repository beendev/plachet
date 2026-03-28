import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle, RefreshCw, MapPin, ChevronDown, ChevronUp, LogOut, Image, ClipboardList, CircleCheckBig, Download, X, Map as MapIcon } from 'lucide-react';
import { getOrderStatusLabel, getOrderItemLines } from '../../lib/app-helpers';
import { usePwaInstall } from '../../lib/usePwaInstall';
import { BugReportButton } from '../../components/BugReportButton';
import { RouteMap } from '../../components/placeur/RouteMap';
import type { RouteBuilding } from '../../components/placeur/RouteMap';

type Order = any;
type Tab = 'todo' | 'done' | 'route';

const statusColor: Record<string, string> = {
  en_pose: 'bg-amber-100 text-amber-700',
  'posée': 'bg-emerald-100 text-emerald-700',
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Try to get current GPS position; resolves to null if denied/unavailable */
const getGeoPosition = (): Promise<{ lat: number; lng: number; accuracy: number } | null> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

export const PlaceurDashboard = ({ user, authToken, onLogout }: { user: any; authToken?: string; onLogout?: () => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>('todo');
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const { canInstall, install } = usePwaInstall();

  const apiFetch = React.useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    return globalThis.fetch(input, { ...init, headers });
  }, [authToken]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
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
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadPhoto = async (orderId: number, type: 'before' | 'after', file: File | null) => {
    if (!file) return;
    const key = `${orderId}-${type}`;
    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      // Request GPS and encode image in parallel (non-blocking if GPS denied)
      const [image, geo] = await Promise.all([fileToBase64(file), getGeoPosition()]);
      const res = await apiFetch(`/api/orders/${orderId}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, image, role: 'placeur', userId: user.id, ...(geo ? { geo } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Upload echoue');
      } else {
        await load(true);
      }
    } catch {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const todoOrders = React.useMemo(() => orders.filter((o) => o.status !== 'posée'), [orders]);
  const doneOrders = React.useMemo(() => orders.filter((o) => o.status === 'posée'), [orders]);
  const activeOrders = tab === 'done' ? doneOrders : todoOrders;

  const buildingGroups = React.useMemo(() => {
    const map = new Map<number, { name: string; address: string; orders: Order[] }>();
    for (const o of activeOrders) {
      const bid = Number(o.building_id);
      if (!map.has(bid)) map.set(bid, { name: o.building_name || `Immeuble #${bid}`, address: o.building_address || '', orders: [] });
      map.get(bid)!.orders.push(o);
    }
    return Array.from(map.values());
  }, [activeOrders]);

  // Buildings for the route/itinerary tab (only todo buildings)
  const routeBuildings = React.useMemo<RouteBuilding[]>(() => {
    const map = new Map<number, RouteBuilding>();
    for (const o of todoOrders) {
      const bid = Number(o.building_id);
      if (!map.has(bid)) {
        map.set(bid, {
          name: o.building_name || `Immeuble #${bid}`,
          address: o.building_address || '',
          orderCount: 0,
        });
      }
      map.get(bid)!.orderCount += 1;
    }
    return Array.from(map.values());
  }, [todoOrders]);


  // Loading state
  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw size={32} className="animate-spin text-zinc-300 mx-auto mb-4" />
        <div className="text-sm font-bold uppercase tracking-widest text-zinc-400">Chargement...</div>
      </div>
    </div>
  );

  // Error state
  if (error) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">!</span>
        </div>
        <div className="text-lg font-bold mb-2">Erreur</div>
        <div className="text-sm text-red-500 mb-6">{error}</div>
        <button onClick={() => load()} className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest">
          Reessayer
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header - sticky mobile */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-black/5 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">Placeur</div>
            <div className="text-base font-bold truncate">{user?.name || 'Profil'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 transition-all"
            >
              <RefreshCw size={18} className={`text-zinc-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {onLogout && (
              <button onClick={onLogout} className="p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 transition-all">
                <LogOut size={18} className="text-zinc-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Install PWA banner */}
      {canInstall && !dismissedInstall && (
        <div className="px-4 py-3 bg-black text-white flex items-center gap-3">
          <Download size={18} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold">Installer Plachet</div>
            <div className="text-[10px] text-zinc-400">Acces rapide depuis l'ecran d'accueil</div>
          </div>
          <button onClick={install} className="px-4 py-2 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest shrink-0 active:scale-95 transition-transform">
            Installer
          </button>
          <button onClick={() => setDismissedInstall(true)} className="p-1 text-zinc-500 hover:text-white shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-black/5 px-4">
        <div className="flex gap-1 max-w-2xl mx-auto">
          <button
            onClick={() => { setTab('todo'); setExpandedId(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${tab === 'todo' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            <ClipboardList size={16} />
            A faire
            {todoOrders.length > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === 'todo' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                {todoOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('done'); setExpandedId(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${tab === 'done' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            <CircleCheckBig size={16} />
            Termine
            {doneOrders.length > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === 'done' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                {doneOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('route'); setExpandedId(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${tab === 'route' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            <MapIcon size={16} />
            Itineraire
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="px-4 py-4 pb-24 space-y-4 max-w-2xl mx-auto">
        {tab === 'route' ? (
          <RouteMap buildings={routeBuildings} />
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-5">
              {tab === 'todo' ? <Camera size={32} className="text-zinc-300" /> : <CheckCircle size={32} className="text-zinc-300" />}
            </div>
            <h2 className="text-lg font-bold mb-2">
              {tab === 'todo' ? 'Aucune mission' : 'Rien encore'}
            </h2>
            <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-6">
              {tab === 'todo'
                ? 'Aucune plaquette a poser pour le moment.'
                : 'Les commandes terminees apparaitront ici.'
              }
            </p>
            {tab === 'todo' && (
              <button onClick={() => load(true)} className="bg-black text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform">
                Actualiser
              </button>
            )}
          </div>
        ) : (
          buildingGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              {/* Building header */}
              <div className="flex items-center gap-2 px-1">
                <MapPin size={14} className="text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{group.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{group.address}</div>
                </div>
              </div>

              {/* Orders for this building */}
              {group.orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const items = order.details?.items;
                const parsedItems = Array.isArray(items) ? items : [];
                const hasBefore = !!order.photo_before;
                const hasAfter = !!order.photo_after;
                const isComplete = hasBefore && hasAfter;
                const statusClass = statusColor[order.status] || 'bg-zinc-100 text-zinc-700';

                return (
                  <div key={order.id} className={`bg-white rounded-2xl border transition-all ${isComplete ? 'border-emerald-200' : 'border-black/5'}`}>
                    {/* Order header - tap to expand */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full text-left p-4 flex items-center gap-3 active:bg-zinc-50 transition-colors rounded-2xl"
                    >
                      {/* Status indicator */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                        {isComplete ? (
                          <CheckCircle size={20} className="text-emerald-600" />
                        ) : (
                          <Camera size={20} className="text-zinc-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${statusClass}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                          {order.order_number && (
                            <span className="text-[10px] text-zinc-400 font-mono">#{order.order_number}</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold truncate">
                          {parsedItems.length > 0
                            ? parsedItems.map((item: any) => getOrderItemLines(item).join(' / ')).join(', ')
                            : order.name_to_replace || `Commande #${order.id}`
                          }
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {parsedItems.length} plaquette{parsedItems.length !== 1 ? 's' : ''}
                          {hasBefore && !hasAfter && ' · Photo avant OK'}
                          {hasBefore && hasAfter && ' · Complet'}
                        </div>
                      </div>

                      {isExpanded ? <ChevronUp size={18} className="text-zinc-300 shrink-0" /> : <ChevronDown size={18} className="text-zinc-300 shrink-0" />}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Plaquettes detail */}
                        {parsedItems.length > 0 && (
                          <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Detail des plaquettes</div>
                            {parsedItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between py-1">
                                <div className="text-sm font-medium">{getOrderItemLines(item).join(' / ') || item.name}</div>
                                <div className="text-xs text-zinc-500 bg-white px-2 py-0.5 rounded-lg border border-black/5">x{item.quantity || 1}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Photo uploads - big touch targets for mobile */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Photos d'intervention</div>

                          {/* Photo avant */}
                          <div className="relative">
                            {hasBefore ? (
                              <div className="relative rounded-xl overflow-hidden">
                                <img src={order.photo_before} alt="Avant" className="w-full h-48 object-cover" />
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-sm">
                                  Avant
                                </div>
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-lg">
                                  <CheckCircle size={14} />
                                </div>
                                {order.photo_before_geo && (
                                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                    <MapPin size={10} />
                                    <span>{Number(order.photo_before_geo.lat).toFixed(4)}, {Number(order.photo_before_geo.lng).toFixed(4)}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label className={`flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed rounded-xl cursor-pointer active:scale-[0.98] transition-all ${uploading[`${order.id}-before`] ? 'border-amber-300 bg-amber-50' : 'border-black/10 bg-zinc-50 hover:bg-white'}`}>
                                {uploading[`${order.id}-before`] ? (
                                  <RefreshCw size={24} className="animate-spin text-amber-500" />
                                ) : (
                                  <Camera size={28} className="text-zinc-400" />
                                )}
                                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                                  {uploading[`${order.id}-before`] ? 'Envoi...' : 'Prendre photo avant'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  disabled={!!uploading[`${order.id}-before`]}
                                  onChange={(e) => uploadPhoto(order.id, 'before', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>

                          {/* Photo apres */}
                          <div className="relative">
                            {hasAfter ? (
                              <div className="relative rounded-xl overflow-hidden">
                                <img src={order.photo_after} alt="Apres" className="w-full h-48 object-cover" />
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-sm">
                                  Apres
                                </div>
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-lg">
                                  <CheckCircle size={14} />
                                </div>
                                {order.photo_after_geo && (
                                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                    <MapPin size={10} />
                                    <span>{Number(order.photo_after_geo.lat).toFixed(4)}, {Number(order.photo_after_geo.lng).toFixed(4)}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label className={`flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed rounded-xl cursor-pointer active:scale-[0.98] transition-all ${uploading[`${order.id}-after`] ? 'border-amber-300 bg-amber-50' : 'border-black/10 bg-zinc-50 hover:bg-white'}`}>
                                {uploading[`${order.id}-after`] ? (
                                  <RefreshCw size={24} className="animate-spin text-amber-500" />
                                ) : (
                                  <Image size={28} className="text-zinc-400" />
                                )}
                                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                                  {uploading[`${order.id}-after`] ? 'Envoi...' : 'Prendre photo apres'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  disabled={!!uploading[`${order.id}-after`]}
                                  onChange={(e) => uploadPhoto(order.id, 'after', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Complete badge */}
                        {isComplete && (
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3">
                            <CheckCircle size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Intervention terminee</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>

      <BugReportButton apiFetch={apiFetch} user={user} />
    </div>
  );
};
