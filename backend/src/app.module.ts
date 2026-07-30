import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { CadastrosModule } from './cadastros/cadastros.module';
import { AreasModule } from './areas/areas.module';
import { ReservasModule } from './reservas/reservas.module';
import { PortariaModule } from './portaria/portaria.module';
import { AvisosModule } from './avisos/avisos.module';
import { RelatoriosModule } from './relatorios/relatorios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),   // carrega o .env
    DbModule,
    AuthModule,
    CadastrosModule,
    AreasModule,
    ReservasModule,
    PortariaModule,
    AvisosModule,
    RelatoriosModule,
  ],
})
export class AppModule {}
