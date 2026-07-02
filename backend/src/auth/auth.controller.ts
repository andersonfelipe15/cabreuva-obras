import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class FederatedDto {
  @IsString()
  document: string;

  @IsString()
  provider: string; // GOVBR | ICP
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // Autenticação avançada gov.br (req. 6) — mecanismo federado.
  @Post('federated')
  federated(@Body() dto: FederatedDto) {
    return this.auth.loginFederated(dto.document, dto.provider);
  }

  // Autenticação avançada por certificado ICP-Brasil A1 (req. 6) — real.
  @Post('certificate')
  certificate(@Body() body: { pfxBase64: string; password: string }) {
    return this.auth.loginCertificate(body.pfxBase64, body.password);
  }

  // Auto-cadastro de requerente externo (req. 2) — público.
  @Post('register')
  register(@Body() body: any) {
    return this.auth.register(body);
  }

  // Esqueci minha senha (req. 5) — públicos.
  @Post('forgot-password')
  forgot(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  reset(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token, body.password);
  }

  // Troca de perfil ativo sem novo login (req. 15-16).
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('switch-profile')
  switchProfile(@CurrentUser() user: AuthUser, @Body() body: { roleId: string }) {
    return this.auth.switchProfile(user.id, body.roleId);
  }
}
