// Estrutura da definição de formulário do construtor no-code (req. 27-40).
// Armazenada em ProcessType.formDefinition (JSONB).

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'cpfcnpj'
  | 'cep'
  | 'date'
  | 'file'
  | 'arealist' // quadro de áreas (req. 57)
  | 'geo' // latitude/longitude (req. 65)
  | 'partes' // remetente/destinatário (req. 28)
  | 'repeater'; // grupo de campos repetível (req. 39)

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  help?: string; // texto lateral de ajuda (req. 34)
  column?: number; // largura em colunas (req. 30)
  options?: string[]; // para select/multiselect
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  forbiddenChars?: string; // caracteres proibidos (req. 40)
  maxAttachmentMB?: number; // limite de tamanho do anexo em MB (req. 40)
  acceptExtensions?: string[]; // para file
  autofillFrom?: string; // preenchimento automático (req. 36)
  // Validação por cruzamento entre campos/fontes (req. 35).
  crossCheck?: { field: string; op: 'equals' | 'notEquals'; message?: string };
  // Subcampos do grupo repetível (req. 39).
  subfields?: { key: string; label: string; type: string }[];
  // Latitude/longitude por quadro de área (req. 65).
  geoPerQuadro?: boolean;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface FormDefinition {
  sections: FormSection[];
}

export interface ChecklistItem {
  key: string;
  label: string;
  fieldRef?: string; // vincula item ao campo do formulário (req. 128)
  required?: boolean;
}

// Valida os dados submetidos contra a definição do formulário.
// Retorna lista de erros (vazia = válido).
export function validateSubmission(
  def: FormDefinition,
  data: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const section of def.sections) {
    for (const field of section.fields) {
      if (field.hidden || field.readonly) continue;
      const value = data[field.key];
      const empty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);

      if (field.required && empty) {
        errors.push(`Campo obrigatório não preenchido: "${field.label}"`);
        continue;
      }
      if (empty) continue;

      if (
        field.type === 'number' &&
        typeof value === 'number'
      ) {
        if (field.min !== undefined && value < field.min)
          errors.push(`"${field.label}" abaixo do mínimo (${field.min}).`);
        if (field.max !== undefined && value > field.max)
          errors.push(`"${field.label}" acima do máximo (${field.max}).`);
      }

      if (typeof value === 'string') {
        if (field.maxLength && value.length > field.maxLength)
          errors.push(`"${field.label}" excede ${field.maxLength} caracteres.`);
        if (field.minLength && value.length < field.minLength)
          errors.push(`"${field.label}" tem menos de ${field.minLength} caracteres.`);
        if (field.forbiddenChars) {
          const bad = [...new Set([...field.forbiddenChars])].filter((c) => value.includes(c));
          if (bad.length)
            errors.push(`"${field.label}" contém caracteres não permitidos: ${bad.join(' ')}`);
        }
      }

      // Cruzamento entre campos/fontes (req. 35).
      if (field.crossCheck?.field) {
        const other = data[field.crossCheck.field];
        const eq = String(value ?? '') === String(other ?? '');
        const okCross = field.crossCheck.op === 'notEquals' ? !eq : eq;
        if (!okCross) {
          errors.push(
            field.crossCheck.message ||
              `"${field.label}" não confere com o campo relacionado.`,
          );
        }
      }
    }
  }
  return errors;
}
