import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';

export type TopicoSync =
  | 'ENCOMENDAS'
  | 'RESERVAS'
  | 'CHAVES'
  | 'AREAS_LIVRES'
  | 'AVISOS'
  | 'PESSOAS'
  | 'ESTRUTURA'
  | 'CHAMADOS';

export type AcaoSync = 'CRIADO' | 'ATUALIZADO' | 'EXCLUIDO';

export interface EventoSync {
  topico: TopicoSync;
  acao: AcaoSync;
  timestamp: number;
  idPessoaAlvo?: number; // Se for para um morador/usuário específico
  idUnidadeAlvo?: number;
  detalhes?: Record<string, any>;
}

@Injectable()
export class SyncService {
  private eventStream$ = new Subject<EventoSync>();

  /**
   * Emite um evento de sincronização para todos os clientes conectados (ou direcionado a um alvo).
   */
  emitir(evento: Omit<EventoSync, 'timestamp'>) {
    this.eventStream$.next({
      ...evento,
      timestamp: Date.now(),
    });
  }

  /**
   * Retorna um Observable de MessageEvent SSE compatível com o navegador.
   * Filtra eventos se um idPessoa ou perfis forem fornecidos.
   */
  obterStreamParaUsuario(idPessoa: number, ehAdminOuPorteiro: boolean): Observable<MessageEvent> {
    return this.eventStream$.asObservable().pipe(
      filter(ev => {
        // Se for admin ou porteiro, recebe todos os eventos operacionais
        if (ehAdminOuPorteiro) return true;
        // Se não tiver alvo específico, é um evento de condomínio (ex: novo aviso geral, área livre atualizada, reserva, chamado)
        if (!ev.idPessoaAlvo) return true;
        // Se tiver alvo específico, entrega somente para a pessoa de destino
        return ev.idPessoaAlvo === idPessoa;
      }),
      map(ev => ({
        data: JSON.stringify(ev),
      } as MessageEvent))
    );
  }
}
