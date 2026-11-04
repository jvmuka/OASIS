import { Controller, Sse, MessageEvent, UseGuards, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const idPessoa = req.user?.sub;
    const perfis = (req.user?.perfis || []).map((p: any) => p.tipo);
    const ehAdminOuPorteiro = perfis.some((t: string) =>
      ['SUPERADMIN', 'SINDICO', 'ADMINISTRADOR', 'PORTEIRO'].includes(t)
    );

    return this.syncService.obterStreamParaUsuario(idPessoa, ehAdminOuPorteiro);
  }
}

