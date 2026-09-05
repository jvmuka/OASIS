import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Badge, Botao, Cartao, EmptyState, Icone, Titulo } from '../../components/ui';

export type EncomendaMorador = {
  id_encomenda: number;
  descricao: string | null;
  tamanho: 'PEQUENO' | 'MEDIO' | 'GRANDE';
  status: 'AGUARDANDO_RETIRADA' | 'RETIRADA' | 'DEVOLVIDA';
  data_hora_recebimento: string;
  data_hora_retirada: string | null;
  retirado_por: 'PROPRIO' | 'MORADOR_UNIDADE' | 'TERCEIRO' | null;
  nome_retirante: string | null;
  destinatario: string;
  recebido_por: string;
  entregue_por: string | null;
  bloco: string | null;
  apartamento: string | null;
  tipo_vinculo: string | null;
  grau_parentesco: string | null;
  para_mim: boolean;
};

function formatarDataHora(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ROTULO_TAMANHO: Record<string, { rotulo: string; icone: string; cor: string }> = {
  PEQUENO: { rotulo: 'Pequeno (Envelope/Saco)', icone: '✉️', cor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  MEDIO: { rotulo: 'Médio (Caixa Padrão)', icone: '📦', cor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  GRANDE: { rotulo: 'Grande (Volume / Eletro)', icone: '🏷️', cor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' },
};

export default function MinhasEncomendas() {
  const [encomendas, setEncomendas] = useState<EncomendaMorador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'AGUARDANDO' | 'RETIRADAS' | 'TODAS'>('AGUARDANDO');
  const [busca, setBusca] = useState('');

  const carregar = () => {
    setCarregando(true);
    setErro(null);
    api
      .get<EncomendaMorador[]>('/portaria/minhas-encomendas')
      .then(dados => setEncomendas(dados))
      .catch(err => setErro(err.message || 'Erro ao carregar encomendas.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const aguardando = encomendas.filter(e => e.status === 'AGUARDANDO_RETIRADA');
  const retiradas = encomendas.filter(e => e.status === 'RETIRADA');

  const listaFiltrada = encomendas
    .filter(e => {
      if (abaAtiva === 'AGUARDANDO') return e.status === 'AGUARDANDO_RETIRADA';
      if (abaAtiva === 'RETIRADAS') return e.status === 'RETIRADA';
      return true;
    })
    .filter(e => {
      if (!busca.trim()) return true;
      const b = busca.toLowerCase();
      return (
        (e.descricao || '').toLowerCase().includes(b) ||
        (e.destinatario || '').toLowerCase().includes(b) ||
        (e.recebido_por || '').toLowerCase().includes(b) ||
        (e.entregue_por || '').toLowerCase().includes(b) ||
        (e.nome_retirante || '').toLowerCase().includes(b) ||
        (e.apartamento || '').toLowerCase().includes(b)
      );
    });

  return (
    <div className="space-y-6">
      {/* Topo com Título e Botão de Atualizar */}
      <Titulo
        sub="Acompanhe as encomendas recebidas na portaria e o histórico de retiradas da sua unidade."
        icone={<Icone nome="package" className="h-6 w-6" />}
        acao={
          <Botao
            variante="claro"
            onClick={carregar}
            carregando={carregando}
            icone={<Icone nome="filter" className="h-4 w-4" />}
          >
            Atualizar Lista
          </Botao>
        }
      >
        Minhas Encomendas
      </Titulo>

      {/* Alerta de Encomendas Aguardando Retirada */}
      {aguardando.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/40">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
            <Icone nome="package" className="h-5 w-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {aguardando.length === 1
                ? 'Você possui 1 encomenda aguardando retirada!'
                : `Você possui ${aguardando.length} encomendas aguardando retirada!`}
            </h3>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/90">
              Retire na portaria do condomínio informando o nome do destinatário ou número do apartamento.
            </p>
          </div>
        </div>
      )}

      {/* Cartões de Resumo / Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao className="flex items-center justify-between p-5 border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Aguardando Retirada
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {aguardando.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {aguardando.length > 0 ? 'Disponíveis na guarita' : 'Nenhuma pendência'}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <Icone nome="package" className="h-6 w-6" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-5 border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Já Retiradas
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {retiradas.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Histórico entregue com sucesso
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <Icone nome="check" className="h-6 w-6" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-5 border-l-4 border-l-navy dark:border-l-sky-500">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Recebidas
            </p>
            <p className="mt-1.5 text-3xl font-extrabold text-navy dark:text-sky-400">
              {encomendas.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Registradas para sua unidade
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-300 border border-navy-100 dark:border-slate-700">
            <Icone nome="building" className="h-6 w-6" />
          </div>
        </Cartao>
      </div>

      {/* Barra de Abas e Busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            id="tab-aguardando"
            type="button"
            onClick={() => setAbaAtiva('AGUARDANDO')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer ${
              abaAtiva === 'AGUARDANDO'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Icone nome="package" className="h-4 w-4" />
            <span>Aguardando Retirada</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                abaAtiva === 'AGUARDANDO'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              {aguardando.length}
            </span>
          </button>

          <button
            id="tab-retiradas"
            type="button"
            onClick={() => setAbaAtiva('RETIRADAS')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer ${
              abaAtiva === 'RETIRADAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Icone nome="check" className="h-4 w-4" />
            <span>Já Retiradas</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                abaAtiva === 'RETIRADAS'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
              }`}
            >
              {retiradas.length}
            </span>
          </button>

          <button
            id="tab-todas"
            type="button"
            onClick={() => setAbaAtiva('TODAS')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer ${
              abaAtiva === 'TODAS'
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <span>Todas</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                abaAtiva === 'TODAS'
                  ? 'bg-navy-700 text-white dark:bg-sky-700'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {encomendas.length}
            </span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-64">
          <input
            id="busca-encomendas"
            type="text"
            placeholder="Buscar encomenda..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-navy focus:ring-2 focus:ring-navy/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          <Icone
            nome="search"
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icone nome="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tratamento de Erro */}
      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-semibold">{erro}</p>
        </div>
      )}

      {/* Lista de Encomendas */}
      {carregando ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-sky-400" />
          <p className="mt-3 text-sm">Carregando suas encomendas...</p>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <EmptyState
          icone="package"
          titulo={
            abaAtiva === 'AGUARDANDO'
              ? 'Nenhuma encomenda aguardando retirada'
              : abaAtiva === 'RETIRADAS'
              ? 'Nenhuma encomenda retirada no histórico'
              : 'Nenhuma encomenda encontrada'
          }
          descricao={
            abaAtiva === 'AGUARDANDO'
              ? 'Quando um pacote chegar para a sua unidade, a portaria fará o registro e ele aparecerá aqui com aviso de recebimento.'
              : busca
              ? 'Nenhum resultado corresponde aos termos da sua pesquisa.'
              : 'Nenhum registro de encomenda disponível no momento.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {listaFiltrada.map(enc => {
            const tamInfo = ROTULO_TAMANHO[enc.tamanho] || ROTULO_TAMANHO.MEDIO;
            const isPendente = enc.status === 'AGUARDANDO_RETIRADA';

            return (
              <Cartao
                key={enc.id_encomenda}
                className={`flex flex-col justify-between overflow-hidden transition-all duration-150 hover:shadow-card ${
                  isPendente
                    ? 'border-amber-200/90 shadow-soft ring-1 ring-amber-400/20 dark:border-amber-800/60'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Topo do Cartão: Status e Tamanho */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label="pacote">
                        {tamInfo.icone}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tamInfo.cor}`}
                      >
                        {tamInfo.rotulo}
                      </span>
                    </div>

                    <Badge tipo={isPendente ? 'aviso' : 'sucesso'}>
                      {isPendente ? 'Aguardando Retirada' : 'Retirada'}
                    </Badge>
                  </div>

                  {/* Descrição Principal */}
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {enc.descricao || 'Pacote sem descrição informada'}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Icone nome="user" className="h-3.5 w-3.5 text-slate-400" />
                        Destinatário:{' '}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {enc.destinatario} {enc.para_mim ? '(Você)' : ''}
                        </strong>
                      </span>
                      {enc.apartamento && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Icone nome="home" className="h-3.5 w-3.5 text-slate-400" />
                            Apto {enc.apartamento} {enc.bloco ? `(Bloco ${enc.bloco})` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dados de Recebimento na Guarita */}
                  <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Icone nome="calendar" className="h-3.5 w-3.5 text-slate-400" />
                        Chegada na portaria:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatarDataHora(enc.data_hora_recebimento)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Icone nome="shield" className="h-3.5 w-3.5 text-slate-400" />
                        Recebido pelo porteiro:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {enc.recebido_por}
                      </span>
                    </div>
                  </div>

                  {/* Se já foi Retirada: Informações de Entrega */}
                  {!isPendente && (
                    <div className="rounded-xl bg-emerald-50/70 p-3 text-xs dark:bg-emerald-950/30 space-y-1.5 border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Icone nome="check" className="h-3.5 w-3.5 text-emerald-600" />
                          Data da retirada:
                        </span>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                          {formatarDataHora(enc.data_hora_retirada)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-emerald-800 dark:text-emerald-300">Retirado por:</span>
                        <span className="font-medium text-emerald-900 dark:text-emerald-200">
                          {enc.retirado_por === 'PROPRIO'
                            ? 'Próprio Destinatário'
                            : enc.retirado_por === 'MORADOR_UNIDADE'
                            ? 'Familiar / Morador da Unidade'
                            : enc.nome_retirante
                            ? `Terceiro (${enc.nome_retirante})`
                            : 'Terceiro Autorizado'}
                        </span>
                      </div>

                      {enc.entregue_por && (
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-800 dark:text-emerald-300">Entregue por:</span>
                          <span className="font-medium text-emerald-900 dark:text-emerald-200">
                            {enc.entregue_por}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rodapé do Cartão */}
                <div
                  className={`border-t px-5 py-3 text-xs flex items-center justify-between ${
                    isPendente
                      ? 'bg-amber-50/50 border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300'
                      : 'bg-slate-50/60 border-slate-100 text-slate-500 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span className="font-medium">
                    {isPendente
                      ? '📍 Disponível para retirada na guarita'
                      : '✓ Entrega finalizada'}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Cód. #{enc.id_encomenda}
                  </span>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}
    </div>
  );
}
