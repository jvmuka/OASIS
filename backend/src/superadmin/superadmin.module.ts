import { Module } from '@nestjs/common';
import { SuperadminController } from './superadmin.controller';
import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [SuperadminController],
})
export class SuperadminModule {}
