import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, PerfilGuard } from './guards';

@Global()
@Module({
  imports: [JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET || 'oasis-dev',
    signOptions: { expiresIn: '8h' },
  })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PerfilGuard],
  exports: [JwtAuthGuard, PerfilGuard],
})
export class AuthModule {}
