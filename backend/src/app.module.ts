import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProcessTypesModule } from './process-types/process-types.module';
import { ProcessesModule } from './processes/processes.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { DispatchTypesModule } from './dispatch-types/dispatch-types.module';
import { FeesModule } from './fees/fees.module';
import { FilesModule } from './files/files.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SisobraModule } from './sisobra/sisobra.module';
import { RolesModule } from './roles/roles.module';
import { WorkflowModule } from './workflow/workflow.module';
import { InvitationsModule } from './invitations/invitations.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    RolesModule,
    WorkflowModule,
    InvitationsModule,
    ProcessTypesModule,
    ProcessesModule,
    DocumentsModule,
    AiModule,
    ReportsModule,
    DispatchTypesModule,
    FeesModule,
    FilesModule,
    IntegrationsModule,
    SisobraModule,
  ],
})
export class AppModule {}
