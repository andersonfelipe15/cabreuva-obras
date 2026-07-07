import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { maskCpfCnpj, validateCpfCnpj, onlyDigits } from '../cpfcnpj';

// Auto-cadastro de requerente externo (req. 2).
export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', document: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Validação de CPF/CNPJ em tempo real (máscara + quantidade de dígitos + verificadores).
  const docError = f.document ? validateCpfCnpj(f.document) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const dErr = validateCpfCnpj(f.document);
    if (dErr) { setError(dErr); return; }
    setLoading(true);
    try {
      // Envia o documento só com dígitos (consistente com a base e o login por CPF).
      await register({ ...f, document: onlyDigits(f.document) });
      setDone(true); // exige confirmação de e-mail antes do acesso (req. 3)
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <h1>Criar conta</h1>
        {done ? (
          <div className="card" style={{ borderColor: '#16a34a' }}>
            <p>✅ Cadastro recebido! Enviamos um <strong>link de ativação</strong> para <strong>{f.email}</strong>.</p>
            <p className="help">Confirme seu e-mail para liberar o acesso (o acesso só é autorizado após a confirmação). Não recebeu? Veja em Spam ou use "Reenviar link" na tela de login.</p>
            <Link to="/login">Ir para o login</Link>
          </div>
        ) : (
        <form onSubmit={submit}>
          <label>Nome / Razão Social</label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)} />
          <label>CPF / CNPJ</label>
          <input
            value={f.document}
            inputMode="numeric"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            onChange={(e) => set('document', maskCpfCnpj(e.target.value))}
            style={docError ? { borderColor: '#b42318' } : undefined}
          />
          {docError && <p className="help" style={{ color: '#b42318', marginTop: 2 }}>{docError}</p>}
          <label>E-mail</label>
          <input value={f.email} onChange={(e) => set('email', e.target.value)} />
          <div className="row">
            <div style={{ flex: 1 }}><label>Telefone</label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div style={{ flex: 2 }}><label>Endereço</label><input value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
          </div>
          <label>Senha</label>
          <input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} />
          <p className="help">Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.</p>
          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button disabled={loading || !f.name || !!docError || !f.email || !f.password}>{loading ? 'Criando...' : 'Criar conta'}</button>
            <Link to="/login">Já tenho conta</Link>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
