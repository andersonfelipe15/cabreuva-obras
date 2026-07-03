# Deploy no Railway — passo a passo

O projeto já está pronto: **um único serviço** (o backend serve o site + a API), com
`Dockerfile`, `railway.json` e o certificado A1 lido de variável de ambiente.

## 1. Login (você faz — abre o navegador)
No terminal, dentro da pasta do projeto, rode:
```
railway login
```
Vai abrir o navegador para você entrar/criar a conta Railway. (Plano Hobby ~US$5/mês.)

## 2. Criar o projeto e o banco (no site do Railway — https://railway.app)
1. **New Project** → dê um nome (ex.: `cabreuva-licenciamento`).
2. Dentro do projeto: **+ New** → **Database** → **Add PostgreSQL**.
3. **+ New** → **Empty Service** (será o app) — ou o Railway cria ao fazer o deploy.

## 3. Variáveis de ambiente (no serviço do app → aba "Variables")
Adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao banco do projeto) |
| `JWT_SECRET` | `1e18e2c822bce76a13654692ab8a1a08785726f1c70d1d76113982d97d115010` |
| `JWT_EXPIRES_IN` | `8h` |
| `PUBLIC_URL` | a URL pública do serviço (ex.: `https://cabreuva-licenciamento.up.railway.app`) — pegue em Settings → Networking → Generate Domain |
| `RESEND_API_KEY` | sua chave do Resend (`re_...`) |
| `RESEND_FROM` | `nao-responder@cabreuvadev.online` |
| `ANTHROPIC_API_KEY` | sua chave da Claude (opcional; sem ela, IA fica simulada) |
| `SIGN_CERT_PATH` | `./certs/brito-a1.pfx` |
| `SIGN_CERT_PASSWORD` | a senha do seu certificado A1 |
| `SIGN_CERT_BASE64` | o conteúdo do `.pfx` em base64 (veja abaixo) |
| `ALLOW_SIMULATED_SSO` | `false` |

### Gerar o SIGN_CERT_BASE64 (rode você, no terminal do projeto)
```
base64 -w0 backend/certs/brito-a1.pfx
```
Copie a saída (uma linha enorme) e cole no valor de `SIGN_CERT_BASE64`.
Assim o certificado não precisa ir para o Git/imagem — o sistema o grava no boot.

## 4. Fazer o deploy
Com o serviço criado e as variáveis setadas, no terminal:
```
railway up
```
(Ele envia o código, o Railway constrói pelo Dockerfile e sobe.)
Ou, se preferir, conecte um repositório GitHub em Settings → Source.

## 5. Domínio
- Em **Settings → Networking → Generate Domain** para ter a URL pública.
- Depois, se quiser, aponte `sistema.cabreuvadev.online` (na GoDaddy, um CNAME para a URL do Railway) e configure em **Custom Domain**.
- **Importante:** ajuste `PUBLIC_URL` para a URL final (para os links de e-mail e o QR ficarem corretos).

## Observações
- O banco começa vazio; o container roda `prisma db push` + `seed` no boot (cria admin, perfis e assuntos de teste). Logins de teste: admin@cabreuva.sp.gov.br / admin123.
- Trocar `ALLOW_SIMULATED_SSO=false` desliga o login gov.br simulado (recomendado em produção).
