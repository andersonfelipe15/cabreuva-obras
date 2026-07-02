import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

interface User { id: string; name: string; email?: string }

// ── Moderadores de campos sigilosos (req. 67, 70) ──
export function ModeratorsPanel({ processId }: { processId: string }) {
  const [mods, setMods] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pick, setPick] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<User[]>(`/processes/${processId}/moderators`).then(setMods).catch((e) => setError(e.message));
  }, [processId]);
  useEffect(() => { load(); api.get<User[]>('/users').then(setUsers).catch(() => {}); }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="card">
      <h2>Moderadores (campos sigilosos)</h2>
      <p className="help">Moderadores e o autor podem ver os campos sigilosos deste processo. Os demais veem mascarado.</p>
      {error && <div className="error">{error}</div>}
      {mods.map((m) => (
        <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span>👤 {m.name}</span>
          <button className="danger" style={{ padding: '2px 6px', fontSize: 12 }}
            onClick={() => run(() => api.delete(`/processes/${processId}/moderators/${m.id}`))}>Remover</button>
        </div>
      ))}
      {mods.length === 0 && <p className="help">Nenhum moderador definido.</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1 }}>
          <option value="">Selecionar usuário...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="secondary" disabled={!pick} onClick={() => run(async () => { await api.post(`/processes/${processId}/moderators`, { userId: pick }); setPick(''); })}>
          + Moderador
        </button>
      </div>
    </div>
  );
}

// ── Aceites (req. 131-135) ──
interface Acc { id: string; userId: string; userName: string; status: string }
export function AcceptancePanel({ processId, isStaff }: { processId: string; isStaff: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Acc[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [term, setTerm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<Acc[]>(`/processes/${processId}/acceptances`).then(setItems).catch((e) => setError(e.message));
  }, [processId]);
  useEffect(() => { load(); if (isStaff) api.get<User[]>('/users').then(setUsers).catch(() => {}); }, [load, isStaff]);

  async function run(fn: () => Promise<unknown>) {
    setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }
  const mine = items.find((i) => i.userId === user?.id && i.status === 'PENDING');
  const LABEL: Record<string, string> = { PENDING: 'Não aceitou', ACCEPTED: 'Aceitou', REJECTED: 'Recusou' };
  const BADGE: Record<string, string> = { PENDING: 'RETURNED', ACCEPTED: 'DEFERRED', REJECTED: 'INDEFERRED' };

  return (
    <div className="card">
      <h2>Aceites dos envolvidos</h2>
      {error && <div className="error">{error}</div>}
      {items.map((a) => (
        <div key={a.id} style={{ marginBottom: 4 }}>
          👤 {a.userName} — <span className={`badge ${BADGE[a.status]}`}>{LABEL[a.status]}</span>
        </div>
      ))}
      {items.length === 0 && <p className="help">Nenhum aceite solicitado.</p>}

      {mine && (
        <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 10, marginTop: 10 }}>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={term} onChange={(e) => setTerm(e.target.checked)} />
            Li e aceito o termo de responsabilidade.
          </label>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => run(() => api.post(`/acceptances/${mine.id}/respond`, { accept: true, termAccepted: term }))}>Aceitar</button>
            <button className="danger" onClick={() => run(() => api.post(`/acceptances/${mine.id}/respond`, { accept: false, termAccepted: term }))}>Recusar</button>
          </div>
        </div>
      )}

      {isStaff && (
        <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 10, marginTop: 10 }}>
          <label>Solicitar aceite de</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {users.map((u) => (
              <label key={u.id} style={{ fontWeight: 400 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 4 }} checked={sel.includes(u.id)}
                  onChange={() => setSel((s) => s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id])} />{u.name}
              </label>
            ))}
          </div>
          <button className="secondary" style={{ marginTop: 8 }} disabled={sel.length === 0}
            onClick={() => run(async () => { await api.post(`/processes/${processId}/acceptances`, { userIds: sel }); setSel([]); })}>
            Solicitar aceites
          </button>
        </div>
      )}
    </div>
  );
}

// ── Prazos e ações automáticas (req. 136-138) ──
interface Sched { id: string; action: string; dueAt: string; reason?: string; executed: boolean }
export function ScheduledPanel({ processId }: { processId: string }) {
  const [items, setItems] = useState<Sched[]>([]);
  const [action, setAction] = useState('SEND_ANALYSIS');
  const [dueAt, setDueAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<Sched[]>(`/processes/${processId}/scheduled-actions`).then(setItems).catch((e) => setError(e.message));
  }, [processId]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }
  const pending = items.some((i) => !i.executed);
  const ACTIONS = ['DEFER', 'INDEFER', 'SEND_ANALYSIS', 'RETURN', 'NOTIFY', 'BLOCK', 'UNBLOCK'];

  return (
    <div className="card">
      <h2>Prazos e ações automáticas {pending && <span className="badge RETURNED">⏰ ação programada</span>}</h2>
      {error && <div className="error">{error}</div>}
      {items.map((s) => (
        <div key={s.id} style={{ marginBottom: 4 }}>
          {s.action} · vence {new Date(s.dueAt).toLocaleString('pt-BR')} · {s.executed ? '✔ executada' : '⏳ pendente'}
        </div>
      ))}
      {items.length === 0 && <p className="help">Nenhuma ação programada.</p>}
      <div className="row" style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label>Ação</label>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Prazo</label>
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Motivo</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button className="secondary" disabled={!dueAt}
          onClick={() => run(async () => { await api.post(`/processes/${processId}/scheduled-actions`, { action, dueAt, reason }); setDueAt(''); setReason(''); })}>
          Agendar
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={() => run(() => api.post('/scheduled-actions/run', {}))}>Executar ações vencidas</button>
      </div>
    </div>
  );
}
