import { useEffect, useState } from 'react';
import { api } from '../api';

interface PType { id: string; code: string; name: string }

// Importação de processos de sistema/banco legado (req. 179).
export function ImportLegacy() {
  const [types, setTypes] = useState<PType[]>([]);
  const [json, setJson] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<PType[]>('/process-types/all').then(setTypes).catch(() => {});
  }, []);

  function sample() {
    const t = types[0];
    const model = [
      {
        processTypeId: t?.id ?? 'COLE-O-ID-DO-ASSUNTO',
        legacyNumber: '2019/000123',
        requesterEmail: 'requerente@teste.com',
        status: 'ARCHIVED',
        formData: { requerenteNome: 'Fulano (legado)', logradouro: 'Rua Antiga', numero: '10' },
      },
    ];
    setJson(JSON.stringify(model, null, 2));
  }

  async function importar() {
    setError(''); setResult(null);
    let items: any[];
    try {
      items = JSON.parse(json);
      if (!Array.isArray(items)) throw new Error('O JSON deve ser uma lista de processos.');
    } catch (e) {
      setError('JSON inválido: ' + (e as Error).message);
      return;
    }
    try {
      setResult(await api.post('/processes/import', { items }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Importação de Processos (legado)</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <p className="help">
          Cole uma lista JSON de processos do sistema anterior. Campos por item:
          <code> processTypeId</code> (obrigatório),
          <code> legacyNumber</code>, <code> requesterEmail</code> ou <code> requerenteDocument</code>,
          <code> status</code>, <code> formData</code>. O requerente é vinculado por e-mail/CPF quando existir.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="secondary" onClick={sample}>Preencher exemplo</button>
          <button onClick={importar} disabled={!json.trim()}>Importar</button>
        </div>
        <textarea rows={12} value={json} onChange={(e) => setJson(e.target.value)}
          placeholder='[ { "processTypeId": "...", "legacyNumber": "2019/000123", "formData": { } } ]'
          style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Assuntos disponíveis (IDs)</h2>
        <table>
          <thead><tr><th>Código</th><th>Nome</th><th>ID</th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}><td>{t.code}</td><td>{t.name}</td><td style={{ fontSize: 12 }}>{t.id}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="card" style={{ borderColor: '#16a34a' }}>
          <h2 style={{ marginTop: 0 }}>Resultado: {result.imported} de {result.total} importados</h2>
          <table>
            <thead><tr><th>Nº legado</th><th>Nº gerado</th><th>Erro</th></tr></thead>
            <tbody>
              {result.results.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.legacyNumber ?? '—'}</td>
                  <td>{r.number ?? '—'}</td>
                  <td style={{ color: '#b42318' }}>{r.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
