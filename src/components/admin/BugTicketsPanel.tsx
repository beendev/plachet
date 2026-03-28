import React, { useEffect, useState } from 'react';
import { Bug, RefreshCw, ChevronDown, ChevronUp, Trash2, MessageSquare, Clock, User, Globe, AlertTriangle } from 'lucide-react';

type BugReport = {
  id: number;
  reported_by_user_id: number;
  reporter_name: string;
  reporter_email: string;
  reporter_role: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  page_url: string;
  user_agent: string;
  admin_notes: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  user: { id: number; role: string };
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Resolu',
  closed: 'Ferme',
  wont_fix: 'Ne sera pas corrige',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-zinc-100 text-zinc-500',
  wont_fix: 'bg-zinc-100 text-zinc-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export const BugTicketsPanel = ({ apiFetch, user }: Props) => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/bug-reports?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      if (res.ok) setReports(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    await apiFetch(`/api/bug-reports/${id}?userId=${user.id}&role=${user.role}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId: user.id, role: user.role }),
    });
    await load();
  };

  const saveNotes = async (id: number) => {
    await apiFetch(`/api/bug-reports/${id}?userId=${user.id}&role=${user.role}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: editingNotes[id] || '', userId: user.id, role: user.role }),
    });
    setEditingNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    await load();
  };

  const deleteReport = async (id: number) => {
    if (!confirm('Supprimer ce ticket ?')) return;
    await apiFetch(`/api/bug-reports/${id}?userId=${user.id}&role=${user.role}`, { method: 'DELETE' });
    await load();
  };

  const filtered = reports.filter(r => {
    if (filter === 'open') return r.status === 'open' || r.status === 'in_progress';
    if (filter === 'resolved') return r.status === 'resolved' || r.status === 'closed' || r.status === 'wont_fix';
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-zinc-300" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Tickets / Bug Reports</h2>
        <button onClick={load} className="p-2 rounded-xl hover:bg-zinc-100"><RefreshCw size={16} className="text-zinc-400" /></button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
          >
            {f === 'all' ? `Tous (${reports.length})` : f === 'open' ? `Ouverts (${reports.filter(r => r.status === 'open' || r.status === 'in_progress').length})` : `Resolus (${reports.filter(r => r.status === 'resolved' || r.status === 'closed' || r.status === 'wont_fix').length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bug size={32} className="text-zinc-300 mx-auto mb-4" />
          <div className="text-base font-bold mb-1">Aucun ticket</div>
          <div className="text-sm text-zinc-400">Les signalements des utilisateurs apparaitront ici.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const isExpanded = expandedId === report.id;
            return (
              <div key={report.id} className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full text-left p-4 flex items-center gap-3"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${report.severity === 'critical' ? 'bg-red-500' : report.severity === 'high' ? 'bg-orange-500' : report.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${STATUS_COLORS[report.status] || 'bg-zinc-100'}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${SEVERITY_COLORS[report.severity] || 'bg-zinc-100'}`}>
                        {report.severity}
                      </span>
                      <span className="text-[10px] text-zinc-400">#{report.id}</span>
                    </div>
                    <div className="text-sm font-bold truncate">{report.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {report.reporter_name} ({report.reporter_role}) · {new Date(report.created_at).toLocaleDateString('fr-BE')}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-zinc-300" /> : <ChevronDown size={16} className="text-zinc-300" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-black/5 pt-4">
                    {/* Description */}
                    {report.description && (
                      <div className="bg-zinc-50 rounded-xl p-3">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Description</div>
                        <div className="text-sm whitespace-pre-wrap">{report.description}</div>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <User size={12} /> {report.reporter_email}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={12} /> {new Date(report.created_at).toLocaleString('fr-BE')}
                      </div>
                      {report.page_url && (
                        <div className="flex items-center gap-2 text-zinc-500 col-span-2">
                          <Globe size={12} /> <span className="truncate">{report.page_url}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin notes */}
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Notes dev</div>
                      <textarea
                        value={editingNotes[report.id] ?? report.admin_notes ?? ''}
                        onChange={e => setEditingNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                        rows={3}
                        placeholder="Notes internes, investigation, solution..."
                        className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-black/30"
                      />
                      {editingNotes[report.id] !== undefined && (
                        <button onClick={() => saveNotes(report.id)} className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:underline">
                          Sauvegarder les notes
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {report.status !== 'in_progress' && report.status !== 'resolved' && report.status !== 'closed' && (
                        <button onClick={() => updateStatus(report.id, 'in_progress')} className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          En cours
                        </button>
                      )}
                      {report.status !== 'resolved' && (
                        <button onClick={() => updateStatus(report.id, 'resolved')} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          Resolu
                        </button>
                      )}
                      {report.status !== 'closed' && (
                        <button onClick={() => updateStatus(report.id, 'closed')} className="px-3 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          Fermer
                        </button>
                      )}
                      {report.status !== 'wont_fix' && (
                        <button onClick={() => updateStatus(report.id, 'wont_fix')} className="px-3 py-2 bg-zinc-100 text-zinc-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                          Won't fix
                        </button>
                      )}
                      <button onClick={() => deleteReport(report.id)} className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest ml-auto">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
