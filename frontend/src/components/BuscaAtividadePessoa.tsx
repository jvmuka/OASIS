import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Badge, Botao, Cartao, EmptyState, Icone, Modal, mascararCPF, mascararCelular } from './ui';
import { formatarData, formatarHora } from '../utils/data';

/** Linha bruta retornada por GET /portaria/pessoas/busca (uma por vínculo ativo com unidade). */
type LinhaBusca = {
  id_pessoa: number;
  nome: string;
  cpf: string;
  celular: string | null;
  bloco: string | null;
  apartamento: string | null;
  tipo_vinculo: string | null;
  em_atividade: boolean;
  atividade_area: string | null;
  atividade_inicio: string | null;
  atividade_fim: string | null;
};

type UnidadeVinculo = { bloco: string | null; apartamento: string | null; tipo_vinculo: string | null };

/** Pessoa com as linhas da busca agrupadas por id_pessoa, preservando o vínculo de cada unidade. */
type PessoaAgrupada = Omit<LinhaBusca, 'bloco' | 'apartamento' | 'tipo_vinculo'> & {
  unidades: UnidadeVinculo[];
};

type ReservaResumo = {
  id_reserva: number;
  area: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  status?: string;
};

/** Resposta de GET /portaria/pessoas/:idPessoa/atividade. */
type AtividadeResposta = {
  pessoa: { id_pessoa: number; nome: string; cpf: string; celular: string | null };
  atividade_agora: ReservaResumo | null;
  proximas_reservas: ReservaResumo[];
  historico_90_dias: ReservaResumo[];
};

type TipoBadge = React.ComponentProps<typeof Badge>['tipo'];

const ROTULO_VINCULO: Record<string, string> = {
  PROPRIETARIO: 'Proprietário',
  INQUILINO: 'Inquilino',
  DEPENDENTE: 'Dependente',
  VISITANTE: 'Visitante',
  PRESTADOR_SERVICO: 'Prestador de serviço',
};

/** Todos os valores de status_reserva_enum (banco/01_banco_e_tipos.sql). */
const STATUS_RESERVA: Record<string, { tipo: TipoBadge; rotulo: string }> = {
  ATIVA: { tipo: 'info', rotulo: 'Ativa' },
  CONCLUIDA: { tipo: 'neutro', rotulo: 'Concluída' },
  CANCELADA: { tipo: 'perigo', rotulo: 'Cancelada' },
};

// Blocos são identificados por uma única letra, então a busca precisa aceitar 1 caractere.
const TAMANHO_MINIMO_BUSCA = 1;
const ATRASO_DEBOUNCE_MS = 400;

function rotuloVinculo(tipo: string | null) {
  return tipo ? ROTULO_VINCULO[tipo] || tipo : null;
}

function textoUnidade(u: UnidadeVinculo) {
  const unidade = u.bloco ? `Bloco ${u.bloco}, Apto ${u.apartamento}` : 'Unidade não vinculada';
  const vinculo = rotuloVinculo(u.tipo_vinculo);
  return vinculo ? `${unidade} · ${vinculo}` : unidade;
}

function textoHorario(inicio: string | null, fim: string | null) {
  return `${formatarHora(inicio)} – ${formatarHora(fim)}`;
}

/** Remove a máscara quando o termo parece um CPF digitado com pontos/traço (o banco guarda só dígitos). */
function normalizarTermo(termo: string) {
  return /^[\d.\-\s]+$/.test(termo) && /\d/.test(termo) ? termo.replace(/\D/g, '') : termo;
}

function agruparPorPessoa(linhas: LinhaBusca[]): PessoaAgrupada[] {
  const mapa = new Map<number, PessoaAgrupada>();
  for (const { bloco, apartamento, tipo_vinculo, ...pessoa } of linhas) {
    let atual = mapa.get(pessoa.id_pessoa);
    if (!atual) {
      atual = { ...pessoa, unidades: [] };
      mapa.set(pessoa.id_pessoa, atual);
    }
    if (bloco || apartamento || tipo_vinculo) {
      atual.unidades.push({ bloco, apartamento, tipo_vinculo });
    }
  }
  return Array.from(mapa.values());
}

/** Linha de reserva usada nas seções do modal de atividade. */
function LinhaReserva({ r, status }: { r: ReservaResumo; status: { tipo: TipoBadge; rotulo: string } }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.area}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatarData(r.data_hora_inicio)} · {textoHorario(r.data_hora_inicio, r.data_hora_fim)} · {r.numero_pessoas} pessoa(s)
        </p>
      </div>
      <Badge tipo={status.tipo} className="self-start sm:self-auto">{status.rotulo}</Badge>
    </div>
  );
}

function SecaoModal({ titulo, icone, children }: {
  titulo: string;
  icone: React.ComponentProps<typeof Icone>['nome'];
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Icone nome={icone} className="h-3.5 w-3.5 text-navy dark:text-sky-400" />
        {titulo}
      </h4>
      {children}
    </section>
  );
}

function TextoVazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
      {children}
    </p>
  );
}

export type PessoaEntradaAtividade = {
  id_pessoa: number;
  nome: string;
  cpf?: string | null;
  celular?: string | null;
  unidades?: { bloco?: string | null; apartamento?: string | null; tipo_vinculo?: string | null; vinculo?: string | null }[];
};

/** Modal somente leitura com contato, vínculos e atividade (agora, próximas e últimos 90 dias) de uma pessoa. */
export function ModalAtividadePessoa({ pessoa, fechar }: { pessoa: PessoaEntradaAtividade | null; fechar: () => void }) {
  const [dados, setDados] = useState<AtividadeResposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const idPessoa = pessoa?.id_pessoa;

  useEffect(() => {
    if (idPessoa == null) return;
    let cancelado = false;
    setDados(null);
    setErro('');
    setCarregando(true);
    api.get<AtividadeResposta>(`/portaria/pessoas/${idPessoa}/atividade`)
      .then(r => { if (!cancelado) setDados(r); })
      .catch(err => { if (!cancelado) setErro(err.message || 'Erro ao carregar a atividade da pessoa.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [idPessoa, tentativa]);

  if (!pessoa) return null;

  const contato = dados?.pessoa ?? pessoa;

  return (
    <Modal aberto fechar={fechar} titulo={pessoa.nome} largura="max-w-2xl">
      <div className="space-y-5">
        <SecaoModal titulo="Contato e vínculo" icone="user">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 p-4 dark:border-slate-800 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">CPF</p>
              <p className="text-sm text-slate-800 dark:text-slate-200">{contato.cpf ? mascararCPF(contato.cpf) : '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Celular</p>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {contato.celular ? mascararCelular(contato.celular) : 'Não informado'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {(pessoa.unidades?.length ?? 0) > 1 ? 'Unidades e vínculos' : 'Unidade e vínculo'}
              </p>
              {!pessoa.unidades || pessoa.unidades.length === 0 ? (
                <p className="text-sm text-slate-800 dark:text-slate-200">Unidade não vinculada</p>
              ) : (
                <ul className="space-y-0.5">
                  {pessoa.unidades.map((u, i) => (
                    <li key={i} className="text-sm text-slate-800 dark:text-slate-200">
                      {textoUnidade({
                        bloco: u.bloco ?? null,
                        apartamento: u.apartamento ?? null,
                        tipo_vinculo: u.tipo_vinculo ?? u.vinculo ?? null,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SecaoModal>

        {erro ? (
          <EmptyState
            icone="alert"
            titulo="Não foi possível carregar a atividade"
            descricao={erro}
            acao={<Botao tamanho="sm" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Botao>}
          />
        ) : carregando || !dados ? (
          <div className="flex h-24 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Carregando atividade...
          </div>
        ) : (
          <>
            <SecaoModal titulo="Atividade atual" icone="clock">
              {dados.atividade_agora ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <LinhaReserva r={dados.atividade_agora} status={{ tipo: 'sucesso', rotulo: 'Em andamento' }} />
                </div>
              ) : (
                <TextoVazio>Nenhuma atividade no momento.</TextoVazio>
              )}
            </SecaoModal>

            <SecaoModal titulo={`Próximas reservas (${dados.proximas_reservas.length})`} icone="calendar">
              {dados.proximas_reservas.length === 0 ? (
                <TextoVazio>Nenhuma reserva agendada.</TextoVazio>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 px-4 dark:divide-slate-800 dark:border-slate-800">
                  {dados.proximas_reservas.map(r => (
                    <LinhaReserva key={r.id_reserva} r={r} status={{ tipo: 'info', rotulo: 'Agendada' }} />
                  ))}
                </div>
              )}
            </SecaoModal>

            <SecaoModal titulo={`Histórico dos últimos 90 dias (${dados.historico_90_dias.length})`} icone="info">
              {dados.historico_90_dias.length === 0 ? (
                <TextoVazio>Nenhuma reserva nos últimos 90 dias.</TextoVazio>
              ) : (
                <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200/80 px-4 dark:divide-slate-800 dark:border-slate-800">
                  {dados.historico_90_dias.map(r => (
                    <LinhaReserva
                      key={r.id_reserva}
                      r={r}
                      status={STATUS_RESERVA[r.status || ''] || { tipo: 'neutro', rotulo: r.status || '-' }}
                    />
                  ))}
                </div>
              )}
            </SecaoModal>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Busca de pessoas da portaria com indicação de quem está em atividade agora. */
export default function BuscaAtividadePessoa({ versao = 0 }: { versao?: number }) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<PessoaAgrupada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [selecionada, setSelecionada] = useState<PessoaAgrupada | null>(null);
  const ultimaRequisicao = useRef(0);

  const termoLimpo = termo.trim();
  const buscaValida = termoLimpo.length >= TAMANHO_MINIMO_BUSCA;

  useEffect(() => {
    const id = ++ultimaRequisicao.current;
    setErro('');
    if (!buscaValida) {
      setResultados([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const timer = setTimeout(() => {
      api.get<LinhaBusca[]>(`/portaria/pessoas/busca?q=${encodeURIComponent(normalizarTermo(termoLimpo))}`)
        .then(r => { if (id === ultimaRequisicao.current) setResultados(agruparPorPessoa(r)); })
        .catch(err => { if (id === ultimaRequisicao.current) setErro(err.message || 'Erro ao buscar pessoas.'); })
        .finally(() => { if (id === ultimaRequisicao.current) setCarregando(false); });
    }, ATRASO_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [termoLimpo, buscaValida, versao, tentativa]);

  return (
    <Cartao>
      <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Icone nome="search" className="h-4 w-4 text-navy dark:text-sky-400" />
          Atividade do morador
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Busque por nome, CPF, bloco ou apartamento e selecione a pessoa para ver a atividade dela.
        </p>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={termo}
          onChange={e => setTermo(e.target.value)}
          placeholder="Nome, CPF, bloco ou apartamento..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder-slate-400 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-sky-500 transition-colors"
        />
        <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 pointer-events-none">
          <Icone nome="search" className="h-4 w-4" />
        </span>
        {termo && (
          <button
            type="button"
            onClick={() => setTermo('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Limpar busca"
          >
            <Icone nome="x" className="h-4 w-4" />
          </button>
        )}
      </div>

      {!buscaValida ? (
        <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Digite um nome, CPF, bloco ou apartamento para buscar.
        </p>
      ) : erro ? (
        <EmptyState
          icone="alert"
          titulo="Não foi possível realizar a busca"
          descricao={erro}
          acao={<Botao tamanho="sm" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Botao>}
        />
      ) : carregando ? (
        <div className="flex h-20 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Buscando...
        </div>
      ) : resultados.length === 0 ? (
        <EmptyState
          icone="users"
          titulo="Nenhuma pessoa encontrada"
          descricao="Confira o termo digitado. A busca considera apenas pessoas com cadastro ativo."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resultados.map(p => (
            <button
              key={p.id_pessoa}
              type="button"
              onClick={() => setSelecionada(p)}
              className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                p.em_atividade
                  ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:border-emerald-800'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{p.nome}</p>
              {p.unidades.length === 0 ? (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Unidade não vinculada</p>
              ) : (
                p.unidades.map((u, i) => (
                  <p key={i} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{textoUnidade(u)}</p>
                ))
              )}
              {p.em_atividade && (
                <div className="mt-2.5">
                  <Badge tipo="sucesso">
                    Em atividade agora: {p.atividade_area} · {textoHorario(p.atividade_inicio, p.atividade_fim)}
                  </Badge>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <ModalAtividadePessoa pessoa={selecionada} fechar={() => setSelecionada(null)} />
    </Cartao>
  );
}
