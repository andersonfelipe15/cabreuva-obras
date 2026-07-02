import { useCallback, useEffect, useState } from 'react';
import { api, getToken, uploadFile } from './api';

interface Sub {
  id: string;
  status: string;
  justification: string;
  newFileId: string;
  fieldKey?: string | null;
  decisionReason?: string | null;
  createdAt: string;
}

const LABEL: Record<string, string> = {
  PENDING: 'Aguardando análise',
  REVISION_REQUESTED: 'Revisão solicitada',
  CONFIRMED: 'Substituição confirmada',
  REJECTED: 'Recusada',
};
const BADGE: Record<string, string> = {
  PENDING: 'RETURNED',
  REVISION_REQUESTED: 'IN_ANALYSIS',
  CONFIRMED: 'DEFERRED',
  REJECTED: 'INDEFERRED',
};

async function openFile(fileId: string) {
  const res = await fetch(`/api/files/${fileId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.ok) window.open(URL.createObjectURL(await res.blob()), '_blank');
}

export function SubstitutionPanel({
  processId,
  isStaff,
  isOwner,
}: {
  processId: string;
  isStaff: boolean;
  isOwner: boolean;
}) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [error, setError] = useState('');
  const [justification, setJustification] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [newFile, setNewFile] = useState<{ id: string; filename: string } | null>(null);

  const load = useCallback(() => {
    api.get<Sub[]>(`/processes/${processId}/substitutions`).then(setSubs).catch((e) => setError(e.message));
  }, [processId]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  async function submit() {
    if (!newFile || !justification) {
      alert('Anexe a nova prancha e informe a justificativa.');
      return;
    }
    await run(async () => {
      await api.post(`/processes/${processId}/substitutions`, {
        newFileId: newFile.id, fieldKey: fieldKey || undefined, justification,
      });
      setNewFile(null); setJustification(''); setFieldKey('');
    });
  }

  function decide(id: string, decision: 'CONFIRM' | 'REVISION' | 'REJECT') {
    let reason: string | undefined;
    if (decision === 'REJECT') {
      const r = window.prompt('Justificativa da recusa (obrigatória):');
      if (!r) return;
      reason = r;
    } else if (decision === 'REVISION') {
      reason = window.prompt('Observações da revisão (opcional):') ?? undefined;
    }
    run(() => api.post(`/substitutions/${id}/decision`, { decision, reason }));
  }

  return (
    <div className="card">
      <h2>Substituição de pranchas</h2>
      <p className="help">Disponível para processos deferidos. A nova prancha só passa a vigente após confirmação do analista.</p>
      {error && <div className="error">{error}</div>}

      {subs.map((s) => (
        <div key={s.id} style={{ borderLeft: '3px solid #1f7a3d', paddingLeft: 12, marginBottom: 12 }}>
          <div>
            <span className={`badge ${BADGE[s.status]}`}>{LABEL[s.status] ?? s.status}</span>{' '}
            {s.status === 'CONFIRMED' && <span className="badge INDEFERRED">Prancha Substituída</span>}
          </div>
          <div className="help">{new Date(s.createdAt).toLocaleString('pt-BR')} · Justificativa: {s.justification}</div>
          {s.decisionReason && <div className="help">Decisão: {s.decisionReason}</div>}
          <button className="secondary" style={{ padding: '2px 6px', fontSize: 12, marginTop: 4 }}
            onClick={() => openFile(s.newFileId)}>Ver nova prancha</button>
          {isStaff && (s.status === 'PENDING' || s.status === 'REVISION_REQUESTED') && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => decide(s.id, 'CONFIRM')}>Confirmar</button>
              <button className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => decide(s.id, 'REVISION')}>Solicitar revisão</button>
              <button className="danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => decide(s.id, 'REJECT')}>Recusar</button>
            </div>
          )}
        </div>
      ))}
      {subs.length === 0 && <p className="help">Nenhuma substituição solicitada.</p>}

      {isOwner && (
        <div style={{ borderTop: '1px solid #d8dee4', paddingTop: 12, marginTop: 8 }}>
          <h3 style={{ marginTop: 0 }}>Solicitar substituição</h3>
          <label>Campo/prancha a substituir (ex.: projetoArquitetonico)</label>
          <input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} />
          <label>Nova prancha</label>
          <input type="file" accept="application/pdf,image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const up = await uploadFile(f); setNewFile({ id: up.id, filename: up.filename }); }
              catch (err) { alert((err as Error).message); }
            }} />
          {newFile && <div className="help">📎 {newFile.filename} (enviado)</div>}
          <label>Justificativa</label>
          <textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} />
          <div style={{ marginTop: 10 }}>
            <button onClick={submit}>Solicitar substituição</button>
          </div>
        </div>
      )}
    </div>
  );
}
