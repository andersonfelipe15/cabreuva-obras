import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Fee {
  id: string;
  description: string;
  amount: string;
  status: string;
  process: { number: string; requester: { name: string } };
  processId: string;
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

export function Fees() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    api.get<Fee[]>(`/fees?${p}`).then(setFees).catch((e) => setError(e.message));
  }, [status]);
  useEffect(load, [load]);

  async function setStatusOf(id: string, s: string) {
    setError('');
    try {
      await api.patch(`/fees/${id}/status`, { status: s });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Gestão de Taxas</h1>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <label>Filtrar por situação</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">Todas</option>
          <option value="AWAITING_PAYMENT">Aguardando pagamento</option>
          <option value="PAID">Pagas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Processo</th><th>Descrição</th><th>Valor</th><th>Requerente</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f.id}>
                <td><Link to={`/process/${f.processId}`}>{f.process.number}</Link></td>
                <td>{f.description}</td>
                <td>R$ {f.amount}</td>
                <td>{f.process.requester.name}</td>
                <td><span className={`badge ${STATUS_BADGE[f.status]}`}>{STATUS_LABEL[f.status] ?? f.status}</span></td>
                <td>
                  <select value={f.status} onChange={(e) => setStatusOf(f.id, e.target.value)}>
                    <option value="AWAITING_PAYMENT">Aguardando</option>
                    <option value="PAID">Paga</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </td>
              </tr>
            ))}
            {fees.length === 0 && <tr><td colSpan={6} className="help">Nenhuma taxa.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
