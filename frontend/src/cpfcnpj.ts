// Máscara e validação de CPF/CNPJ (req. 2/3 — cadastro de contas PF e PJ).

export function onlyDigits(v: string): string {
  return (v ?? '').replace(/\D/g, '');
}

// Aplica a máscara conforme a quantidade de dígitos:
// até 11 → CPF 000.000.000-00 ; acima → CNPJ 00.000.000/0000-00.
export function maskCpfCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Máscara de telefone brasileiro: (11) 99494-9898 (celular, 11 díg.) ou (11) 9494-9898 (fixo, 10 díg.).
export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length === 0) return '';
  const ddd = d.slice(0, 2);
  if (d.length <= 2) return `(${ddd}`;
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const firstLen = rest.length > 8 ? 5 : 4; // 5+4 p/ celular; 4+4 p/ fixo
  return `(${ddd}) ${rest.slice(0, firstLen)}-${rest.slice(firstLen)}`;
}

// Retorna null se válido; senão mensagem de erro. Exige DDD + número (10 ou 11 dígitos).
export function validatePhone(v: string): string | null {
  const d = onlyDigits(v);
  if (d.length === 0) return 'Informe o telefone.';
  if (d.length < 10) return `Telefone incompleto: ${d.length} dígito(s). Use DDD + número, ex.: (11) 99494-9898.`;
  if (d.length > 11) return 'Telefone inválido.';
  if (d.length === 11 && d[2] !== '9') return 'Celular inválido: o número deve começar com 9 após o DDD.';
  return null;
}

function validCpf(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function validCnpj(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

// Retorna null se válido, ou uma mensagem de erro clara caso contrário.
export function validateCpfCnpj(v: string): string | null {
  const d = onlyDigits(v);
  if (d.length === 0) return 'Informe o CPF ou CNPJ.';
  if (d.length < 11) return `CPF/CNPJ incompleto: ${d.length} dígito(s). CPF tem 11 e CNPJ tem 14.`;
  if (d.length === 11) return validCpf(d) ? null : 'CPF inválido (dígitos verificadores não conferem).';
  if (d.length === 14) return validCnpj(d) ? null : 'CNPJ inválido (dígitos verificadores não conferem).';
  if (d.length > 11 && d.length < 14) return `CNPJ incompleto: ${d.length} de 14 dígitos.`;
  return 'CPF/CNPJ inválido.';
}
