import { useEffect, useState } from 'react';
import { api, getToken } from '../api';

interface Dashboard {
  total: number;
  byStatus: { status: string; label: string; count: number }[];
  byCategory: Record<string, number>;
  byType: { name: string; count: number }[];
  documents: { total: number; signed: number };
  avgDeferralDays: number | null;
}
interface ProcessType { id: string; name: string }

const CATEGORY_LABEL: Record<string, string> = {
  EDILICIO: 'Edilícios',
  USO_SOLO: 'Uso do Solo',
  AMBIENTAL: 'Ambiental',
  SERVICOS_GERAIS: 'Serviços Gerais',
};

// Download autenticado (envia o token JWT) → salva o arquivo.
async function download(url: string, filename: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('Erro ao gerar o relatório');
    return;
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function Reports() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [types, setTypes] = useState<ProcessType[]>([]);
  const [error, setError] = useState('');
  const [typeId, setTypeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api.get<Dashboard>('/reports/dashboard').then(setD).catch((e) => setError(e.message));
    api.get<ProcessType[]>('/process-types/catalog').then(setTypes);
  }, []);

  function csvUrl() {
    const p = new URLSearchParams();
    if (typeId) p.set('processTypeId', typeId);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return `/api/reports/protocols.csv?${p}`;
  }
  function pdfUrl() {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return `/api/reports/performance.pdf?${p}`;
  }

  return (
    <div>
      <h1>Relatórios Gerenciais</h1>
      {error && <div className="error">{error}</div>}

      {d && (
        <>
          <div className="row">
            <div className="card" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{d.total}</div>
              <div className="help">Processos totais</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{d.documents.total}</div>
              <div className="help">Documentos emitidos ({d.documents.signed} assinados)</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700 }}>
                {d.avgDeferralDays ?? '—'}
              </div>
              <div className="help">Tempo médio p/ deferir (dias)</div>
            </div>
          </div>

          <div className="row">
            <div className="card" style={{ flex: 1 }}>
              <h2>Por status</h2>
              <table><tbody>
                {d.byStatus.map((s) => (
                  <tr key={s.status}><td>{s.label}</td><td style={{ textAlign: 'right' }}>{s.count}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <h2>Por categoria</h2>
              <table><tbody>
                {Object.entries(d.byCategory).map(([c, n]) => (
                  <tr key={c}><td>{CATEGORY_LABEL[c] ?? c}</td><td style={{ textAlign: 'right' }}>{n}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="card" style={{ flex: 1 }}>
              <h2>Por assunto</h2>
              <table><tbody>
                {d.byType.map((t) => (
                  <tr key={t.name}><td>{t.name}</td><td style={{ textAlign: 'right' }}>{t.count}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>Exportar relatórios</h2>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label>Assunto (para o CSV)</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">Todos</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button onClick={() => download(csvUrl(), 'protocolos.csv')}>
            Exportar protocolos (.csv)
          </button>
          <button className="secondary" onClick={() => download(pdfUrl(), 'desempenho.pdf')}>
            Relatório de desempenho (.pdf)
          </button>
        </div>
      </div>
    </div>
  );
}
