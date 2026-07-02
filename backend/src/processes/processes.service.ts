import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { validateSubmission, FormDefinition } from '../process-types/form-schema';
import type { AuthUser } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import {
  AnalyzeDto,
  CorrectDto,
  DecisionDto,
  DispatchDto,
  ForwardDto,
  ProtocolDto,
  ReturnDto,
} from './dto';

@Injectable()
export class ProcessesService {
  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
  ) {}

  // Dispara os gatilhos de integração SIG configurados para um evento (req. 181).
  private async fireTriggers(type: any, event: string, proc: any) {
    const triggers = (type?.triggers as { event: string; integrationId: string }[]) ?? [];
    for (const t of triggers.filter((x) => x.event === event && x.integrationId)) {
      try {
        await this.integrations.execute(t.integrationId, {
          numero: proc.number,
          processId: proc.id,
          evento: event,
        });
      } catch {
        /* gatilho é best-effort; não bloqueia o fluxo do processo */
      }
    }
  }

  private ensure(user: AuthUser, perm: string) {
    if (!user.permissions.includes(perm)) {
      throw new ForbiddenException(`Ação requer a permissão ${perm}`);
    }
  }

  // Nível de acesso do destinatário definido no protocolo (req. 42-48).
  // Lido do tipo de processo em tempo de execução, portanto uma alteração no
  // nível propaga imediatamente aos processos já protocolados (req. 48).
  private async ensureAccessLevel(
    processTypeId: string,
    action: 'INTERACT' | 'DECIDE',
  ) {
    const type = await this.prisma.processType.findUnique({
      where: { id: processTypeId },
      select: { accessLevel: true, name: true },
    });
    const level = type?.accessLevel ?? 'COMPLETO';
    if (level === 'VISUALIZACAO') {
      throw new ForbiddenException(
        `O assunto "${type?.name}" está configurado como "somente visualização": nenhuma ação processual é permitida.`,
      );
    }
    if (level === 'INTERMEDIARIO' && action === 'DECIDE') {
      throw new ForbiddenException(
        `O assunto "${type?.name}" tem nível "intermediário": análise e despachos são permitidos, mas a decisão final (deferir/indeferir) não.`,
      );
    }
  }

  // Ações processuais habilitadas por assunto (req. 44). Lista vazia = todas.
  private async ensureActionEnabled(
    processTypeId: string,
    action: 'FORWARD' | 'RETURN' | 'DEFER' | 'INDEFER' | 'ARCHIVE',
  ) {
    const type = await this.prisma.processType.findUnique({
      where: { id: processTypeId },
      select: { processActions: true, name: true },
    });
    const enabled = type?.processActions ?? [];
    if (enabled.length > 0 && !enabled.includes(action)) {
      throw new ForbiddenException(
        `A ação "${action}" não está habilitada para o assunto "${type?.name}".`,
      );
    }
  }

  // Gera número no formato AAAA/NNNNNN.
  private async nextNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.process.count({
      where: { number: { startsWith: `${year}/` } },
    });
    return `${year}/${String(count + 1).padStart(6, '0')}`;
  }

  // ── Protocolo digital (Módulo IV) ─────────────────────────────
  async protocol(user: AuthUser, dto: ProtocolDto) {
    this.ensure(user, PERMISSIONS.PROCESS_PROTOCOL);

    const type = await this.prisma.processType.findUnique({
      where: { id: dto.processTypeId },
    });
    if (!type) throw new NotFoundException('Tipo de processo não encontrado');
    if (!type.enabled)
      throw new BadRequestException('Este assunto não está disponível.');

    // Protocolo restrito a perfis configurados por assunto (req. 7). Vazio = qualquer um.
    const allowedRoles = type.protocolRoleIds ?? [];
    if (allowedRoles.length > 0 && !allowedRoles.some((r) => user.roleIds.includes(r))) {
      throw new ForbiddenException(
        'Seu perfil não está autorizado a protocolar este assunto.',
      );
    }

    // Autenticação avançada exigida por classe de processo (req. 6).
    const req = (type as any).requiredAuth ?? 'NONE';
    if (req === 'ICP' && user.authMethod !== 'ICP') {
      throw new ForbiddenException(
        'Este assunto exige autenticação por certificado ICP-Brasil. Entre com seu certificado A1 para protocolar.',
      );
    }
    if (req === 'GOVBR' && user.authMethod !== 'GOVBR') {
      throw new ForbiddenException(
        'Este assunto exige autenticação via gov.br. Entre com o gov.br para protocolar.',
      );
    }

    // Vínculo obrigatório a processo deferido (renovações — req. 140-145).
    let linkedFormData: Record<string, unknown> = {};
    if (type.requiresLink) {
      if (!dto.linkedToId) {
        throw new BadRequestException(
          'Este processo exige vínculo a um processo já deferido.',
        );
      }
      const linked = await this.prisma.process.findUnique({
        where: { id: dto.linkedToId },
      });
      if (!linked) throw new NotFoundException('Processo vinculado não encontrado');
      // Apenas processos deferidos são elegíveis (req. 144).
      if (linked.status !== 'DEFERRED') {
        throw new BadRequestException(
          'Só é possível vincular a um processo DEFERIDO.',
        );
      }
      if (linked.requesterId !== user.id) {
        throw new ForbiddenException(
          'O processo vinculado deve pertencer ao mesmo requerente.',
        );
      }
      // Reaproveita as informações do processo vinculado (req. 145).
      linkedFormData = linked.formData as Record<string, unknown>;
    }

    const mergedData = { ...linkedFormData, ...dto.formData };

    // Validação dos campos obrigatórios contra a definição do formulário (req. 33).
    const errors = validateSubmission(
      type.formDefinition as unknown as FormDefinition,
      mergedData,
    );
    if (errors.length) throw new BadRequestException({ validation: errors });

    const number = await this.nextNumber();

    const created = await this.prisma.process.create({
      data: {
        number,
        processTypeId: type.id,
        requesterId: user.id,
        currentSectorId: type.responsibleSectorId,
        status: 'PROTOCOLED',
        formData: mergedData as object,
        areas: (dto.areas as object) ?? undefined,
        linkedToId: type.requiresLink ? dto.linkedToId : undefined,
        protocoledAt: new Date(),
        movements: {
          create: {
            type: 'PROTOCOL',
            userId: user.id,
            toSectorId: type.responsibleSectorId,
            content: {
              note: 'Processo protocolado',
              linkedTo: dto.linkedToId ?? null,
            },
          },
        },
      },
      include: { processType: true },
    });
    // Gatilho de integração SIG no protocolo (req. 181).
    await this.fireTriggers(type, 'PROTOCOL', created);
    return created;
  }

  // ── Importação de processos de banco/sistema legado (req. 179) ──
  async importLegacy(
    user: AuthUser,
    items: Array<{
      processTypeId: string;
      requesterEmail?: string;
      requesterDocument?: string;
      formData?: Record<string, unknown>;
      legacyNumber?: string;
      status?: string;
    }>,
  ) {
    this.ensure(user, PERMISSIONS.PROCESS_TYPE_MANAGE);
    const results: { legacyNumber?: string; number?: string; error?: string }[] = [];
    let imported = 0;

    for (const it of items ?? []) {
      try {
        const type = await this.prisma.processType.findUnique({
          where: { id: it.processTypeId },
        });
        if (!type) throw new Error('Assunto (processTypeId) não encontrado');

        // Vincula ao requerente por e-mail/CPF; se não achar, atribui ao importador.
        let requesterId = user.id;
        if (it.requesterEmail || it.requesterDocument) {
          const r = await this.prisma.user.findFirst({
            where: {
              OR: [
                it.requesterEmail ? { email: it.requesterEmail } : undefined,
                it.requesterDocument ? { document: it.requesterDocument } : undefined,
              ].filter(Boolean) as any,
            },
          });
          if (r) requesterId = r.id;
        }

        // Número: preserva o legado se informado e único; senão gera novo.
        let number = it.legacyNumber?.trim() || (await this.nextNumber());
        if (it.legacyNumber) {
          const exists = await this.prisma.process.findUnique({ where: { number } });
          if (exists) number = `${number}-IMP`;
        }

        const created = await this.prisma.process.create({
          data: {
            number,
            processTypeId: type.id,
            requesterId,
            currentSectorId: type.responsibleSectorId,
            status: (it.status as any) || 'ARCHIVED',
            formData: { ...(it.formData ?? {}), _importadoDeLegado: true } as object,
            protocoledAt: new Date(),
            movements: {
              create: {
                type: 'IMPORT',
                userId: user.id,
                content: { note: 'Processo importado de sistema legado', legacyNumber: it.legacyNumber ?? null },
              },
            },
          },
        });
        imported++;
        results.push({ legacyNumber: it.legacyNumber, number: created.number });
      } catch (e) {
        results.push({ legacyNumber: it.legacyNumber, error: (e as Error).message });
      }
    }
    return { imported, total: (items ?? []).length, results };
  }

  // Processos do requerente elegíveis para vínculo (deferidos) — req. 141.
  async linkable(user: AuthUser) {
    return this.prisma.process.findMany({
      where: { requesterId: user.id, status: 'DEFERRED' },
      select: {
        id: true,
        number: true,
        // Dados reaproveitáveis para revisão no protocolo de renovação (req. 116/117).
        formData: true,
        processType: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Caixa de entrada por setor (Módulo V) ─────────────────────
  async inbox(
    user: AuthUser,
    filters: { status?: string; processTypeId?: string; q?: string; orderBy?: string; order?: string; sectorId?: string; box?: string },
  ) {
    const where: any = { AND: [] as any[] };
    const canViewOthers = user.permissions.includes(PERMISSIONS.INBOX_VIEW_OTHERS);

    // Substituto automático (req. 13): recebe também os setores de usuários ausentes
    // (Férias/Viagem/Licença) que o indicaram como substituto.
    const principals = await this.prisma.user.findMany({
      where: { substituteId: user.id, status: { in: ['VACATION', 'TRAVEL', 'LEAVE'] } },
      include: { sectors: true },
    });
    const substituteSectorIds = principals.flatMap((p) => p.sectors.map((s) => s.sectorId));
    const effectiveSectorIds = [...new Set([...user.sectorIds, ...substituteSectorIds])];
    const scopeIds =
      filters.sectorId && (canViewOthers || effectiveSectorIds.includes(filters.sectorId))
        ? [filters.sectorId]
        : effectiveSectorIds;

    const box = filters.box === 'sent' ? 'sent' : 'received';
    if (box === 'sent') {
      // Enviados: processos que os setores do usuário encaminharam adiante (req. 84).
      const fromIds = canViewOthers && filters.sectorId ? [filters.sectorId] : scopeIds;
      where.AND.push({ movements: { some: { type: 'FORWARD', fromSectorId: { in: fromIds } } } });
    } else if (filters.sectorId && (canViewOthers || effectiveSectorIds.includes(filters.sectorId))) {
      // Recebidos por setor: no setor atual OU com ciência compartilhada (req. 81/84).
      where.AND.push({ OR: [{ currentSectorId: filters.sectorId }, { sharedSectorIds: { has: filters.sectorId } }] });
    } else if (!canViewOthers) {
      // Recebidos: nos setores do usuário (+ ausentes que substitui) ou com ciência.
      where.AND.push({ OR: [{ currentSectorId: { in: effectiveSectorIds } }, { sharedSectorIds: { hasSome: effectiveSectorIds } }] });
    }

    if (filters.status) where.AND.push({ status: filters.status });
    if (filters.processTypeId) where.AND.push({ processTypeId: filters.processTypeId });
    if (filters.q) {
      where.AND.push({
        OR: [
          { number: { contains: filters.q, mode: 'insensitive' } },
          { requester: { name: { contains: filters.q, mode: 'insensitive' } } },
        ],
      });
    }

    // Ordenação configurável (req. 89).
    const dir = filters.order === 'asc' ? 'asc' : 'desc';
    const orderBy =
      filters.orderBy === 'number' ? { number: dir as any } : { protocoledAt: dir as any };

    return this.prisma.process.findMany({
      where,
      include: {
        processType: { select: { name: true, category: true } },
        requester: { select: { name: true, document: true } },
      },
      orderBy,
    });
  }

  // Processos protocolados pelo próprio requerente (Painel externo — Módulo VIII).
  async myProcesses(user: AuthUser) {
    return this.prisma.process.findMany({
      where: { requesterId: user.id },
      include: {
        processType: { select: { name: true } },
        documents: { select: { number: true, type: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(user: AuthUser, id: string) {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: {
        processType: true,
        requester: { select: { id: true, name: true, document: true, email: true } },
        currentSector: true,
        movements: {
          include: { user: { select: { name: true } }, toSector: true },
          orderBy: { createdAt: 'asc' },
        },
        analyses: { include: { analyst: { select: { name: true } } } },
        documents: true,
        fees: true,
      },
    });
    if (!process) throw new NotFoundException('Processo não encontrado');

    // Requerente só acessa o próprio processo; internos precisam de visão interna.
    const isOwner = process.requesterId === user.id;
    const canInternal = user.permissions.includes(
      PERMISSIONS.PROCESS_INTERNAL_VIEW,
    );
    if (!isOwner && !canInternal) {
      throw new ForbiddenException('Sem acesso a este processo');
    }

    // Mascara campos sigilosos para quem não é autor nem moderador (req. 66-74).
    const sensitive = this.sensitiveKeys(process.processType);
    const isModerator = (process.moderatorIds ?? []).includes(user.id);
    if (sensitive.length && !isOwner && !isModerator) {
      const fd: any = { ...(process.formData as object) };
      for (const k of sensitive) {
        if (fd[k] !== undefined && fd[k] !== null && fd[k] !== '') {
          fd[k] = typeof fd[k] === 'object' ? { sigiloso: true } : '••••••••';
        }
      }
      (process as any).formData = fd;
      (process as any).sensitiveMasked = true;
    }
    return process;
  }

  private sensitiveKeys(processType: any): string[] {
    const keys: string[] = [];
    for (const s of processType?.formDefinition?.sections ?? [])
      for (const f of s.fields ?? []) if (f.sensitive) keys.push(f.key);
    return keys;
  }

  // ── Moderadores de campos sigilosos (req. 67, 70) ─────────────
  async listModerators(user: AuthUser, id: string) {
    const p = await this.getOr404(id);
    if (p.requesterId !== user.id && !user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW) && !(p.moderatorIds ?? []).includes(user.id)) {
      throw new ForbiddenException('Sem acesso');
    }
    return this.prisma.user.findMany({
      where: { id: { in: p.moderatorIds ?? [] } },
      select: { id: true, name: true, email: true },
    });
  }

  async addModerator(user: AuthUser, id: string, userId: string) {
    const p = await this.getOr404(id);
    const isStaff = user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW);
    const isModerator = (p.moderatorIds ?? []).includes(user.id);
    if (!isStaff && !isModerator) throw new ForbiddenException('Sem autorização para definir moderadores');
    if (!(p.moderatorIds ?? []).includes(userId)) {
      await this.prisma.process.update({ where: { id }, data: { moderatorIds: { push: userId } } });
    }
    return this.listModerators(user, id);
  }

  async removeModerator(user: AuthUser, id: string, userId: string) {
    const p = await this.getOr404(id);
    const isStaff = user.permissions.includes(PERMISSIONS.PROCESS_INTERNAL_VIEW);
    const isModerator = (p.moderatorIds ?? []).includes(user.id);
    if (!isStaff && !isModerator) throw new ForbiddenException('Sem autorização');
    const next = (p.moderatorIds ?? []).filter((x) => x !== userId);
    if (userId === user.id && next.length === 0) {
      throw new BadRequestException('Deve permanecer ao menos um moderador ao remover a si mesmo.');
    }
    await this.prisma.process.update({ where: { id }, data: { moderatorIds: next } });
    return this.listModerators(user, id);
  }

  // ── Tramitação interna (Módulo V) ─────────────────────────────
  async forward(user: AuthUser, id: string, dto: ForwardDto) {
    this.ensure(user, PERMISSIONS.PROCESS_FORWARD);
    const process = await this.getOr404(id);
    await this.ensureAccessLevel(process.processTypeId, 'INTERACT');
    await this.ensureActionEnabled(process.processTypeId, 'FORWARD');
    return this.prisma.process.update({
      where: { id },
      data: {
        currentSectorId: dto.toSectorId,
        movements: {
          create: {
            type: 'FORWARD',
            userId: user.id,
            fromSectorId: process.currentSectorId,
            toSectorId: dto.toSectorId,
            content: { note: dto.note ?? null },
          },
        },
      },
    });
  }

  // Tramitação a múltiplas partes: dá "ciência" do processo a vários setores (req. 81).
  async share(user: AuthUser, id: string, sectorIds: string[]) {
    this.ensure(user, PERMISSIONS.PROCESS_FORWARD);
    const process = await this.getOr404(id);
    await this.ensureAccessLevel(process.processTypeId, 'INTERACT');
    const clean = [...new Set((sectorIds ?? []).filter(Boolean))];
    if (clean.length === 0) throw new BadRequestException('Selecione ao menos um setor.');
    const merged = [...new Set([...(process.sharedSectorIds ?? []), ...clean])];
    return this.prisma.process.update({
      where: { id },
      data: {
        sharedSectorIds: merged,
        movements: {
          create: {
            type: 'FORWARD',
            userId: user.id,
            fromSectorId: process.currentSectorId,
            content: { note: 'Ciência compartilhada com setores', sectorIds: clean },
          },
        },
      },
    });
  }

  async dispatch(user: AuthUser, id: string, dto: DispatchDto) {
    const p = await this.getOr404(id);
    await this.ensureAccessLevel(p.processTypeId, 'INTERACT');
    return this.prisma.processMovement.create({
      data: {
        processId: id,
        type: 'DISPATCH',
        userId: user.id,
        content: { text: dto.text },
      },
    });
  }

  // ── Análise técnica (Módulo VI) ───────────────────────────────
  async analyze(user: AuthUser, id: string, dto: AnalyzeDto) {
    this.ensure(user, PERMISSIONS.PROCESS_ANALYZE);
    const proc = await this.getOr404(id);
    await this.ensureAccessLevel(proc.processTypeId, 'INTERACT');

    // Condiciona o início da análise à quitação das taxas (req. 223-224).
    const pendingFees = await this.prisma.fee.count({
      where: { processId: id, status: 'AWAITING_PAYMENT' },
    });
    if (pendingFees > 0) {
      throw new BadRequestException(
        'Há taxas com pagamento pendente. A análise só pode iniciar após a comprovação do pagamento.',
      );
    }

    const analysis = await this.prisma.analysis.create({
      data: {
        processId: id,
        analystId: user.id,
        items: dto.items as object,
        conclusion: dto.conclusion,
      },
    });
    await this.prisma.process.update({
      where: { id },
      data: { status: 'IN_ANALYSIS' },
    });
    return analysis;
  }

  // Devolve ao requerente para correção, indicando campos corrigíveis (req. 139).
  async returnToRequester(user: AuthUser, id: string, dto: ReturnDto) {
    this.ensure(user, PERMISSIONS.PROCESS_RETURN);
    const proc = await this.getOr404(id);
    await this.ensureAccessLevel(proc.processTypeId, 'INTERACT');
    await this.ensureActionEnabled(proc.processTypeId, 'RETURN');
    return this.prisma.process.update({
      where: { id },
      data: {
        status: 'RETURNED',
        movements: {
          create: {
            type: 'RETURN',
            userId: user.id,
            content: {
              reason: dto.reason,
              correctableFields: dto.correctableFields ?? [],
            },
          },
        },
      },
    });
  }

  // Reapresentação corrigida pelo requerente (req. 118).
  async correct(user: AuthUser, id: string, dto: CorrectDto) {
    this.ensure(user, PERMISSIONS.PROCESS_CORRECT);
    const process = await this.getOr404(id);
    if (process.requesterId !== user.id) {
      throw new ForbiddenException('Apenas o requerente pode corrigir');
    }
    if (process.status !== 'RETURNED') {
      throw new BadRequestException('Processo não está aguardando correção');
    }
    return this.prisma.process.update({
      where: { id },
      data: {
        formData: dto.formData as object,
        status: 'PROTOCOLED',
        movements: {
          create: {
            type: 'CORRECTION',
            userId: user.id,
            // Guarda a versão anterior dos dados para o relatório (req. 185).
            content: {
              note: 'Processo corrigido e reapresentado',
              previousFormData: process.formData,
            },
          },
        },
      },
    });
  }

  // ── Decisão + emissão de documento oficial (Módulo VII) ───────
  async defer(user: AuthUser, id: string, dto: DecisionDto) {
    this.ensure(user, PERMISSIONS.PROCESS_DEFER);
    const process = await this.getOr404(id);
    await this.ensureAccessLevel(process.processTypeId, 'DECIDE');
    await this.ensureActionEnabled(process.processTypeId, 'DEFER');

    const doc = await this.emitDocument(user.id, process);
    await this.prisma.process.update({
      where: { id },
      data: {
        status: 'DEFERRED',
        movements: {
          create: {
            type: 'DECISION',
            userId: user.id,
            content: { decision: 'DEFERIDO', reason: dto.reason ?? null },
          },
        },
      },
    });
    // Gatilho de integração SIG no deferimento (req. 181).
    const type = await this.prisma.processType.findUnique({ where: { id: process.processTypeId } });
    await this.fireTriggers(type, 'DEFER', process);
    return { status: 'DEFERRED', document: doc };
  }

  async indefer(user: AuthUser, id: string, dto: DecisionDto) {
    this.ensure(user, PERMISSIONS.PROCESS_INDEFER);
    if (!dto.reason)
      throw new BadRequestException('Motivo é obrigatório no indeferimento');
    const proc = await this.getOr404(id);
    await this.ensureAccessLevel(proc.processTypeId, 'DECIDE');
    await this.ensureActionEnabled(proc.processTypeId, 'INDEFER');
    return this.prisma.process.update({
      where: { id },
      data: {
        status: 'INDEFERRED',
        movements: {
          create: {
            type: 'DECISION',
            userId: user.id,
            content: { decision: 'INDEFERIDO', reason: dto.reason },
          },
        },
      },
    });
  }

  // Encerramento/arquivamento do processo (ação configurável — req. 44).
  // Exige motivo de encerramento (req. 130).
  async archive(user: AuthUser, id: string, reason?: string) {
    this.ensure(user, PERMISSIONS.PROCESS_FORWARD);
    const proc = await this.getOr404(id);
    await this.ensureAccessLevel(proc.processTypeId, 'INTERACT');
    await this.ensureActionEnabled(proc.processTypeId, 'ARCHIVE');
    if (proc.status === 'ARCHIVED')
      throw new BadRequestException('Processo já está encerrado.');
    if (!reason || !reason.trim())
      throw new BadRequestException('Informe o motivo do encerramento.');
    return this.prisma.process.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        movements: {
          create: {
            type: 'ARCHIVE',
            userId: user.id,
            content: { note: 'Processo encerrado/arquivado', reason: reason.trim() },
          },
        },
      },
    });
  }

  // Desarquivamento do processo, com motivo obrigatório (req. 130).
  async reopen(user: AuthUser, id: string, reason?: string) {
    this.ensure(user, PERMISSIONS.PROCESS_FORWARD);
    const proc = await this.getOr404(id);
    await this.ensureAccessLevel(proc.processTypeId, 'INTERACT');
    if (proc.status !== 'ARCHIVED')
      throw new BadRequestException('O processo não está encerrado.');
    if (!reason || !reason.trim())
      throw new BadRequestException('Informe o motivo do desarquivamento.');
    return this.prisma.process.update({
      where: { id },
      data: {
        status: 'IN_ANALYSIS',
        movements: {
          create: {
            type: 'DISPATCH',
            userId: user.id,
            content: { note: 'Processo desarquivado', reason: reason.trim() },
          },
        },
      },
    });
  }

  // Emite documento com QR Code, código validador e número (req. 189-192).
  // O tipo/prefixo/título saem do documentTemplate do tipo de processo.
  private async emitDocument(userId: string, proc: any) {
    const type = await this.prisma.processType.findUnique({
      where: { id: proc.processTypeId },
    });
    const tpl = (type?.documentTemplate as any) ?? {};
    const docType: string = tpl.docType || 'ALVARA';
    const prefix: string = tpl.prefix || 'ALV';

    const year = new Date().getFullYear();
    const seq = await this.prisma.document.count({
      where: { number: { startsWith: `${prefix}-${year}/` } },
    });
    const number = `${prefix}-${year}/${String(seq + 1).padStart(5, '0')}`;
    const validationCode = randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/api/verificar/${validationCode}`;

    return this.prisma.document.create({
      data: {
        processId: proc.id,
        type: docType,
        number,
        validationCode,
        qrData: verifyUrl,
        emittedById: userId,
        content: {
          title: tpl.title || 'ALVARÁ DE CONSTRUÇÃO',
          processNumber: proc.number,
          requester: proc.requester?.name,
          formData: proc.formData,
          emittedAt: new Date().toISOString(),
          // Personalização do documento: emblema/cabeçalho, fonte (req. 190).
          template: {
            orgao: tpl.orgao || 'PREFEITURA MUNICIPAL DE CABREÚVA',
            secretaria: tpl.secretaria || 'Secretaria de Meio Ambiente, Obras e Serviços Urbanos',
            font: tpl.font || 'Helvetica',
          },
        },
      },
    });
  }

  // Verificação pública de autenticidade (req. 192).
  async verify(validationCode: string) {
    const doc = await this.prisma.document.findUnique({
      where: { validationCode },
      include: { process: { select: { number: true } } },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return {
      number: doc.number,
      type: doc.type,
      status: doc.status,
      processNumber: doc.process.number,
      emittedAt: doc.createdAt,
      signed: doc.signed,
      authentic: true,
    };
  }

  private async getOr404(id: string) {
    const p = await this.prisma.process.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Processo não encontrado');
    return p;
  }
}
