import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api';

interface Item {
  id: string;
  documentId: string;
  processNumber: string;
  docType: string;
  status: string;
  error?: string | null;
}
interface Batch {
  id: string;
  referenceMonth: string;
  createdAt: string;
  items: Item[];
}
interface Log {
  id: string;
  action: string;
  result: string;
  description?: string | null;
  createdAt: string;
}

const LABEL: Record<string, string> = {
  GENERATED: 'Gerado',
  XML_ERROR: 'Erro XML',
  TRANSMITTED: 'Transmitido',
  TRANSMISSION_ERROR: 'Erro transmissão',
};
const BADGE: Record<string, string> = {
  GENERATED: 'IN_ANALYSIS',
  XML_ERROR: 'RETURNED',
  TRANSMITTED: 'DEFERRED',
  TRANSMISSION_ERROR: 'INDEFERRED',
};

async function downloadXml(batchId: string) {
  const res = await fetch(`/api/sisobra/batches/${batchId}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { alert('Erro ao baixar'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = `lote-${batchId}.xml`;
  a.click();
}

export function Sisobra() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState('');
  const [useCert, setUseCert] = useState(true);
  const [corr, setCorr] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.get<Batch[]>('/sisobra/batches').then(setBatches).catch((e) => setError(e.message));
    api.get<Log[]>('/sisobra/logs').then(setLogs);
  }, []);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  // Agrupa por mês de referência (req. 168).
  const byMonth = batches.reduce<Record<string, Batch[]>>((acc, b) => {
    (acc[b.referenceMonth] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div>
      <h1>SISOBRA — Envio de Documentos</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button onClick={() => run(() => api.post('/sisobra/batches'))}>Gerar novo lote</button>
          </div>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
              checked={useCert} onChange={(e) => setUseCert(e.target.checked)} />
            Usar certificado digital (A1)
          </label>
        </div>
        <p className="help">Gera um lote com os alvarás deferidos ainda não enviados. Documentos com erro de XML podem ser corrigidos aqui antes da transmissão.</p>
      </div>

      {Object.entries(byMonth).map(([month, list]) => (
        <div key={month}>
          <div className="section-title">Mês de referência: {month}</div>
          {list.map((b) => (
            <div className="card" key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Lote {b.id.slice(0, 8)}</strong>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="secondary" onClick={() => downloadXml(b.id)}>Baixar XML</button>
                  <button onClick={() => run(() => api.post(`/sisobra/batches/${b.id}/transmit`, { useCertificate: useCert }))}>
                    Transmitir
                  </button>
                </div>
              </div>
              <table style={{ marginTop: 10 }}>
                <thead><tr><th>Tipo</th><th>Processo</th><th>Status SISOBRA</th><th>Correção</th></tr></thead>
                <tbody>
                  {b.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.docType}</td>
                      <td>{it.processNumber}</td>
                      <td>
                        <span className={`badge ${BADGE[it.status]}`}>{LABEL[it.status] ?? it.status}</span>
                        {it.error && <div className="help">{it.error}</div>}
                      </td>
                      <td>
                        {it.status === 'XML_ERROR' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input placeholder="Inscrição imobiliária" style={{ width: 160 }}
                              value={corr[it.id] ?? ''} onChange={(e) => setCorr((s) => ({ ...s, [it.id]: e.target.value }))} />
                            <button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }}
                              onClick={() => run(() => api.patch(`/sisobra/documents/${it.id}`, { fields: { inscricaoImobiliaria: corr[it.id] } }))}>
                              Corrigir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
      {batches.length === 0 && <div className="card"><p className="help">Nenhum lote gerado.</p></div>}

      <div className="card">
        <h2>Histórico de processamento</h2>
        <table>
          <thead><tr><th>Data</th><th>Ação</th><th>Resultado</th><th>Descrição</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: 12 }}>{new Date(l.createdAt).toLocaleString('pt-BR')}</td>
                <td>{l.action}</td><td>{l.result}</td><td>{l.description}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="help">Sem registros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
