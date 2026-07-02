import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, getToken } from '../api';
import { useAuth } from '../auth';
import { AiDocCheck } from '../AiDocCheck';
import { DispatchTimeline } from '../DispatchTimeline';
import { FeesPanel } from '../FeesPanel';
import { SubstitutionPanel } from '../SubstitutionPanel';
import { ModeratorsPanel, AcceptancePanel, ScheduledPanel } from '../WorkflowPanels';

interface ChecklistItem { key: string; label: string; fieldRef?: string; required?: boolean }
interface Detail {
  id: string;
  number: string;
  status: string;
  formData: Record<string, unknown>;
  processType: { name: string; accessLevel?: string; processActions?: string[]; analysisChecklist?: { items: ChecklistItem[] } };
  requester: { id: string; name: string; document: string; email: string };
  movements: { id: string; type: string; content: any; createdAt: string; user: { name: string } }[];
  documents: { id: string; number: string; type: string; status: string; validationCode: string; signed: boolean }[];
  analyses: { id: string; items: { label: string; ok: boolean; note?: string; fieldRef?: string }[]; conclusion?: string | null; createdAt: string; analyst: { name: string } }[];
}

// Baixa o relatório do processo com as seções e a versão escolhidas (req. 183-186).
async function openProcessReport(id: string, opts: Record<string, boolean>, version?: string) {
  const p = new URLSearchParams();
  Object.entries(opts).forEach(([k, v]) => v && p.set(k, 'true'));
  if (version !== undefined && version !== '') p.set('version', version);
  const res = await fetch(`/api/reports/process/${id}.pdf?${p}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.ok) window.open(URL.createObjectURL(await res.blob()), '_blank');
  else alert('Erro ao gerar relatório');
}

// Abre o PDF em nova aba enviando o token JWT (fetch autenticado → blob).
function isFileValue(v: unknown): boolean {
  return !!v && typeof v === 'object' && 'fileId' in (v as object);
}

// Anexo real: ver (download autenticado) + analisar com IA (Módulo XII).
function FileValue({
  value,
  isStaff,
}: {
  value: { fileId: string; filename: string };
  isStaff: boolean;
}) {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function open() {
    const res = await fetch(`/api/files/${value.fileId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), '_blank');
    else alert('Erro ao abrir o anexo');
  }
  async function analyze() {
    setBusy(true);
    try {
      setResult(await api.post(`/files/${value.fileId}/analyze`, {}));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      📎 {value.filename}{' '}
      <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }} onClick={open}>Ver</button>{' '}
      {value.filename?.toLowerCase().endsWith('.pdf') && (
        <a href={`/viewer/${value.fileId}`} target="_blank">
          <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }}>Medir (PDF)</button>
        </a>
      )}{' '}
      {isStaff && (
        <button className="secondary" style={{ padding: '2px 6px', fontSize: 12 }} disabled={busy} onClick={analyze}>
          {busy ? 'Analisando...' : 'Analisar (IA)'}
        </button>
      )}
      {result && <div className="help" style={{ marginTop: 4 }}>{JSON.stringify(result)}</div>}
    </div>
  );
}

async function openPdf(docId: string) {
  const res = await fetch(`/api/documents/${docId}/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    alert('Erro ao gerar o PDF');
    return;
  }
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

// Baixa um pacote ZIP com os atos escolhidos (req. 113).
async function downloadZip(ids: string[]) {
  if (ids.length === 0) { alert('Selecione ao menos um ato.'); return; }
  const res = await fetch(`/api/documents/zip?ids=${ids.join(',')}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) { alert('Erro ao gerar o pacote'); return; }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = 'atos.zip'; a.click();
}

export function ProcessDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isStaff = user?.roles.some((r) => r === 'Analista' || r === 'Administrador');
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [conclusion, setConclusion] = useState('');
  const [reason, setReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [rep, setRep] = useState({ history: true, analyses: true, dispatches: true, documents: true });
  const [reportVersion, setReportVersion] = useState('');
  // Tramitação (req. 80/81) e campos corrigíveis (req. 139).
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [fwdSector, setFwdSector] = useState('');
  const [fwdNote, setFwdNote] = useState('');
  const [shareSectors, setShareSectors] = useState<string[]>([]);
  const [correctable, setCorrectable] = useState<string[]>([]);
  const [zipSel, setZipSel] = useState<string[]>([]);

  const load = useCallback(() => {
    api.get<Detail>(`/processes/${id}`).then(setP).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (isStaff) api.get<{ id: string; name: string }[]>('/sectors').then(setSectors).catch(() => {});
  }, [isStaff]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  if (!p) return <div>{error ? <div className="error">{error}</div> : 'Carregando...'}</div>;
  const checklist = p.processType.analysisChecklist?.items ?? [];
  // Nível de acesso do destinatário definido no protocolo (req. 42-47).
  const level = p.processType.accessLevel ?? 'COMPLETO';
  const canInteract = level !== 'VISUALIZACAO';
  const canDecide = level === 'COMPLETO';
  // Ações processuais habilitadas por assunto (req. 44). Vazio = todas.
  const pa = p.processType.processActions ?? [];
  const actionOn = (a: string) => pa.length === 0 || pa.includes(a);
  const LEVEL_LABEL: Record<string, string> = {
    INTERMEDIARIO: 'Intermediário — análise e despachos permitidos; decisão final bloqueada.',
    VISUALIZACAO: 'Somente visualização — nenhuma ação processual permitida neste assunto.',
  };

  async function submitAnalysis() {
    const items = checklist.map((c) => ({
      key: c.key, label: c.label, ok: !!answers[c.key], note: notes[c.key], fieldRef: c.fieldRef,
    }));
    await run(() => api.post(`/processes/${id}/analyze`, { items, conclusion }));
  }

  return (
    <div>
      <h1>Processo {p.number}</h1>
      <p><span className={`badge ${p.status}`}>{p.status}</span> · {p.processType.name}</p>
      {error && <div className="error">{error}</div>}
      {isStaff && level !== 'COMPLETO' && (
        <div className="card" style={{ borderColor: '#b45309', background: '#fffbeb' }}>
          🔒 <strong>Nível de acesso:</strong> {LEVEL_LABEL[level]}
        </div>
      )}

      <div className="card">
        <h2>Requerente</h2>
        <p>{p.requester.name} · {p.requester.document} · {p.requester.email}</p>
      </div>

      {isStaff && canInteract && actionOn('FORWARD') && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Tramitação</h2>
          {/* Encaminhamento unilateral a um setor (req. 80) */}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label>Encaminhar para o setor</label>
              <select value={fwdSector} onChange={(e) => setFwdSector(e.target.value)}>
                <option value="">Selecione...</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label>Observação</label>
              <input value={fwdNote} onChange={(e) => setFwdNote(e.target.value)} />
            </div>
            <button disabled={!fwdSector}
              onClick={() => run(async () => { await api.post(`/processes/${id}/forward`, { toSectorId: fwdSector, note: fwdNote }); setFwdSector(''); setFwdNote(''); })}>
              Encaminhar
            </button>
          </div>

          {/* Ciência a múltiplas partes (req. 81) */}
          <label style={{ marginTop: 12 }}>Dar ciência a vários setores</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {sectors.map((s) => (
              <label key={s.id} style={{ fontWeight: 400 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 4 }}
                  checked={shareSectors.includes(s.id)}
                  onChange={() => setShareSectors((v) => v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id])} />
                {s.name}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="secondary" disabled={shareSectors.length === 0}
              onClick={() => run(async () => { await api.post(`/processes/${id}/share`, { sectorIds: shareSectors }); setShareSectors([]); })}>
              Compartilhar ciência ({shareSectors.length})
            </button>
          </div>
        </div>
      )}

      {isStaff && p.status === 'ARCHIVED' && (
        <div className="card" style={{ borderColor: '#b45309' }}>
          <h2 style={{ marginTop: 0 }}>Processo encerrado</h2>
          <label>Motivo do desarquivamento (obrigatório — req. 130)</label>
          <input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
          <div style={{ marginTop: 10 }}>
            <button disabled={!reopenReason.trim()}
              onClick={() => run(() => api.post(`/processes/${id}/reopen`, { reason: reopenReason }))}>
              Desarquivar
            </button>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="card">
          <h2>Relatório do processo</h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
            {([['history', 'Histórico'], ['analyses', 'Análises'], ['dispatches', 'Despachos'], ['documents', 'Documentos']] as [keyof typeof rep, string][]).map(([k, label]) => (
              <label key={k} style={{ fontWeight: 400 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={rep[k]} onChange={(e) => setRep({ ...rep, [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          {(() => {
            const versions = p.movements.filter((m) => m.type === 'CORRECTION').length + 1;
            if (versions <= 1) return null;
            return (
              <div style={{ marginBottom: 10 }}>
                <label>Versão dos dados do formulário</label>
                <select value={reportVersion} onChange={(e) => setReportVersion(e.target.value)} style={{ maxWidth: 260 }}>
                  <option value="">Versão atual ({versions} de {versions})</option>
                  {Array.from({ length: versions - 1 }).map((_, i) => (
                    <option key={i} value={i}>Versão {i + 1} de {versions}{i === 0 ? ' (protocolo)' : ''}</option>
                  ))}
                </select>
              </div>
            );
          })()}
          <button onClick={() => openProcessReport(p.id, rep, reportVersion)}>Gerar relatório (PDF)</button>
        </div>
      )}

      {p.analyses.length > 0 && (
        <div className="card">
          <h2>Análises técnicas realizadas</h2>
          {p.analyses.map((a) => (
            <div key={a.id} style={{ borderLeft: '3px solid #1f7a3d', paddingLeft: 12, marginBottom: 10 }}>
              <div className="help">{a.analyst.name} · {new Date(a.createdAt).toLocaleString('pt-BR')}</div>
              {a.items.map((it, i) => (
                <div key={i} style={{ fontSize: 14 }}>
                  [{it.ok ? '✓' : ' '}] {it.label}
                  {it.fieldRef && <span className="help"> (campo: {it.fieldRef})</span>}
                  {it.note && <span> — {it.note}</span>}
                </div>
              ))}
              {a.conclusion && <div style={{ marginTop: 4 }}><strong>Parecer:</strong> {a.conclusion}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Dados do formulário</h2>
        <table><tbody>
          {Object.entries(p.formData).map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>
                {isFileValue(v)
                  ? <FileValue value={v as any} isStaff={!!isStaff} />
                  : (typeof v === 'object' ? JSON.stringify(v) : String(v))}
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>

      {p.documents.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Documentos emitidos</h2>
            <button className="secondary" disabled={zipSel.length === 0} onClick={() => downloadZip(zipSel)}>
              📦 Baixar pacote ZIP ({zipSel.length})
            </button>
          </div>
          {p.documents.map((d) => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <p style={{ margin: '4px 0' }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 6 }}
                  checked={zipSel.includes(d.id)}
                  onChange={() => setZipSel((v) => v.includes(d.id) ? v.filter((x) => x !== d.id) : [...v, d.id])} />
                📄 <strong>{d.number}</strong> ({d.type}) —{' '}
                <span className={`badge ${d.status === 'VALID' ? 'DEFERRED' : 'INDEFERRED'}`}>{d.status}</span>{' '}
                {d.signed
                  ? <span className="badge DEFERRED">✔ Assinado</span>
                  : <span className="badge RETURNED">Não assinado</span>}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="secondary" onClick={() => openPdf(d.id)}>Ver PDF</button>
                {isStaff && !d.signed && (
                  <button onClick={() => run(() => api.post(`/documents/${d.id}/sign`))}>
                    Assinar (A1)
                  </button>
                )}
              </div>
              <div className="help" style={{ marginTop: 4 }}>
                Verificar autenticidade:{' '}
                <a href={`/api/verificar/${d.validationCode}`} target="_blank">/verificar/{d.validationCode}</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {isStaff && canInteract && p.status !== 'DEFERRED' && p.status !== 'INDEFERRED' && (
        <div className="card">
          <h2>Análise técnica</h2>
          {checklist.map((c) => (
            <div key={c.key} style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>
                <input type="checkbox" style={{ width: 'auto', marginRight: 8 }}
                  checked={!!answers[c.key]}
                  onChange={(e) => setAnswers((s) => ({ ...s, [c.key]: e.target.checked }))} />
                {c.label}{c.fieldRef && <span className="help"> (campo: {c.fieldRef})</span>}
              </label>
              <input placeholder="Observação / exigência" value={notes[c.key] ?? ''}
                onChange={(e) => setNotes((s) => ({ ...s, [c.key]: e.target.value }))} />
            </div>
          ))}
          <label>Parecer conclusivo</label>
          <textarea rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            <button onClick={submitAnalysis}>Registrar análise</button>
          </div>

          <hr style={{ margin: '20px 0' }} />
          <label>Motivo (devolução / indeferimento)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />

          {/* Campos que o requerente poderá corrigir na devolução (req. 139) */}
          {actionOn('RETURN') && (
            <div style={{ marginTop: 8 }}>
              <label>Campos corrigíveis pelo requerente</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.keys(p.formData).map((k) => (
                  <label key={k} style={{ fontWeight: 400 }}>
                    <input type="checkbox" style={{ width: 'auto', marginRight: 4 }}
                      checked={correctable.includes(k)}
                      onChange={() => setCorrectable((v) => v.includes(k) ? v.filter((x) => x !== k) : [...v, k])} />
                    {k}
                  </label>
                ))}
              </div>
              <p className="help">Se nenhum for marcado, o requerente poderá revisar todos os campos.</p>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {actionOn('RETURN') && (
              <button className="secondary" onClick={() => run(() => api.post(`/processes/${id}/return`, { reason, correctableFields: correctable }))}>
                Devolver p/ correção
              </button>
            )}
            {canDecide && actionOn('DEFER') && (
              <button onClick={() => run(() => api.post(`/processes/${id}/defer`, {}))}>Deferir</button>
            )}
            {canDecide && actionOn('INDEFER') && (
              <button className="danger" onClick={() => run(() => api.post(`/processes/${id}/indefer`, { reason }))}>
                Indeferir
              </button>
            )}
            {actionOn('ARCHIVE') && p.status !== 'ARCHIVED' && (
              <button className="secondary" title="Informe o motivo no campo acima"
                onClick={() => run(() => api.post(`/processes/${id}/archive`, { reason }))}>
                Encerrar
              </button>
            )}
          </div>
        </div>
      )}

      <AcceptancePanel processId={p.id} isStaff={!!isStaff} />
      {isStaff && <ScheduledPanel processId={p.id} />}
      {isStaff && <ModeratorsPanel processId={p.id} />}

      <FeesPanel processId={p.id} isStaff={!!isStaff} isOwner={p.requester.id === user?.id} />

      {p.status === 'DEFERRED' && (
        <SubstitutionPanel processId={p.id} isStaff={!!isStaff} isOwner={p.requester.id === user?.id} />
      )}

      <DispatchTimeline processId={p.id} isStaff={!!isStaff} />

      {isStaff && <AiDocCheck />}

      <div className="card">
        <h2>Histórico / Tramitação</h2>
        {p.movements.map((m) => (
          <div key={m.id} style={{ borderLeft: '3px solid #1f7a3d', paddingLeft: 10, marginBottom: 10 }}>
            <strong>{m.type}</strong> — {m.user.name} · {new Date(m.createdAt).toLocaleString('pt-BR')}
            <div className="help">{JSON.stringify(m.content)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
