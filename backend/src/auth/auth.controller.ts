import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; senha: string }) {
    return this.auth.login(body.email, body.senha);
  }
}
