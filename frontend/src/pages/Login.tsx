import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function Login() {
  const { login, loginFederated, loginCertificate } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('requerente@teste.com');
  const [password, setPassword] = useState('requerente123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPass, setCertPass] = useState('');

  const [needsActivation, setNeedsActivation] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsActivation(false);
    setLoading(true);
    try {
      await login(email, password);
      nav('/catalog');
    } catch (err) {
      const m = (err as Error).message;
      setError(m);
      // E-mail não confirmado → oferece reenvio do link de ativação (req. 4).
      if (/confirmad/i.test(m)) setNeedsActivation(true);
    } finally {
      setLoading(false);
    }
  }

  async function resendActivation() {
    try {
      await api.post('/auth/resend-activation', { email });
      alert('Se a conta existir e estiver pendente, reenviamos o link de ativação para o e-mail.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // "Esqueci minha senha" — redefinição exclusivamente via validação por e-mail (item 5).
  async function forgot() {
    const mail = window.prompt('Informe o e-mail da conta:');
    if (!mail) return;
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: mail });
      alert('Se o e-mail estiver cadastrado, enviamos um link de redefinição. Verifique sua caixa de entrada (válido por 1 hora).');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Login gov.br (req. 6) — mecanismo federado (simulado até credenciais reais do órgão).
  async function federated(provider: string) {
    const document = window.prompt(
      `Autenticação ${provider} (simulada) — informe o CPF cadastrado:`,
    );
    if (!document) return;
    setError('');
    setLoading(true);
    try {
      await loginFederated(document, provider);
      nav('/catalog');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Login por certificado ICP-Brasil A1 real (req. 6).
  async function certificateLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!certFile) { setError('Selecione o arquivo do certificado A1 (.pfx/.p12).'); return; }
    setError('');
    setLoading(true);
    try {
      const pfxBase64 = await fileToBase64(certFile);
      const cert = await loginCertificate(pfxBase64, certPass);
      if (cert) alert(`Autenticado por certificado ICP-Brasil.\nTitular: ${cert.titular}\nDocumento: ${cert.documento}\nEmissor: ${cert.emissor}`);
      nav('/catalog');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 400 }}>
      <div className="card">
        <h1>Entrar</h1>
        <form onSubmit={submit}>
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
          {needsActivation && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="secondary" onClick={resendActivation}>Reenviar link de ativação</button>
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <button type="button" className="secondary" style={{ padding: '6px 10px', fontSize: 13 }} onClick={forgot}>Esqueci minha senha</button>
          </div>
        </form>
        <div style={{ borderTop: '1px solid #d8dee4', marginTop: 16, paddingTop: 12 }}>
          <p className="help" style={{ marginTop: 0 }}><strong>Autenticação avançada</strong> (req. 6)</p>

          {/* Certificado ICP-Brasil A1 — real */}
          <form onSubmit={certificateLogin}>
            <label>Entrar com certificado ICP-Brasil (A1)</label>
            <input type="file" accept=".pfx,.p12" onChange={(e) => setCertFile(e.target.files?.[0] ?? null)} />
            <input type="password" placeholder="Senha do certificado" value={certPass}
              onChange={(e) => setCertPass(e.target.value)} style={{ marginTop: 6 }} />
            <button type="submit" className="secondary" disabled={loading || !certFile} style={{ marginTop: 6 }}>
              🔐 Entrar com certificado A1
            </button>
          </form>

          {/* gov.br — mecanismo federado */}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="secondary" disabled={loading} onClick={() => federated('GOVBR')}>Entrar com gov.br</button>
            <p className="help" style={{ marginTop: 6, fontSize: 11 }}>
              gov.br: mecanismo demonstrativo — a federação de produção usa credenciais do órgão.
              O certificado A1 é validado de verdade (cadeia ICP-Brasil).
            </p>
          </div>
        </div>
        <p style={{ marginTop: 16 }}>
          Não tem conta? <Link to="/register">Criar conta</Link>
        </p>
        <p className="help" style={{ marginTop: 4 }}>
          Teste: admin@cabreuva.sp.gov.br / analista@cabreuva.sp.gov.br / requerente@teste.com
        </p>
      </div>
    </div>
  );
}
