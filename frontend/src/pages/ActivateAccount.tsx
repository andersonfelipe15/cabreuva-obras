import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

// Ativação de conta via link do e-mail (req. 3).
export function ActivateAccount() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) { setState('error'); setMsg('Link inválido: token ausente.'); return; }
    api.post('/auth/activate', { token })
      .then(() => setState('ok'))
      .catch((e) => { setState('error'); setMsg((e as Error).message); });
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <h1>Ativação de conta</h1>
        {state === 'loading' && <p>Confirmando seu e-mail...</p>}
        {state === 'ok' && (
          <div className="card" style={{ borderColor: '#16a34a' }}>
            <p>✅ E-mail confirmado! Sua conta está ativa.</p>
            <Link to="/login">Entrar agora</Link>
          </div>
        )}
        {state === 'error' && (
          <div className="error">{msg} — solicite um novo link em "Reenviar link de ativação" na tela de login.</div>
        )}
      </div>
    </div>
  );
}
