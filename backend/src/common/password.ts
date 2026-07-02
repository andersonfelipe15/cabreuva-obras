import { BadRequestException } from '@nestjs/common';

// Política de senha forte (req. 3). Aplicada em cadastro, aceite de convite e reset.
export function assertStrongPassword(pw: string) {
  const problems: string[] = [];
  if (!pw || pw.length < 8) problems.push('mínimo de 8 caracteres');
  if (!/[a-z]/.test(pw)) problems.push('uma letra minúscula');
  if (!/[A-Z]/.test(pw)) problems.push('uma letra maiúscula');
  if (!/[0-9]/.test(pw)) problems.push('um número');
  if (problems.length) {
    throw new BadRequestException(
      'Senha fraca. Requisitos não atendidos: ' + problems.join(', ') + '.',
    );
  }
}
