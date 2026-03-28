import React, { useState } from 'react';
import { Bug, X, Send, AlertTriangle } from 'lucide-react';

type Props = {
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  user?: { id: number; role: string };
};

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Mineur', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: 'Moyen', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'Important', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-700' },
];

export const BugReportButton = ({ apiFetch, user }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setError('');
    setSent(false);
  };

  const submit = async () => {
    if (title.trim().length < 3) { setError('Titre trop court (min 3 caracteres)'); return; }
    setSending(true);
    setError('');
    try {
      const qp = user ? `?userId=${user.id}&role=${user.role}` : '';
      const res = await apiFetch(`/api/bug-reports${qp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          page_url: window.location.href,
          ...(user ? { userId: user.id, role: user.role } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }
      setSent(true);
      setTimeout(() => { setOpen(false); reset(); }, 2000);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-800 active:scale-95 transition-all"
        title="Signaler un probleme"
      >
        <Bug size={20} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Signaler un probleme</h3>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Bug ou suggestion</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-zinc-100"><X size={18} /></button>
              </div>

              {sent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={24} className="text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold mb-1">Merci !</div>
                  <div className="text-sm text-zinc-500">Votre signalement a ete envoye.</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">Titre *</label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Le bouton ne fonctionne pas..."
                      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black/30"
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Decrivez le probleme en detail... Qu'avez-vous fait ? Que s'est-il passe ?"
                      rows={4}
                      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black/30 resize-none"
                      maxLength={5000}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 block">Severite</label>
                    <div className="flex gap-2">
                      {SEVERITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setSeverity(opt.value)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${severity === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-black/20' : 'bg-zinc-100 text-zinc-400'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</div>}

                  <button
                    onClick={submit}
                    disabled={sending}
                    className="w-full bg-black text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? 'Envoi...' : <><Send size={14} /> Envoyer le signalement</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
