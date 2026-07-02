import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

interface Notif {
  id: string; to: string; subject: string; event: string;
  link?: string | null; sent: boolean; simulated: boolean; error?: string | null; createdAt: string;
}

const EVENT_LABEL: Record<string, string> = {
  ACCEPTANCE: 'Aceite', INVITE: 'Convite', PASSWORD_RESET: 'Redefinição de senha',
  SCHEDULED: 'Ação programada', DECISION: 'Decisão',
};

// Caixa de saída de e-mails / auditoria de notificações (req. 132).
export function Notifications() {
  const [items, setItems] = useState<Notif[]>([]);
  const [event, setEvent] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams(); if (event) p.set('event', event);
    api.get<Notif[]>(`/notifications?${p}`).then(setItems).catch((e) => setError(e.message));
  }, [event]);
  useEffect(load, [load]);

  return (
    <div>
      <h1>Notificações (caixa de saída)</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <p className="help">
          Registro de todos os e-mails disparados pelo sistema. Sem SMTP configurado
          (<code>SMTP_HOST</code>), os envios ficam marcados como <strong>simulado</strong>.
        </p>
        <label>Filtrar por evento</label>
        <select value={event} onChange={(e) => setEvent(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">Todos</option>
          {Object.entries(EVENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Data</th><th>Evento</th><th>Para</th><th>Assunto</th><th>Link</th><th>Status</th></tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString('pt-BR')}</td>
                <td>{EVENT_LABEL[n.event] ?? n.event}</td>
                <td>{n.to}</td>
                <td style={{ fontSize: 13 }}>{n.subject}</td>
                <td style={{ fontSize: 12 }}>{n.link ? <a href={n.link} target="_blank">abrir</a> : '—'}</td>
                <td>
                  {n.sent
                    ? <span className="badge DEFERRED">Enviado</span>
                    : n.simulated
                      ? <span className="badge IN_ANALYSIS">Simulado</span>
                      : <span className="badge RETURNED">Falha</span>}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="help">Nenhuma notificação.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
