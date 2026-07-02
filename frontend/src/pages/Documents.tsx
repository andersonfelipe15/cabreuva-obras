import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api';

interface Doc {
  id: string; number: string; type: string; status: string;
  isPublic: boolean; renewalState?: string | null; signed: boolean;
  validUntil?: string | null; createdAt: string; chancelado: boolean;
  process: { number: string }; emittedBy: { name: string };
}
interface Log { id: string; action: string; reason?: string | null; createdAt: string }

const LABEL: Record<string, string> = {
  VALID: 'Vigente', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado', REVOKED: 'Cassado',
};
const BADGE: Record<string, string> = {
  VALID: 'DEFERRED', SUSPENDED: 'IN_ANALYSIS', CANCELLED: 'INDEFERRED', REVOKED: 'RETURNED',
};

async function viewPdf(id: string) {
  const res = await fetch(`/api/documents/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.ok) window.open(URL.createObjectURL(await res.blob()), '_blank');
}

export function Documents() {
  const [data, setData] = useState<{ total: number; items: Doc[] }>({ total: 0, items: [] });
  const [status, setStatus] = useState('');
  const [pub, setPub] = useState('');
  const [signed, setSigned] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [validity, setValidity] = useState('');
  const [renewal, setRenewal] = useState('Renovado');

  // Central de assinaturas: Minhas / Solicitadas / Todas (req. 203-204).
  const [sigScope, setSigScope] = useState('mine');
  const [sig, setSig] = useState<{ counts: any; items: any[] }>({ counts: {}, items: [] });
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (pub) p.set('isPublic', pub);
    if (signed) p.set('signed', signed);
    api.get<{ total: number; items: Doc[] }>(`/documents?${p}`).then(setData).catch((e) => setError(e.message));
  }, [status, pub, signed]);
  useEffect(load, [load]);

  const loadSig = useCallback(() => {
    api.get<any>(`/documents/signatures?scope=${sigScope}`).then((r) => { setSig(r); setSelected([]); }).catch(() => {});
  }, [sigScope]);
  useEffect(loadSig, [loadSig]);

  async function signSelected() {
    setError('');
    try {
      const r: any = await api.post('/documents/sign-batch', { ids: selected });
      alert(`Assinatura em lote concluída: ${r.signed} de ${selected.length}.`);
      loadSig(); load();
    } catch (e) { setError((e as Error).message); }
  }
  function toggleSel(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); if (open) openDetail(open); } catch (e) { setError((e as Error).message); }
  }
  function openDetail(id: string) {
    setOpen(id);
    api.get<any>(`/documents/${id}/detail`).then((d) => setLogs(d.logs ?? []));
  }
  function act(id: string, action: string, needsReason = false) {
    let reason: string | undefined;
    if (needsReason) {
      const r = window.prompt('Justificativa:');
      if (!r) return; reason = r;
    }
    run(() => api.post(`/documents/${id}/action`, { action, reason }));
  }

  return (
    <div>
      <h1>Central de Documentos</h1>
      {error && <div className="error">{error}</div>}

      {/* Central de assinaturas (req. 203-204) */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Central de Assinaturas</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {([['mine', 'Minhas'], ['requested', 'Solicitadas'], ['all', 'Todas']] as [string, string][]).map(([k, label]) => (
            <button key={k} className={sigScope === k ? '' : 'secondary'} onClick={() => setSigScope(k)}>
              {label} ({sig.counts?.[k] ?? 0})
            </button>
          ))}
          {selected.length > 0 && (
            <button style={{ marginLeft: 'auto' }} onClick={signSelected}>Assinar selecionadas ({selected.length})</button>
          )}
        </div>
        <table>
          <thead><tr><th></th><th>Documento</th><th>Tipo</th><th>Processo</th><th>Emissor</th><th>Assinatura</th></tr></thead>
          <tbody>
            {sig.items.map((d) => (
              <tr key={d.id}>
                <td>{!d.signed && <input type="checkbox" style={{ width: 'auto' }} checked={selected.includes(d.id)} onChange={() => toggleSel(d.id)} />}</td>
                <td>{d.number}</td><td>{d.type}</td><td>{d.process?.number}</td><td>{d.emittedBy?.name}</td>
                <td>{d.signed
                  ? <span className="badge DEFERRED">✔ Assinado</span>
                  : <button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => run(() => api.post(`/documents/${d.id}/sign`).then(() => loadSig()))}>Assinar</button>}</td>
              </tr>
            ))}
            {sig.items.length === 0 && <tr><td colSpan={6} className="help">Nenhum documento neste filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Abas por situação de publicação (req. 193) */}
      <div className="card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['Todos', '', '', ''],
            ['Aguardando assinatura', '', 'false', ''],
            ['Publicados', 'VALID', 'true', ''],
            ['Suspensos', 'SUSPENDED', '', ''],
            ['Cancelados', 'CANCELLED', '', ''],
          ] as [string, string, string, string][]).map(([label, st, sg]) => {
            const active = status === st && signed === sg;
            return (
              <button key={label} className={active ? '' : 'secondary'}
                onClick={() => { setStatus(st); setSigned(sg); }}>{label}</button>
            );
          })}
        </div>
      </div>

      <div className="row">
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{data.total}</div>
          <div className="help">Documentos emitidos</div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Situação</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todas</option>
                <option value="VALID">Vigentes</option>
                <option value="SUSPENDED">Suspensos</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Visibilidade</label>
              <select value={pub} onChange={(e) => setPub(e.target.value)}>
                <option value="">Todas</option>
                <option value="true">Públicos</option>
                <option value="false">Privados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Documento</th><th>Tipo</th><th>Processo</th><th>Emissor</th><th>Validade</th><th>Situação</th><th>Visib.</th><th></th></tr>
          </thead>
          <tbody>
            {data.items.map((d) => (
              <tr key={d.id}>
                <td>{d.number}</td><td>{d.type}</td><td>{d.process.number}</td><td>{d.emittedBy.name}</td>
                <td>{d.validUntil ? new Date(d.validUntil).toLocaleDateString('pt-BR') : '—'}</td>
                <td>
                  <span className={`badge ${BADGE[d.status]}`}>{LABEL[d.status] ?? d.status}</span>
                  {d.renewalState && <div className="help">{d.renewalState}</div>}
                </td>
                <td>{d.isPublic ? 'Público' : 'Privado'}</td>
                <td><button className="secondary" style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => open === d.id ? setOpen(null) : openDetail(d.id)}>Gerenciar</button></td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={8} className="help">Nenhum documento.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (() => {
        const d = data.items.find((x) => x.id === open);
        if (!d) return null;
        return (
          <div className="card">
            <h2>{d.number} — <span className={`badge ${BADGE[d.status]}`}>{LABEL[d.status]}</span></h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => viewPdf(d.id)}>Ver PDF</button>
              <button className="danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'CANCEL', true)}>Cancelar</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'SUSPEND', true)}>Suspender</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'REOPEN')}>Reabrir</button>
              <button style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'REVERT', true)}>Reverter cancelamento</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'CHANCELAR')}>Chancelar</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => act(d.id, 'RETIFICAR', true)}>Retificar</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }}
                onClick={() => run(() => api.patch(`/documents/${d.id}/meta`, { isPublic: !d.isPublic }))}>
                Tornar {d.isPublic ? 'privado' : 'público'}
              </button>
            </div>

            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Definir validade</label>
                <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </div>
              <button className="secondary" onClick={() => run(() => api.patch(`/documents/${d.id}/meta`, { validUntil: validity }))}>Salvar validade</button>
              <div style={{ flex: 1 }}>
                <label>Estado de renovação</label>
                <select value={renewal} onChange={(e) => setRenewal(e.target.value)}>
                  <option>Renovado</option><option>Não renovado</option><option>Reverter</option>
                </select>
              </div>
              <button className="secondary" onClick={() => run(() => api.post(`/documents/${d.id}/renewal`, { state: renewal }))}>Aplicar</button>
            </div>

            <h3 style={{ marginTop: 16 }}>Histórico do documento</h3>
            <table>
              <thead><tr><th>Data</th><th>Ação</th><th>Justificativa</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}><td style={{ fontSize: 12 }}>{new Date(l.createdAt).toLocaleString('pt-BR')}</td><td>{l.action}</td><td>{l.reason}</td></tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={3} className="help">Sem histórico.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
