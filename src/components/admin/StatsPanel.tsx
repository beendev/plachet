import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp, Building2, ShoppingCart, Users, Bug, PieChart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

type StatsSubView = 'overview' | 'orders' | 'buildings' | 'users' | 'placeurs' | 'bugs';

type Props = {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  user: { id: number; role: string };
};

const COLORS = ['#000000', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

const statSubTabs: { key: StatsSubView; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Vue globale', icon: <BarChart3 size={14} /> },
  { key: 'orders', label: 'Commandes', icon: <ShoppingCart size={14} /> },
  { key: 'buildings', label: 'Immeubles', icon: <Building2 size={14} /> },
  { key: 'users', label: 'Utilisateurs', icon: <Users size={14} /> },
  { key: 'placeurs', label: 'Placeurs', icon: <TrendingUp size={14} /> },
  { key: 'bugs', label: 'Tickets', icon: <Bug size={14} /> },
];

const Card = ({ title, value, sub, color = 'text-black' }: { title: string; value: string | number; sub?: string; color?: string }) => (
  <div className="bg-white border border-black/5 rounded-2xl p-5">
    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">{title}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="text-[10px] text-zinc-400 mt-1">{sub}</div>}
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-black/5 rounded-2xl p-5">
    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">{title}</div>
    <div className="h-64">{children}</div>
  </div>
);

const STATUS_LABELS: Record<string, string> = {
  validation_proprietaire: 'Valid. proprio',
  'reçue': 'Recue',
  en_traitement: 'En traitement',
  in_production: 'En production',
  en_pose: 'En pose',
  'posée': 'Posee',
  'facturée': 'Facturee',
  'annulée': 'Annulee',
};

const BUILDING_STATUS_LABELS: Record<string, string> = {
  pending_survey: 'A mesurer',
  survey_completed: 'Mesure fait',
  in_production: 'En production',
  installed: 'Installe',
};

export const StatsPanel = ({ apiFetch, user }: Props) => {
  const [sub, setSub] = useState<StatsSubView>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/stats?userId=${user.id}&role=${user.role}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-zinc-300" />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-zinc-400">Impossible de charger les statistiques</div>;

  const { orders, buildings, users, bugReports } = data;

  // ── Computed stats ──
  const ordersByStatus = Object.entries(
    orders.reduce((acc: Record<string, number>, o: any) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
  ).map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count as number, status }));

  const buildingsByStatus = Object.entries(
    buildings.reduce((acc: Record<string, number>, b: any) => { const s = b.status || 'unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {})
  ).map(([status, count]) => ({ name: BUILDING_STATUS_LABELS[status] || status, value: count as number }));

  const usersByRole = Object.entries(
    users.filter((u: any) => !u.deleted_at).reduce((acc: Record<string, number>, u: any) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
  ).map(([role, count]) => ({ name: role === 'admin' ? 'Admin' : role === 'syndic' ? 'Syndic' : 'Placeur', value: count as number }));

  // Orders by month (last 12 months)
  const now = new Date();
  const monthsBack = 12;
  const monthLabels: string[] = [];
  const ordersByMonth: Record<string, number> = {};
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-BE', { month: 'short', year: '2-digit' });
    monthLabels.push(key);
    ordersByMonth[key] = 0;
  }
  for (const o of orders) {
    if (!o.created_at) continue;
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (ordersByMonth[key] !== undefined) ordersByMonth[key]++;
  }
  const ordersTrend = monthLabels.map(key => ({
    name: new Date(key + '-01').toLocaleDateString('fr-BE', { month: 'short' }),
    commandes: ordersByMonth[key],
  }));

  // Placeur stats
  const placeurIds = [...new Set(orders.filter((o: any) => o.placeur_id).map((o: any) => o.placeur_id))];
  const placeurStats = placeurIds.map((pid: any) => {
    const placeurOrders = orders.filter((o: any) => o.placeur_id === pid);
    const placeurUser = users.find((u: any) => u.id === pid);
    return {
      name: placeurUser?.name || `Placeur #${pid}`,
      total: placeurOrders.length,
      done: placeurOrders.filter((o: any) => o.status === 'posée' || o.status === 'facturée').length,
      pending: placeurOrders.filter((o: any) => o.status === 'en_pose').length,
    };
  }).sort((a: any, b: any) => b.total - a.total);

  // Buildings by month
  const buildingsByMonth: Record<string, number> = {};
  for (const key of monthLabels) buildingsByMonth[key] = 0;
  for (const b of buildings) {
    if (!b.created_at) continue;
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buildingsByMonth[key] !== undefined) buildingsByMonth[key]++;
  }
  const buildingsTrend = monthLabels.map(key => ({
    name: new Date(key + '-01').toLocaleDateString('fr-BE', { month: 'short' }),
    immeubles: buildingsByMonth[key],
  }));

  // Bug stats
  const bugsByStatus = Object.entries(
    bugReports.reduce((acc: Record<string, number>, b: any) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {})
  ).map(([status, count]) => ({ name: status, value: count as number }));

  const bugsBySeverity = Object.entries(
    bugReports.reduce((acc: Record<string, number>, b: any) => { acc[b.severity] = (acc[b.severity] || 0) + 1; return acc; }, {})
  ).map(([severity, count]) => ({ name: severity, value: count as number }));

  const activeOrders = orders.filter((o: any) => o.status !== 'annulée');
  const doneOrders = orders.filter((o: any) => o.status === 'posée' || o.status === 'facturée');
  const conversionRate = activeOrders.length > 0 ? Math.round((doneOrders.length / activeOrders.length) * 100) : 0;
  const activeBuildings = buildings.filter((b: any) => !b.archived_at);
  const activeUsers = users.filter((u: any) => !u.deleted_at);
  const openBugs = bugReports.filter((b: any) => b.status === 'open' || b.status === 'in_progress');

  // Requester quality stats
  const byRequester = Object.entries(
    orders.reduce((acc: Record<string, number>, o: any) => { const q = o.requester_quality || 'inconnu'; acc[q] = (acc[q] || 0) + 1; return acc; }, {})
  ).map(([q, count]) => ({ name: q === 'tenant' ? 'Locataire' : q === 'owner' ? 'Proprietaire' : q === 'syndic' ? 'Syndic' : q === 'admin' ? 'Admin' : q, value: count as number }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Statistiques</h2>
        <button onClick={load} className="p-2 rounded-xl hover:bg-zinc-100"><RefreshCw size={16} className="text-zinc-400" /></button>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 overflow-x-auto pb-4 mb-6 -mx-1 px-1">
        {statSubTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${sub === t.key ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {sub === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Commandes" value={orders.length} sub={`${doneOrders.length} terminees`} />
            <Card title="Immeubles" value={activeBuildings.length} sub={`${buildings.filter((b: any) => b.archived_at).length} archives`} />
            <Card title="Utilisateurs" value={activeUsers.length} sub={`${usersByRole.map((r: any) => `${r.value} ${r.name.toLowerCase()}`).join(', ')}`} />
            <Card title="Taux completion" value={`${conversionRate}%`} color={conversionRate > 70 ? 'text-emerald-600' : conversionRate > 40 ? 'text-amber-600' : 'text-red-500'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Commandes par mois">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ordersTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="commandes" stroke="#000" fill="#000" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Commandes par statut">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                    {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {openBugs.length > 0 && (
            <Card title="Tickets ouverts" value={openBugs.length} sub="Problemes signales non resolus" color="text-red-500" />
          )}
        </div>
      )}

      {/* Orders */}
      {sub === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Total" value={orders.length} />
            <Card title="En cours" value={activeOrders.length - doneOrders.length} color="text-amber-600" />
            <Card title="Terminees" value={doneOrders.length} color="text-emerald-600" />
            <Card title="Annulees" value={orders.filter((o: any) => o.status === 'annulée').length} color="text-red-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Evolution mensuelle">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="commandes" stroke="#000" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Par statut">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Par type de demandeur">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={byRequester} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {byRequester.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Taux de completion">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-5xl font-bold">{conversionRate}%</div>
                <div className="text-sm text-zinc-400 mt-2">{doneOrders.length} / {activeOrders.length} commandes terminees</div>
                <div className="w-full bg-zinc-100 rounded-full h-4 mt-4">
                  <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Buildings */}
      {sub === 'buildings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Total" value={buildings.length} />
            <Card title="Actifs" value={activeBuildings.length} color="text-emerald-600" />
            <Card title="Archives" value={buildings.filter((b: any) => b.archived_at).length} />
            <Card title="A mesurer" value={buildings.filter((b: any) => b.status === 'pending_survey').length} color="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Nouveaux immeubles par mois">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildingsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="immeubles" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Par statut">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={buildingsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {buildingsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Users */}
      {sub === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card title="Total actifs" value={activeUsers.length} />
            {usersByRole.map((r: any) => (
              <div key={r.name}><Card title={r.name + 's'} value={r.value} /></div>
            ))}
            <Card title="Supprimes" value={users.filter((u: any) => u.deleted_at).length} color="text-zinc-400" />
          </div>

          <ChartCard title="Repartition par role">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie data={usersByRole} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                  {usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Placeurs */}
      {sub === 'placeurs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card title="Placeurs actifs" value={placeurStats.length} />
            <Card title="Total poses" value={placeurStats.reduce((s: number, p: any) => s + p.done, 0)} color="text-emerald-600" />
            <Card title="En attente" value={placeurStats.reduce((s: number, p: any) => s + p.pending, 0)} color="text-amber-600" />
          </div>

          {placeurStats.length > 0 ? (
            <ChartCard title="Performance par placeur">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placeurStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="done" name="Terminees" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="En cours" fill="#f59e0b" stackId="a" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : (
            <div className="text-center py-10 text-zinc-400 text-sm">Aucune donnee placeur disponible</div>
          )}
        </div>
      )}

      {/* Bugs */}
      {sub === 'bugs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card title="Total tickets" value={bugReports.length} />
            <Card title="Ouverts" value={openBugs.length} color="text-red-500" />
            <Card title="Resolus" value={bugReports.filter((b: any) => b.status === 'resolved' || b.status === 'closed').length} color="text-emerald-600" />
            <Card title="Critiques" value={bugReports.filter((b: any) => b.severity === 'critical').length} color="text-red-600" />
          </div>

          {bugReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="Par statut">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={bugsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {bugsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Par severite">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bugsBySeverity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
