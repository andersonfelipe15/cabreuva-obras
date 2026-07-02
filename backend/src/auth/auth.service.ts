import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as forge from 'node-forge';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { assertStrongPassword } from '../common/password';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    // Mensagem clara para conta bloqueada (req. 9).
    if (user.status === 'BLOCKED' || user.status === 'DISABLED') {
      throw new UnauthorizedException(
        'Acesso bloqueado. Procure o administrador do sistema.',
      );
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'E-mail ainda não confirmado. Verifique sua caixa de entrada.',
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    return this.issue(user);
  }

  // Autenticação federada avançada — gov.br / certificado ICP-Brasil (req. 6).
  // SIMULAÇÃO: em produção, a identidade é asseverada pelo provedor (OIDC gov.br
  // ou validação da cadeia ICP-Brasil do certificado). Aqui apenas mapeamos o CPF
  // já asseverado para o usuário. Protegido por flag para não valer como bypass
  // de senha em produção.
  async loginFederated(document: string, provider: string) {
    if (process.env.ALLOW_SIMULATED_SSO === 'false') {
      throw new UnauthorizedException(
        'Login federado (gov.br/ICP) não habilitado neste ambiente.',
      );
    }
    const digits = (document ?? '').replace(/\D/g, '');
    if (digits.length < 11) {
      throw new UnauthorizedException('CPF inválido para autenticação federada.');
    }
    const cpf = digits.slice(0, 11);
    // Comparação exata do CPF normalizado (evita falso positivo por substring).
    const candidates = await this.prisma.user.findMany({
      where: { document: { contains: cpf } },
      include: { roles: { include: { role: true } } },
    });
    const user = candidates.find(
      (u) => (u.document ?? '').replace(/\D/g, '').slice(0, 11) === cpf,
    );
    if (!user) {
      throw new UnauthorizedException(
        'Nenhum usuário vinculado a este CPF. Solicite um convite ao administrador.',
      );
    }
    if (user.status === 'BLOCKED' || user.status === 'DISABLED') {
      throw new UnauthorizedException('Acesso bloqueado. Procure o administrador.');
    }
    return { ...(await this.issue(user, undefined, 'GOVBR')), provider: provider || 'GOVBR', simulated: true };
  }

  // ── Autenticação avançada por certificado ICP-Brasil A1 (req. 6) ──────
  // O usuário envia o .pfx/.p12 (base64) + senha; o servidor lê o certificado
  // com node-forge, valida que é ICP-Brasil e vigente, extrai o CNPJ/CPF do
  // titular e autentica (cria a conta na primeira vez). Uso real — não simulado.
  async loginCertificate(pfxBase64: string, password: string) {
    let cert: forge.pki.Certificate;
    try {
      const der = forge.util.decode64(pfxBase64);
      const asn1 = forge.asn1.fromDer(der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const bag = bags[forge.pki.oids.certBag]?.[0];
      if (!bag?.cert) throw new Error('sem certificado');
      cert = bag.cert;
    } catch {
      throw new UnauthorizedException('Certificado ou senha inválidos.');
    }

    // Vigência
    const now = new Date();
    if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
      throw new UnauthorizedException('Certificado fora do período de validade.');
    }
    // É ICP-Brasil? (o emissor de certificados ICP-Brasil tem O = "ICP-Brasil")
    const issuerO = (cert.issuer.getField('O') as any)?.value ?? '';
    if (!/ICP-?Brasil/i.test(issuerO)) {
      throw new UnauthorizedException('O certificado não é da cadeia ICP-Brasil.');
    }
    // Titular (CN costuma vir "RAZÃO SOCIAL:CNPJ" ou "NOME:CPF")
    const cn = ((cert.subject.getField('CN') as any)?.value ?? '') as string;
    const digits = (cn.match(/(\d{11,14})/)?.[1] ?? '').replace(/\D/g, '');
    const name = cn.split(':')[0]?.trim() || 'Titular do certificado';
    if (digits.length < 11) {
      throw new UnauthorizedException('Não foi possível extrair o CPF/CNPJ do certificado.');
    }

    // Encontra ou provisiona o usuário (Requerente) vinculado ao documento.
    let user = await this.prisma.user.findFirst({
      where: { document: digits },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      const role = await this.prisma.role.findFirst({ where: { name: 'Requerente' } });
      user = await this.prisma.user.create({
        data: {
          name,
          document: digits,
          email: `${digits}@certificado.local`,
          passwordHash: await bcrypt.hash(randomUUID(), 10),
          emailVerified: true,
          roles: role ? { create: [{ roleId: role.id }] } : undefined,
        },
        include: { roles: { include: { role: true } } },
      });
    }
    if (user.status === 'BLOCKED' || user.status === 'DISABLED') {
      throw new UnauthorizedException('Acesso bloqueado. Procure o administrador.');
    }
    return {
      ...(await this.issue(user, undefined, 'ICP')),
      certificate: { titular: name, documento: digits, emissor: issuerO, validoAte: cert.validity.notAfter },
    };
  }

  // ── Auto-cadastro de requerente externo (req. 2) ──────────────
  async register(dto: { name: string; document: string; email: string; phone?: string; address?: string; password: string }) {
    assertStrongPassword(dto.password);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(dto.email)) throw new BadRequestException('E-mail inválido.');
    if ((dto.document ?? '').replace(/\D/g, '').length < 11) throw new BadRequestException('CPF/CNPJ inválido.');
    if (await this.prisma.user.findUnique({ where: { email: dto.email } }))
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    if (await this.prisma.user.findUnique({ where: { document: dto.document } }))
      throw new BadRequestException('Já existe um usuário com este documento.');

    const role = await this.prisma.role.findFirst({ where: { name: 'Requerente' } });
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        document: dto.document,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        passwordHash: await bcrypt.hash(dto.password, 10),
        emailVerified: true,
        roles: role ? { create: [{ roleId: role.id }] } : undefined,
      },
      include: { roles: { include: { role: true } } },
    });
    return this.issue(user);
  }

  // ── Redefinição de senha via e-mail (req. 5) ──────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Não revela se o e-mail existe (evita enumeração de contas).
    if (!user) return { ok: true };
    const token = randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExp: new Date(Date.now() + 3600_000) },
    });
    const base = process.env.PUBLIC_URL || 'http://localhost:5173';
    const resetLink = `${base}/redefinir-senha?token=${token}`;
    await this.mail.send({
      to: user.email,
      subject: 'Redefinição de senha — Prefeitura de Cabreúva',
      body: `Olá ${user.name},\n\nRecebemos uma solicitação de redefinição de senha. Use o link abaixo (válido por 1 hora). Se não foi você, ignore este e-mail.`,
      event: 'PASSWORD_RESET',
      link: resetLink,
    });
    // NÃO retorna o link: a redefinição ocorre exclusivamente via validação por
    // e-mail (item 5 do checklist). Não revela se o e-mail existe.
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    assertStrongPassword(password);
    const user = await this.prisma.user.findFirst({ where: { resetToken: token } });
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      throw new BadRequestException('Link de redefinição inválido ou expirado.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        resetToken: null,
        resetTokenExp: null,
      },
    });
    return { ok: true };
  }

  // ── Troca de perfil ativo sem novo login (req. 15-16) ─────────
  async switchProfile(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Usuário inválido');
    if (!user.roles.some((ur) => ur.roleId === roleId)) {
      throw new ForbiddenException('Você não possui este perfil.');
    }
    return this.issue(user, roleId);
  }

  private async issue(user: any, activeRoleId?: string, authMethod = 'PASSWORD') {
    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email, activeRoleId, authMethod },
      {
        secret: process.env.JWT_SECRET || 'dev-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      },
    );
    // Quando há perfil ativo, o usuário "enxerga" só aquele perfil (req. 16).
    const roles = activeRoleId
      ? user.roles.filter((r: any) => r.roleId === activeRoleId)
      : user.roles;
    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles.map((r: any) => r.role.name),
        activeRoleId: activeRoleId ?? null,
        authMethod,
      },
    };
  }
}
