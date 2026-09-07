/**
 * Cliente HTTP unico do frontend.
 * - guarda o token da sessao no localStorage;
 * - anexa Authorization: Bearer em toda chamada;
 * - converte respostas de erro da API em Error com a mensagem legivel
 *   (inclusive as mensagens RN01..RN14 vindas dos gatilhos do banco).
 */
import { IMAGEM_MAX_MB } from './constants';

const TOKEN_KEY = 'oasis_token';
const SESSAO_KEY = 'oasis_sessao';

export type Perfil = { id_perfil: number; tipo: 'MORADOR' | 'SINDICO' | 'PORTEIRO' };
export type Sessao = {
  pessoa: { id_pessoa: number; nome: string; email: string };
  perfis: Perfil[];
  unidades: { bloco: string; numero_apartamento: string }[];
};

export function salvarSessao(token: string, sessao: Sessao) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
}
export function sessaoAtual(): Sessao | null {
  const s = localStorage.getItem(SESSAO_KEY);
  return s ? JSON.parse(s) : null;
}
export function sair() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSAO_KEY);
}

/** Rota de pouso apos o login (e do "Inicio"/logo do cabecalho): cada perfil tem seu painel. */
export function painelInicial(sessao: Sessao): string {
  const tipos = sessao.perfis.map(p => p.tipo);
  if (tipos.includes('SINDICO')) return '/inicio';
  if (tipos.includes('PORTEIRO')) return '/portaria/painel';
  return '/inicio';
}

/**
 * Gera uma mensagem legivel quando a resposta de erro nao veio em JSON
 * (ex.: paginas de erro em HTML devolvidas pelo nginx antes de chegar no backend,
 * como o 413 do proxy quando o corpo excede client_max_body_size).
 */
function mensagemPorStatus(status: number, contexto: 'upload' | 'geral'): string {
  if (status === 413) {
    return contexto === 'upload'
      ? `O arquivo enviado excede o tamanho maximo permitido (${IMAGEM_MAX_MB} MB).`
      : 'O conteudo enviado excede o tamanho maximo permitido pelo servidor.';
  }
  if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return `Erro ${status}.`;
}

/** Interpreta o corpo da resposta como JSON; se falhar, cai numa mensagem por codigo HTTP. */
async function parseResposta(r: Response, contexto: 'upload' | 'geral' = 'geral'): Promise<any> {
  const texto = await r.text();
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return { message: mensagemPorStatus(r.status, contexto) };
  }
}

async function req<T>(metodo: string, rota: string, corpo?: unknown): Promise<T> {
  const r = await fetch('/api' + rota, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem(TOKEN_KEY)
        ? { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) }
        : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await parseResposta(r);
  if (!r.ok) {
    if (r.status === 401 && !rota.startsWith('/auth')) {
      sair();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const msg = Array.isArray(dados.message) ? dados.message.join('; ') : dados.message;
    throw new Error(msg || `Erro ${r.status}`);
  }
  return dados as T;
}

export const api = {
  get: <T>(rota: string) => req<T>('GET', rota),
  post: <T>(rota: string, corpo?: unknown) => req<T>('POST', rota, corpo),
  put: <T>(rota: string, corpo?: unknown) => req<T>('PUT', rota, corpo),
  patch: <T>(rota: string, corpo?: unknown) => req<T>('PATCH', rota, corpo),
  delete: <T>(rota: string) => req<T>('DELETE', rota),
  /** Envia um arquivo via multipart/form-data. */
  upload: async <T>(rota: string, campo: string, arquivo: File): Promise<T> => {
    const form = new FormData();
    form.append(campo, arquivo);
    const r = await fetch('/api' + rota, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem(TOKEN_KEY)
          ? { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) }
          : {}),
      },
      body: form,
    });
    const dados = await parseResposta(r, 'upload');
    if (!r.ok) {
      const msg = Array.isArray(dados.message) ? dados.message.join('; ') : dados.message;
      throw new Error(msg || `Erro ${r.status}`);
    }
    return dados as T;
  },
};

