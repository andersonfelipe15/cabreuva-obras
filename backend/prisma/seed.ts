import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SYSTEM_ROLES } from '../src/common/permissions';

const prisma = new PrismaClient();

async function main() {
  // ── Perfis de permissionamento pré-configurados (req. 19-21) ──
  const roles: Record<string, string> = {};
  for (const [name, permissions] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { permissions },
      create: { name, permissions, system: true },
    });
    roles[name] = role.id;
  }

  // ── Setor responsável ──
  const sector = await prisma.sector.upsert({
    where: { name: 'Secretaria de Meio Ambiente, Obras e Serviços Urbanos' },
    update: {},
    create: { name: 'Secretaria de Meio Ambiente, Obras e Serviços Urbanos' },
  });

  // ── Usuários de teste ──
  async function upsertUser(
    email: string,
    name: string,
    document: string,
    password: string,
    roleName: string,
    inSector = false,
  ) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        document,
        passwordHash: await bcrypt.hash(password, 10),
        emailVerified: true,
        roles: { create: [{ roleId: roles[roleName] }] },
        sectors: inSector ? { create: [{ sectorId: sector.id }] } : undefined,
      },
    });
  }

  await upsertUser(
    'admin@cabreuva.sp.gov.br',
    'Administrador',
    '00000000000',
    'admin123',
    'Administrador',
    true,
  );
  await upsertUser(
    'analista@cabreuva.sp.gov.br',
    'Analista Técnico',
    '11111111111',
    'analista123',
    'Analista',
    true,
  );
  await upsertUser(
    'requerente@teste.com',
    'João Requerente',
    '22222222222',
    'requerente123',
    'Requerente',
  );

  // ── MÓDULO I: Aprovação de Projeto e Alvará (Construção) ──
  const formDefinition = {
    sections: [
      {
        title: 'Identificação do Requerente',
        fields: [
          { key: 'requerenteNome', label: 'Nome / Razão Social', type: 'text', required: true, column: 8 },
          { key: 'requerenteDoc', label: 'CPF / CNPJ', type: 'cpfcnpj', required: true, column: 4 },
          { key: 'requerenteEmail', label: 'E-mail', type: 'text', required: true, column: 6 },
          { key: 'requerenteTel', label: 'Telefone', type: 'text', column: 6 },
        ],
      },
      {
        title: 'Responsável Técnico',
        fields: [
          { key: 'rtNome', label: 'Nome do Responsável Técnico', type: 'text', required: true, column: 8 },
          { key: 'rtRegistro', label: 'Registro (CREA/CAU)', type: 'text', required: true, column: 4, help: 'Informe o número do CREA ou CAU.' },
          { key: 'artRrt', label: 'ART / RRT (PDF)', type: 'file', required: true, acceptExtensions: ['pdf'] },
        ],
      },
      {
        title: 'Dados do Imóvel',
        fields: [
          { key: 'cep', label: 'CEP', type: 'cep', required: true, column: 3, autofillFrom: 'viacep' },
          { key: 'logradouro', label: 'Logradouro', type: 'text', required: true, column: 6 },
          { key: 'numero', label: 'Número', type: 'text', required: true, column: 3 },
          { key: 'inscricaoImobiliaria', label: 'Inscrição Imobiliária', type: 'text', column: 6 },
          { key: 'matricula', label: 'Matrícula do Imóvel (PDF)', type: 'file', required: true, acceptExtensions: ['pdf'] },
          { key: 'localizacao', label: 'Localização no mapa', type: 'geo' },
        ],
      },
      {
        title: 'Dados da Obra',
        fields: [
          {
            key: 'tipoObra', label: 'Tipo de obra', type: 'select', required: true, column: 6,
            options: ['Construção', 'Ampliação', 'Reforma'],
          },
          { key: 'usoConstrucao', label: 'Uso da construção', type: 'select', required: true, column: 6, options: ['Residencial', 'Comercial', 'Industrial', 'Misto'] },
          { key: 'areaTerreno', label: 'Área do terreno (m²)', type: 'number', required: true, min: 1, column: 4 },
          { key: 'areaConstruida', label: 'Área construída (m²)', type: 'number', required: true, min: 1, column: 4 },
          { key: 'pavimentos', label: 'Nº de pavimentos', type: 'number', required: true, min: 1, column: 4 },
          { key: 'quadroAreas', label: 'Quadro de áreas', type: 'arealist', help: 'Detalhe cada edificação/gleba do empreendimento.' },
        ],
      },
      {
        title: 'Documentação do Projeto',
        fields: [
          { key: 'projetoArquitetonico', label: 'Projeto arquitetônico (PDF/DWG)', type: 'file', required: true, acceptExtensions: ['pdf', 'dwg'] },
          { key: 'memorialDescritivo', label: 'Memorial descritivo (PDF)', type: 'file', required: true, acceptExtensions: ['pdf'] },
          { key: 'observacoes', label: 'Observações', type: 'textarea' },
          { key: 'dadoSigiloso', label: 'Dado sigiloso (visível só ao autor e moderadores)', type: 'textarea', sensitive: true },
        ],
      },
    ],
  };

  // Checklist de análise vinculado aos campos (req. 126-128).
  const analysisChecklist = {
    items: [
      { key: 'docCompleta', label: 'Documentação completa e legível', fieldRef: 'projetoArquitetonico', required: true },
      { key: 'artValida', label: 'ART/RRT válida e compatível', fieldRef: 'artRrt', required: true },
      { key: 'matriculaOk', label: 'Matrícula do imóvel confere', fieldRef: 'matricula', required: true },
      { key: 'recuos', label: 'Recuos e taxa de ocupação conforme zoneamento', required: true },
      { key: 'areasConferem', label: 'Quadro de áreas consistente com o projeto', fieldRef: 'quadroAreas', required: true },
      { key: 'usoPermitido', label: 'Uso permitido para a zona', fieldRef: 'usoConstrucao', required: true },
    ],
  };

  await prisma.processType.upsert({
    where: { code: 'EDIL-CONSTRUCAO' },
    update: { formDefinition, analysisChecklist },
    create: {
      code: 'EDIL-CONSTRUCAO',
      name: 'Aprovação de Projeto e Alvará (Construção, Ampliação, Reforma)',
      description:
        'Processo edilício para aprovação de projeto e emissão de alvará de construção.',
      category: 'EDILICIO',
      responsibleSectorId: sector.id,
      formDefinition,
      analysisChecklist,
      documentTemplate: { title: 'ALVARÁ DE CONSTRUÇÃO', body: 'alvara-construcao' },
    },
  });

  // ── MÓDULO II: Certidão de Uso e Ocupação do Solo ──
  const usoSoloForm = {
    sections: [
      {
        title: 'Identificação do Requerente',
        fields: [
          { key: 'requerenteNome', label: 'Nome / Razão Social', type: 'text', required: true, column: 8 },
          { key: 'requerenteDoc', label: 'CPF / CNPJ', type: 'cpfcnpj', required: true, column: 4 },
          { key: 'requerenteEmail', label: 'E-mail', type: 'text', required: true, column: 6 },
          { key: 'requerenteTel', label: 'Telefone', type: 'text', column: 6 },
        ],
      },
      {
        title: 'Imóvel',
        fields: [
          { key: 'cep', label: 'CEP', type: 'cep', required: true, column: 3, autofillFrom: 'viacep' },
          { key: 'logradouro', label: 'Logradouro', type: 'text', required: true, column: 6 },
          { key: 'numero', label: 'Número', type: 'text', required: true, column: 3 },
          { key: 'inscricaoImobiliaria', label: 'Inscrição Imobiliária', type: 'text', required: true, column: 6 },
          { key: 'localizacao', label: 'Localização no mapa', type: 'geo' },
        ],
      },
      {
        title: 'Finalidade',
        fields: [
          { key: 'atividadePretendida', label: 'Atividade pretendida', type: 'text', required: true, column: 8, help: 'Descreva a atividade a ser exercida no imóvel.' },
          { key: 'cnae', label: 'CNAE (se houver)', type: 'text', column: 4 },
          { key: 'observacoes', label: 'Observações', type: 'textarea' },
        ],
      },
    ],
  };
  const usoSoloChecklist = {
    items: [
      { key: 'zonaCompativel', label: 'Zoneamento compatível com a atividade', fieldRef: 'atividadePretendida', required: true },
      { key: 'imovelRegular', label: 'Imóvel regular perante o cadastro municipal', fieldRef: 'inscricaoImobiliaria', required: true },
      { key: 'atividadePermitida', label: 'Atividade permitida na zona', required: true },
    ],
  };
  await prisma.processType.upsert({
    where: { code: 'USOSOLO-CERTIDAO' },
    update: { formDefinition: usoSoloForm, analysisChecklist: usoSoloChecklist },
    create: {
      code: 'USOSOLO-CERTIDAO',
      name: 'Certidão de Uso e Ocupação do Solo',
      description: 'Certidão que atesta a compatibilidade da atividade pretendida com o zoneamento.',
      category: 'USO_SOLO',
      responsibleSectorId: sector.id,
      formDefinition: usoSoloForm,
      analysisChecklist: usoSoloChecklist,
      documentTemplate: { title: 'CERTIDÃO DE USO E OCUPAÇÃO DO SOLO', docType: 'CERTIDAO', prefix: 'CUS' },
    },
  });

  // ── MÓDULO III: Renovação de Alvará (vinculada a alvará deferido) ──
  const renovacaoForm = {
    sections: [
      {
        title: 'Renovação',
        fields: [
          { key: 'justificativa', label: 'Justificativa da renovação', type: 'textarea', required: true, help: 'Os dados do alvará original serão reaproveitados automaticamente.' },
          { key: 'obraConcluida', label: 'Situação da obra', type: 'select', required: true, options: ['Em andamento', 'Paralisada'] },
        ],
      },
    ],
  };
  const renovacaoChecklist = {
    items: [
      { key: 'alvaraVigente', label: 'Alvará original válido e elegível à renovação', required: true },
      { key: 'semDebitos', label: 'Sem débitos pendentes', required: true },
      { key: 'obraCompativel', label: 'Situação da obra compatível com a renovação', fieldRef: 'obraConcluida', required: true },
    ],
  };
  await prisma.processType.upsert({
    where: { code: 'EDIL-RENOVACAO' },
    update: { formDefinition: renovacaoForm, analysisChecklist: renovacaoChecklist, requiresLink: true },
    create: {
      code: 'EDIL-RENOVACAO',
      name: 'Renovação de Alvará (vinculada)',
      description: 'Renovação de alvará de construção, vinculada a um alvará já deferido.',
      category: 'EDILICIO',
      requiresLink: true,
      responsibleSectorId: sector.id,
      formDefinition: renovacaoForm,
      analysisChecklist: renovacaoChecklist,
      documentTemplate: { title: 'RENOVAÇÃO DE ALVARÁ DE CONSTRUÇÃO', docType: 'ALVARA', prefix: 'ALV-REN' },
    },
  });

  // ── Tipos de despacho (timeline — req. 96-97) ──
  async function upsertDispatchType(name: string, data: any) {
    const existing = await prisma.dispatchType.findFirst({ where: { name } });
    if (existing) {
      return prisma.dispatchType.update({ where: { id: existing.id }, data });
    }
    return prisma.dispatchType.create({ data: { name, ...data } });
  }

  const exigencia = await upsertDispatchType('Comunicação de Exigências', {
    enabled: true,
    allowRequester: false, // exclusivo interno
    fields: [
      { key: 'descricao', label: 'Descrição da exigência', type: 'richtext', required: true },
      { key: 'prazo', label: 'Prazo (dias)', type: 'text' },
    ],
    situations: [
      { name: 'Aberta', color: '#f59e0b' },
      { name: 'Em análise', color: '#2563eb' },
      { name: 'Cumprida', color: '#16a34a' },
      { name: 'Vencida', color: '#dc2626' },
      { name: 'Cancelada', color: '#6b7280' },
    ],
  });

  const manifestacao = await upsertDispatchType('Manifestação do Requerente', {
    enabled: true,
    allowRequester: true, // requerente pode usar
    fields: [
      { key: 'texto', label: 'Manifestação', type: 'textarea', required: true },
      { key: 'anexo', label: 'Anexo', type: 'file', acceptExtensions: ['pdf', 'png', 'jpg'] },
    ],
    situations: [],
  });

  // Habilita os tipos no assunto edilício (req. 98).
  const edil = await prisma.processType.findUnique({ where: { code: 'EDIL-CONSTRUCAO' } });
  if (edil) {
    await prisma.processType.update({
      where: { id: edil.id },
      data: {
        dispatchTypeIds: [exigencia.id, manifestacao.id],
        // Cálculo automático da taxa (req. 221-222).
        feeRules: {
          descricao: 'Taxa de Análise e Aprovação de Projeto',
          base: 150,
          campoArea: 'areaConstruida',
          valorPorM2: 2.5,
          campoUso: 'usoConstrucao',
          multiplicadoresUso: {
            Residencial: 1,
            Comercial: 1.5,
            Industrial: 2,
            Misto: 1.3,
          },
        },
      },
    });
  }

  // ── Integração externa de exemplo (req. 170-178) ──
  // Chamada server-side: o backend chama a si mesmo (na própria porta), sob /api.
  const selfBase = `http://localhost:${process.env.PORT || 3000}/api`;
  let integration = await prisma.integration.findFirst({
    where: { name: 'Consulta de Zoneamento' },
  });
  if (!integration) {
    integration = await prisma.integration.create({
      data: {
        name: 'Consulta de Zoneamento',
        description: 'Consulta o zoneamento e parâmetros urbanísticos pelo CEP.',
        url: `${selfBase}/integrations/mock/zoneamento`,
        method: 'GET',
        authType: 'NONE',
        bodyType: 'NONE',
        titleProp: 'zona',
        keyProp: 'cep',
      },
    });
  }

  // Demonstração de autofill (req. 36/180): o CEP consulta o zoneamento e
  // preenche automaticamente o campo "Zoneamento".
  const imovel: any = formDefinition.sections.find((s) => s.title === 'Dados do Imóvel');
  if (imovel && !imovel.fields.some((f: any) => f.key === 'zonaConsultada')) {
    const cepField: any = imovel.fields.find((f: any) => f.key === 'cep');
    if (cepField) {
      cepField.autofill = {
        integrationId: integration.id,
        paramKey: 'cep',
        map: { zona: 'zonaConsultada' },
      };
    }
    imovel.fields.push({
      key: 'zonaConsultada',
      label: 'Zoneamento (consulta automática)',
      type: 'text',
      readonly: true,
      column: 6,
      help: 'Preenchido automaticamente ao informar o CEP.',
    });
    await prisma.processType.update({
      where: { code: 'EDIL-CONSTRUCAO' },
      data: { formDefinition },
    });
  }

  console.log(
    'Seed concluído: perfis, usuários, setor, Módulos I/II/III, despachos e integração criados.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
