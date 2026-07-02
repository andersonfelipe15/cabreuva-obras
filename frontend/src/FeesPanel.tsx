import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

interface Fee {
  id: string;
  description: string;
  amount: string;
  status: string;
  dueDate?: string | null;
  boletoFile?: string | null;
  proofFile?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};
const STATUS_BADGE: Record<string, string> = {
  AWAITING_PAYMENT: 'RETURNED',
  PAID: 'DEFERRED',
  CANCELLED: 'INDEFERRED',
};

export function FeesPanel({
  processId,
  isStaff,
  isOwner,
}: {
  processId: string;
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [error, setError] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const load = useCallback(() => {
    api.get<Fee[]>(`/processes/${processId}/fees`).then(setFees).catch((e) => setError(e.message));
  }, [processId]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="card">
      <h2>Taxas</h2>
      {error && <div className="error">{error}</div>}
      <table>
        <thead>
          <tr><th>Descrição</th><th>Valor</th><th>Situação</th><th>Comprovante</th><th></th></tr>
        </thead>
        <tbody>
          {fees.map((f) => (
            <tr key={f.id}>
              <td>{f.description}</td>
              <td>R$ {f.amount}</td>
              <td><span className={`badge ${STATUS_BADGE[f.status]}`}>{STATUS_LABEL[f.status] ?? f.status}</span></td>
              <td>{f.proofFile ? '📎 ' + f.proofFile : '—'}</td>
              <td>
                {isStaff && (
                  <select value={f.status}
                    onChange={(e) => run(() => api.patch(`/fees/${f.id}/status`, { status: e.target.value }))}>
                    <option value="AWAITING_PAYMENT">Aguardando</option>
                    <option value="PAID">Paga</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                )}
                {isOwner && f.status === 'AWAITING_PAYMENT' && (
                  <input type="file"
                    onChange={(e) => {
                      const name = e.target.files?.[0]?.name;
                      if (name) run(() => api.post(`/fees/${f.id}/proof`, { proofFile: name }));
                    }} />
                )}
              </td>
            </tr>
          ))}
          {fees.length === 0 && <tr><td colSpan={5} className="help">Nenhuma taxa lançada.</td></tr>}
        </tbody>
      </table>

      {isStaff && (
        <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => run(() => api.post(`/processes/${processId}/fees/calculate`))}>
              Calcular taxa automaticamente
            </button>
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label>Descrição (taxa manual)</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Valor (R$)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="secondary"
              disabled={!desc || !amount}
              onClick={() => run(async () => {
                await api.post(`/processes/${processId}/fees`, { description: desc, amount: Number(amount) });
                setDesc(''); setAmount('');
              })}>
              Lançar taxa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
