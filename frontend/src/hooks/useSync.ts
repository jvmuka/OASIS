import { useEffect, useRef } from 'react';
import { sessaoAtual } from '../api';

export type TopicoSync =
  | 'RESERVAS'
  | 'ENCOMENDAS'
  | 'CHAVES'
  | 'AREAS_LIVRES'
  | 'AVISOS'
  | 'PESSOAS'
  | 'CHAMADOS';

export interface EventoSync {
  topico: TopicoSync;
  acao: 'CRIADO' | 'ATUALIZADO' | 'EXCLUIDO';
  idPessoaAlvo?: number;
  detalhes?: any;
  timestamp: string;
}

type SyncCallback = (evento: EventoSync) => void;

class SyncManager {
  private static instance: SyncManager | null = null;
  private subscribers: Map<TopicoSync, Set<SyncCallback>> = new Map();
  private eventSource: EventSource | null = null;
  private channel: BroadcastChannel | null = null;
  private reconnectTimer: any = null;
  private retryDelayMs = 2000;
  private lastActivity = Date.now();

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('oasis_sync_bus');
        this.channel.onmessage = (event) => {
          if (event.data?.topico) {
            this.dispatchLocally(event.data);
          }
        };
      } catch {
        // Fallback gracefully se BroadcastChannel não for suportado
      }

      // Revalidação em retorno de foco na aba
      window.addEventListener('focus', () => this.handleWindowRevalidation());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handleWindowRevalidation();
        }
      });
    }
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private handleWindowRevalidation() {
    const elapsed = Date.now() - this.lastActivity;
    // Se a aba ficou em segundo plano por mais de 10 segundos, dispara revalidação geral
    if (elapsed > 10000) {
      this.lastActivity = Date.now();
      const topicos: TopicoSync[] = ['RESERVAS', 'ENCOMENDAS', 'CHAVES', 'AREAS_LIVRES', 'AVISOS', 'PESSOAS'];
      topicos.forEach(t => {
        this.dispatchLocally({
          topico: t,
          acao: 'ATUALIZADO',
          timestamp: new Date().toISOString(),
          detalhes: { revalidacaoFoco: true },
        });
      });
    }
  }

  public subscribe(topico: TopicoSync, cb: SyncCallback): () => void {
    if (!this.subscribers.has(topico)) {
      this.subscribers.set(topico, new Set());
    }
    this.subscribers.get(topico)!.add(cb);

    this.ensureConnection();

    return () => {
      const set = this.subscribers.get(topico);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.subscribers.delete(topico);
        }
      }
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  public notificarMudanca(evento: Omit<EventoSync, 'timestamp'>) {
    const eventoCompleto: EventoSync = {
      ...evento,
      timestamp: new Date().toISOString(),
    };
    this.dispatchLocally(eventoCompleto);
    if (this.channel) {
      this.channel.postMessage(eventoCompleto);
    }
  }

  private dispatchLocally(evento: EventoSync) {
    this.lastActivity = Date.now();
    const set = this.subscribers.get(evento.topico);
    if (set) {
      set.forEach(cb => {
        try {
          cb(evento);
        } catch (err) {
          console.warn('[SyncManager] Erro no callback de sync:', err);
        }
      });
    }
    this.exibirNotificacaoSeRelevante(evento);
  }

  private exibirNotificacaoSeRelevante(evento: EventoSync) {
    const sessao = sessaoAtual();
    if (!sessao?.pessoa) return;
    const meuId = sessao.pessoa.id_pessoa;

    // Dispara evento customizado no window para componentes de UI reagirem (ex: som, toast)
    const customEvent = new CustomEvent('oasis:sync-notification', { detail: evento });
    window.dispatchEvent(customEvent);

    if (evento.topico === 'ENCOMENDAS' && evento.acao === 'CRIADO' && evento.idPessoaAlvo === meuId) {
      this.mostrarToast('Uma nova encomenda chegou para você na portaria!');
    }
  }

  private mostrarToast(mensagem: string) {
    const div = document.createElement('div');
    div.className =
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-4 opacity-0 pointer-events-auto border border-emerald-500/30';
    div.innerHTML = `
      <svg class="w-5 h-5 text-emerald-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <span class="text-sm font-semibold">${mensagem}</span>
    `;
    document.body.appendChild(div);
    requestAnimationFrame(() => {
      div.classList.remove('translate-y-4', 'opacity-0');
    });
    setTimeout(() => {
      div.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => div.remove(), 400);
    }, 4500);
  }

  private ensureConnection() {
    if (this.eventSource || typeof window === 'undefined') return;

    const token = localStorage.getItem('oasis_token');
    if (!token) return;

    try {
      const url = `/api/sync/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.retryDelayMs = 2000;
      };

      this.eventSource.onmessage = (e) => {
        if (!e.data) return;
        try {
          const dados: EventoSync = JSON.parse(e.data);
          this.dispatchLocally(dados);
          if (this.channel) {
            this.channel.postMessage(dados);
          }
        } catch (err) {
          console.warn('[SyncManager] Mensagem SSE em formato inválido:', e.data);
        }
      };

      this.eventSource.onerror = () => {
        this.disconnect();
        // Reconexão com backoff exponencial limitado a 16s
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.retryDelayMs = Math.min(this.retryDelayMs * 1.5, 16000);
            if (this.subscribers.size > 0) {
              this.ensureConnection();
            }
          }, this.retryDelayMs);
        }
      };
    } catch (err) {
      console.warn('[SyncManager] Erro ao instanciar EventSource:', err);
    }
  }

  private disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Hook universal para sincronização em tempo real de telas do OASIS.
 * Revalida dados imediatamente após mutações emitidas por qualquer usuário ou por retorno de foco.
 *
 * @param topicos Um ou mais tópicos monitorados ('RESERVAS', 'ENCOMENDAS', 'CHAVES', 'AREAS_LIVRES', 'AVISOS', 'PESSOAS')
 * @param onSync Função de recarregamento dos dados da página (ex: carregar())
 */
export function useSync(
  topicos: TopicoSync | TopicoSync[],
  onSync: (evento?: EventoSync) => void,
  deps: any[] = []
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const manager = SyncManager.getInstance();
    const listaTopicos = Array.isArray(topicos) ? topicos : [topicos];

    const dispararComDebounce = (evt?: EventoSync) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSyncRef.current(evt);
      }, 150);
    };

    const unsubs = listaTopicos.map(topico =>
      manager.subscribe(topico, (evento) => {
        dispararComDebounce(evento);
      })
    );

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubs.forEach(unsub => unsub());
    };
  }, deps);
}

/** Emite evento local/cross-tab imediatamente (útil após mutação otimista antes do SSE retornar) */
export function emitirSyncLocal(topico: TopicoSync, acao: 'CRIADO' | 'ATUALIZADO' | 'EXCLUIDO', detalhes?: any) {
  SyncManager.getInstance().notificarMudanca({ topico, acao, detalhes });
}

