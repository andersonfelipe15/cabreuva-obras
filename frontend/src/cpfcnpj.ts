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
