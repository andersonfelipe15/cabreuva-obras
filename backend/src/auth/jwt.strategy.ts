import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: { sub: string; activeRoleId?: string; authMethod?: string }): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } }, sectors: true },
    });
    if (!user || user.status === 'BLOCKED' || user.status === 'DISABLED') {
      throw new UnauthorizedException('Usuário inválido ou bloqueado');
    }
    // Perfil ativo: se o token fixa um perfil que o usuário possui, as permissões
    // vêm só dele; caso contrário, mescla todos os perfis (req. 15-16).
    const activeRoles =
      payload.activeRoleId && user.roles.some((ur) => ur.roleId === payload.activeRoleId)
        ? user.roles.filter((ur) => ur.roleId === payload.activeRoleId)
        : user.roles;
    const permissions = new Set<string>();
    activeRoles.forEach((ur) =>
      ur.role.permissions.forEach((p) => permissions.add(p)),
    );
    return {
      id: user.id,
      email: user.email,
      permissions: [...permissions],
      sectorIds: user.sectors.map((s) => s.sectorId),
      // Perfis ativos (respeitando o perfil ativo, se houver) — usado no req. 7.
      roleIds: activeRoles.map((ur) => ur.roleId),
      authMethod: payload.authMethod ?? 'PASSWORD',
    };
  }
}
