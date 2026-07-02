// Catálogo de permissões granulares (Anexo II, req. 19-21).
// Cada perfil (Role) recebe um subconjunto destas, configurável pela interface.

export const PERMISSIONS = {
  // Gestão de usuários / administração
  USER_MANAGE: 'user.manage',
  USER_BLOCK: 'user.block',
  ROLE_ASSIGN: 'role.assign',
  SECTOR_MANAGE: 'sector.manage',
  PROCESS_TYPE_MANAGE: 'processType.manage', // criar processo e configurar formulário

  // Ciclo de vida do processo
  PROCESS_PROTOCOL: 'process.protocol',
  PROCESS_CORRECT: 'process.correct', // corrigir e reenviar p/ análise
  PROCESS_ANALYZE: 'process.analyze',
  PROCESS_RETURN: 'process.return', // devolver ao requerente
  PROCESS_CHOOSE_CORRECTABLE: 'process.chooseCorrectableFields',
  PROCESS_CHANGE_ANALYST: 'process.changeAnalyst',
  PROCESS_CHANGE_REQUESTER: 'process.changeRequester',
  PROCESS_DEFER: 'process.defer',
  PROCESS_INDEFER: 'process.indefer',
  PROCESS_FORWARD: 'process.forward',

  // Taxas
  FEE_MANAGE: 'fee.manage',

  // Documentos
  DOCUMENT_PREVIEW: 'document.preview',
  DOCUMENT_SIGN: 'document.sign',
  DOCUMENT_VIEW: 'document.view',
  DOCUMENT_INVALIDATE: 'document.invalidate',

  // Relatórios / painel
  PROCESS_INTERNAL_VIEW: 'process.internalView',
  REPORT_GENERATE: 'report.generate',
  DASHBOARD_VIEW: 'dashboard.view',
  INBOX_VIEW_OTHERS: 'inbox.viewOthers', // pegar processos de inboxes de outros
  SISOBRA_ACCESS: 'sisobra.access',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Rótulos legíveis para a interface de configuração de perfis.
export const PERMISSION_LABELS: Record<string, string> = {
  'user.manage': 'Gerenciar usuários',
  'user.block': 'Bloquear usuários',
  'role.assign': 'Atribuir perfis',
  'sector.manage': 'Gerenciar setores',
  'processType.manage': 'Criar/configurar assuntos (formulários)',
  'process.protocol': 'Protocolar processo',
  'process.correct': 'Corrigir e reenviar',
  'process.analyze': 'Analisar processo',
  'process.return': 'Devolver ao requerente',
  'process.chooseCorrectableFields': 'Escolher campos corrigíveis',
  'process.changeAnalyst': 'Trocar analista responsável',
  'process.changeRequester': 'Alterar requerente',
  'process.defer': 'Deferir',
  'process.indefer': 'Indeferir',
  'process.forward': 'Encaminhar',
  'fee.manage': 'Gerenciar taxas',
  'document.preview': 'Pré-visualizar documento',
  'document.sign': 'Assinar documento',
  'document.view': 'Visualizar documentos',
  'document.invalidate': 'Invalidar documentos',
  'process.internalView': 'Ver área interna do processo',
  'report.generate': 'Gerar relatórios',
  'dashboard.view': 'Ver painel/estatísticas',
  'inbox.viewOthers': 'Ver caixas de outros usuários',
  'sisobra.access': 'Acessar SISOBRA',
};

// Perfis pré-configurados de fábrica (req. 19-21).
export const SYSTEM_ROLES: Record<string, Permission[]> = {
  Administrador: Object.values(PERMISSIONS),
  Analista: [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.USER_BLOCK,
    PERMISSIONS.PROCESS_PROTOCOL,
    PERMISSIONS.PROCESS_CORRECT,
    PERMISSIONS.PROCESS_CHANGE_ANALYST,
    PERMISSIONS.PROCESS_ANALYZE,
    PERMISSIONS.PROCESS_RETURN,
    PERMISSIONS.PROCESS_CHOOSE_CORRECTABLE,
    PERMISSIONS.PROCESS_CHANGE_REQUESTER,
    PERMISSIONS.PROCESS_DEFER,
    PERMISSIONS.PROCESS_INDEFER,
    PERMISSIONS.PROCESS_FORWARD,
    PERMISSIONS.FEE_MANAGE,
    PERMISSIONS.DOCUMENT_PREVIEW,
    PERMISSIONS.DOCUMENT_SIGN,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_INVALIDATE,
    PERMISSIONS.PROCESS_INTERNAL_VIEW,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SISOBRA_ACCESS,
  ],
  Requerente: [
    PERMISSIONS.PROCESS_PROTOCOL,
    PERMISSIONS.PROCESS_CORRECT,
    PERMISSIONS.DOCUMENT_VIEW,
  ],
};
