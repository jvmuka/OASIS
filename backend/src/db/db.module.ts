import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';

@Global()                         // disponivel para todos os modulos sem reimportar
@Module({ providers: [DbService], exports: [DbService] })
export class DbModule {}
