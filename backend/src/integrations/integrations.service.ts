import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.integration.findMany({ orderBy: { name: 'asc' } });
  }
  findOne(id: string) {
    return this.prisma.integration.findUnique({ where: { id } });
  }
  create(data: Prisma.IntegrationCreateInput) {
    return this.prisma.integration.create({ data });
  }
  update(id: string, data: Prisma.IntegrationUpdateInput) {
    return this.prisma.integration.update({ where: { id }, data });
  }
  setEnabled(id: string, enabled: boolean) {
    return this.prisma.integration.update({ where: { id }, data: { enabled } });
  }
  remove(id: string) {
    return this.prisma.integration.delete({ where: { id } });
  }

  // Resolve o cabeçalho de autenticação (Basic ou OAuth2 password grant) — req. 172-173.
  private async resolveAuthHeader(integration: any): Promise<string | null> {
    if (integration.authType === 'BASIC') {
      const c = integration.authConfig || {};
      const token = Buffer.from(`${c.username}:${c.password}`).toString('base64');
      return `Basic ${token}`;
    }
    if (integration.authType === 'OAUTH2') {
      const c = integration.authConfig || {};
      const form = new URLSearchParams();
      form.set('grant_type', c.grantType || 'password');
      if (c.username) form.set('username', c.username);
      if (c.password) form.set('password', c.password);
      if (c.scope) form.set('scope', c.scope);
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      if (c.clientAuthType === 'basic') {
        headers.Authorization =
          'Basic ' + Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64');
      } else {
        if (c.clientId) form.set('client_id', c.clientId);
        if (c.clientSecret) form.set('client_secret', c.clientSecret);
      }
      const tokRes = await fetch(c.tokenUrl, { method: 'POST', headers, body: form });
      if (!tokRes.ok) {
        throw new BadRequestException('Falha ao obter token OAuth2');
      }
      const tok: any = await tokRes.json();
      const prefix = c.headerPrefix || 'Bearer';
      return `${prefix} ${tok.access_token}`;
    }
    return null;
  }

  // Executa a integração com os parâmetros informados (req. 170-171, 174-175, 180).
  async execute(id: string, params: Record<string, string> = {}) {
    const integration = await this.prisma.integration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Integração não encontrada');
    if (!integration.enabled) throw new BadRequestException('Integração desabilitada');

    const method = (integration.method || 'GET').toUpperCase();

    // Monta a URL com query params (para GET).
    let url = integration.url;
    if (method === 'GET' && Object.keys(params).length) {
      const qs = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }

    // Headers configurados (req. 175) + autenticação.
    const headers: Record<string, string> = {};
    for (const h of (integration.headers as any[]) ?? []) {
      if (h?.key) headers[h.key] = h.value ?? '';
    }
    const authHeader = await this.resolveAuthHeader(integration);
    if (authHeader) headers.Authorization = authHeader;

    // Corpo (req. 174).
    let body: string | undefined;
    if (method !== 'GET' && integration.bodyType === 'RAW_JSON' && integration.body) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      body = integration.body;
    }

    const started = Date.now();
    let status: number;
    let data: any;
    try {
      const res = await fetch(url, { method, headers, body });
      status = res.status;
      const ct = res.headers.get('content-type') || '';
      data = ct.includes('json') ? await res.json() : await res.text();
    } catch (e) {
      throw new BadRequestException(
        'Erro ao chamar o serviço externo: ' + (e as Error).message,
      );
    }

    return {
      url,
      method,
      status,
      elapsedMs: Date.now() - started,
      titleProp: integration.titleProp,
      keyProp: integration.keyProp,
      data,
    };
  }
}
