import { useState } from 'react';
import { api } from './api';

// Módulo XII — conferência documental por IA (upload → extração de dados).
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function AiDocCheck() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expectedType, setExpectedType] = useState('');
  const [feedback, setFeedback] = useState('');

  async function sendFeedback(correct: boolean) {
    try {
      await api.post('/ai/feedback', {
        correct,
        expectedType: expectedType || undefined,
        note: (result?.tipoDocumento ? `Tipo detectado: ${result.tipoDocumento}` : undefined),
      });
      setFeedback(correct ? 'Obrigado! Marcado como correto.' : 'Obrigado! Marcado como impreciso — usaremos para melhorar.');
    } catch (e) {
      setFeedback('Não foi possível registrar o feedback.');
    }
  }

  async function onFile(file: File) {
    setLoading(true);
    setError('');
    setResult(null);
    setFeedback('');
    try {
      const base64 = await toBase64(file);
      const res = await api.post<any>('/ai/extract', {
        fileBase64: base64,
        mimeType: file.type || 'image/png',
        expectedType: expectedType || undefined,
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Conferência documental (IA)</h2>
      <p className="help">
        Envie uma imagem ou PDF de um documento (RG, CNH, Cartão CNPJ, matrícula, etc.).
        A IA extrai os dados e verifica a correspondência com o tipo esperado.
      </p>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label>Tipo esperado (opcional)</label>
          <input
            placeholder="Ex.: RG, Matricula, CartaoCNPJ"
            value={expectedType}
            onChange={(e) => setExpectedType(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Documento</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      </div>

      {loading && <p className="help">Analisando documento com IA...</p>}
      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 12 }}>
          {result.erro ? (
            <div className="error">{result.erro}</div>
          ) : (
            <table>
              <tbody>
                {Object.entries(result).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{Array.isArray(v) ? v.join('; ') : String(v ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!result.erro && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="help">A extração está correta?</span>
              <button className="secondary" style={{ padding: '2px 10px' }} onClick={() => sendFeedback(true)}>👍 Sim</button>
              <button className="secondary" style={{ padding: '2px 10px' }} onClick={() => sendFeedback(false)}>👎 Não</button>
              {feedback && <span className="help">{feedback}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
