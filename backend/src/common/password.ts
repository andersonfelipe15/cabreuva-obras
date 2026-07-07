import { BadRequestException } from '@nestjs/common';

// Política de senha forte (req. 3). Aplicada em cadastro, aceite de convite e reset.
export function assertStrongPassword(pw: string) {
  const missing: string[] = [];
  if (!/[a-z]/.test(pw)) missing.push('uma letra minúscula');
  if (!/[A-Z]/.test(pw)) missing.push('uma letra maiúscula');
  if (!/[0-9]/.test(pw)) missing.push('um número');
  if (!/[^A-Za-z0-9]/.test(pw)) missing.push('um caractere especial (ex.: @ # ! $)');
  const short = !pw || pw.length < 8;
  if (short || missing.length) {
    const parts: string[] = [];
    if (short) parts.push('ter no mínimo 8 caracteres');
    if (missing.length) parts.push('incluir ' + missing.join(', '));
    throw new BadRequestException('Senha fraca — ela deve ' + parts.join(' e ') + '.');
  }
}
