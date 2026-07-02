import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DynamicForm, FormDefinition } from '../DynamicForm';

interface ProcessType {
  id: string;
  name: string;
  requiresLink?: boolean;
  formDefinition: FormDefinition;
}

interface Linkable {
  id: string;
  number: string;
  formData?: Record<string, unknown>;
  processType: { name: string };
}

export function Protocol() {
  const { id } = useParams();
  const nav = useNavigate();
  const [type, setType] = useState<ProcessType | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<Record<string, unknown> | null>(null);
  const [linkable, setLinkable] = useState<Linkable[]>([]);
  const [linkedToId, setLinkedToId] = useState('');
  const [linkSearch, setLinkSearch] = useState('');

  // Rascunhos de protocolo com salvamento automático (req. 56).
  const draftKey = `process-draft:${id}`;
  const loadDraft = (): Record<string, unknown> => {
    try { const r = localStorage.getItem(draftKey); return r ? JSON.parse(r) : {}; } catch { return {}; }
  };
  const [savedAt, setSavedAt] = useState<string>(() => (loadDraft() && Object.keys(loadDraft()).length ? 'recuperado' : ''));
  const [formKey, setFormKey] = useState(0);
  function discardDraft() {
    localStorage.removeItem(draftKey);
    setSavedAt('');
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    api.get<ProcessType>(`/process-types/${id}`).then((t) => {
      setType(t);
      if (t.requiresLink) {
        api.get<Linkable[]>('/processes/linkable').then(setLinkable);
      }
    }).catch((e) => setError(e.message));
  }, [id]);

  async function confirm() {
    setError('');
    try {
      const res = await api.post<{ number: string }>('/processes/protocol', {
        processTypeId: id,
        formData: confirming,
        linkedToId: type?.requiresLink ? linkedToId : undefined,
      });
      localStorage.removeItem(draftKey); // rascunho consumido (req. 56)
      alert(`Processo protocolado com sucesso!\nNúmero: ${res.number}`);
      nav('/mine');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!type) return <div>{error ? <div className="error">{error}</div> : 'Carregando...'}</div>;

  if (confirming) {
    return (
      <div>
        <h1>Confirmar protocolo</h1>
        <div className="card">
          <p>Revise os dados antes de efetivar a abertura do processo:</p>
          {type.requiresLink && (
            <p className="help">
              Vinculado ao processo:{' '}
              {linkable.find((l) => l.id === linkedToId)?.number ?? '—'}
            </p>
          )}
          <table>
            <tbody>
              {Object.entries(confirming).map(([k, v]) => (
                <tr key={k}><th>{k}</th><td>{JSON.stringify(v)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <div className="error">{error}</div>}
        <button onClick={confirm}>Confirmar e protocolar</button>{' '}
        <button className="secondary" onClick={() => setConfirming(null)}>Voltar e editar</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{type.name}</h1>
      {error && <div className="error">{error}</div>}

      {type.requiresLink && (
        <div className="card">
          <h2>Processo a renovar</h2>
          <p className="help">Selecione o alvará deferido que será renovado. Os dados serão reaproveitados.</p>
          <input placeholder="🔎 Buscar por número/código do processo..." value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)} style={{ marginBottom: 6 }} />
          <select value={linkedToId} onChange={(e) => setLinkedToId(e.target.value)}>
            <option value="">Selecione...</option>
            {linkable
              .filter((l) => l.number.toLowerCase().includes(linkSearch.trim().toLowerCase()))
              .map((l) => (
                <option key={l.id} value={l.id}>{l.number} — {l.processType.name}</option>
              ))}
          </select>
          {linkable.length === 0 && (
            <p className="help">Você não possui processos deferidos elegíveis para renovação.</p>
          )}
        </div>
      )}

      <div className="card">
        {savedAt && (
          <div className="help" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span>
              💾 {savedAt === 'recuperado'
                ? 'Rascunho recuperado — continue de onde parou.'
                : `Rascunho salvo automaticamente às ${savedAt}.`}
            </span>
            <button type="button" className="secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={discardDraft}>
              Descartar rascunho
            </button>
          </div>
        )}
        {type.requiresLink && linkedToId && (
          <p className="help">✅ Dados do processo {linkable.find((l) => l.id === linkedToId)?.number} reaproveitados abaixo — revise e edite antes de protocolar (req. 116).</p>
        )}
        <DynamicForm
          key={`${formKey}-${linkedToId}`}
          definition={type.formDefinition}
          initialValues={{ ...(type.requiresLink && linkedToId ? (linkable.find((l) => l.id === linkedToId)?.formData ?? {}) : {}), ...loadDraft() }}
          submitLabel="Revisar e protocolar"
          onChange={(v) => {
            if (Object.keys(v).length) {
              localStorage.setItem(draftKey, JSON.stringify(v));
              setSavedAt(new Date().toLocaleTimeString('pt-BR'));
            }
          }}
          onSubmit={(values) => {
            if (type.requiresLink && !linkedToId) {
              alert('Selecione o processo a ser renovado.');
              return;
            }
            setConfirming(values);
          }}
        />
      </div>
    </div>
  );
}
