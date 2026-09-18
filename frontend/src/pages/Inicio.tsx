import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, sessaoAtual } from '../api';
import { Cartao, Titulo, Icone, EmptyState, Botao } from '../components/ui';

type IconeNome = React.ComponentProps<typeof Icone>['nome'];

type Reserva = {
  id_reserva: number;
  area: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: 'ATIVA' | 'CANCELADA' | 'CONCLUIDA';
};
type AvisoMeu = { id_aviso: number; lido: boolean };
type MinhaEncomenda = { id_encomenda: number; status: 'AGUARDANDO_RETIRADA' | 'RETIRADA' | 'DEVOLVIDA' };
type EncomendaPortaria = { id_encomenda: number; status: string };
type Chave = { id_chave: number; status: 'DISPONIVEL' | 'EMPRESTADA' | 'EXTRAVIADA' };

type PerfilPrincipal = 'SINDICO' | 'PORTEIRO' | 'MORADOR';

const ROTULO_PERFIL: Record<PerfilPrincipal, string> = {
  SINDICO: 'Síndico',
  PORTEIRO: 'Porteiro',
  MORADOR: 'Morador',
};

function saudacaoPorHorario() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Cartao numerico (ou textual) de resumo: sempre mostra um valor, nunca fica em branco. */
function CartaoResumo({
  titulo,
  valor,
  legenda,
  icone,
  cor,
  acao,
}: {
  titulo: string;
  valor: React.ReactNode;
  legenda: React.ReactNode;
  icone: IconeNome;
  cor: string;
  acao?: React.ReactNode;
}) {
  return (
    <Cartao className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</p>
        <p className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-navy dark:text-sky-400">{valor}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{legenda}</p>
        {acao}
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${cor}`}>
        <Icone nome={icone} className="h-6 w-6" />
      </div>
    </Cartao>
  );
}

/** Atalho grande e clicavel para uma tela do sistema. */
function Atalho({ to, rotulo, descricao, icone }: { to: string; rotulo: string; descricao: string; icone: IconeNome }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all duration-150 hover:border-navy/30 hover:shadow-card active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy transition-colors group-hover:bg-navy group-hover:text-white dark:bg-slate-800 dark:text-sky-400 dark:group-hover:bg-sky-600 dark:group-hover:text-white">
        <Icone nome={icone} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{rotulo}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{descricao}</p>
      </div>
      <Icone
        nome="chevronRight"
        className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy dark:text-slate-600 dark:group-hover:text-sky-400"
      />
    </Link>
  );
}

/** Tela de boas-vindas: saudacao, resumo do perfil ativo e atalhos rapidos. */
export default function Inicio() {
  const s = sessaoAtual();
  const tipos = s ? s.perfis.map(p => p.tipo) : [];
  const perfilPrincipal: PerfilPrincipal = tipos.includes('SINDICO')
    ? 'SINDICO'
    : tipos.includes('PORTEIRO')
      ? 'PORTEIRO'
      : 'MORADOR';

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [avisos, setAvisos] = useState<AvisoMeu[]>([]);
  const [minhasEncomendas, setMinhasEncomendas] = useState<MinhaEncomenda[]>([]);
  const [encomendasPortaria, setEncomendasPortaria] = useState<EncomendaPortaria[]>([]);
  const [chaves, setChaves] = useState<Chave[]>([]);

  const carregar = () => {
    setCarregando(true);
    setErro(null);

    let chamadas: Promise<any>[];
    if (perfilPrincipal === 'MORADOR') {
      chamadas = [
        api.get<Reserva[]>('/reservas/minhas'),
        api.get<AvisoMeu[]>('/avisos/meus'),
        api.get<MinhaEncomenda[]>('/portaria/minhas-encomendas'),
      ];
    } else if (perfilPrincipal === 'PORTEIRO') {
      chamadas = [
        api.get<EncomendaPortaria[]>('/portaria/encomendas?status=AGUARDANDO_RETIRADA'),
        api.get<Chave[]>('/portaria/chaves'),
      ];
    } else {
      chamadas = [
        api.get<EncomendaPortaria[]>('/portaria/encomendas?status=AGUARDANDO_RETIRADA'),
        api.get<Chave[]>('/portaria/chaves'),
        api.get<AvisoMeu[]>('/avisos/meus'),
      ];
    }

    Promise.all(chamadas)
      .then(res => {
        if (perfilPrincipal === 'MORADOR') {
          setReservas(res[0]);
          setAvisos(res[1]);
          setMinhasEncomendas(res[2]);
        } else if (perfilPrincipal === 'PORTEIRO') {
          setEncomendasPortaria(res[0]);
          setChaves(res[1]);
        } else {
          setEncomendasPortaria(res[0]);
          setChaves(res[1]);
          setAvisos(res[2]);
        }
      })
      .catch(err => setErro(err.message || 'Erro ao carregar o resumo.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (!s) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return null;

  const primeiroNome = s.pessoa.nome.split(' ')[0];
  const unidadesTexto = s.unidades.length
    ? s.unidades.map(u => `${u.bloco} - Apto ${u.numero_apartamento}`).join(', ')
    : null;

  let cardsResumo: React.ReactNode[] = [];
  let atalhos: { to: string; rotulo: string; descricao: string; icone: IconeNome }[] = [];

  if (perfilPrincipal === 'MORADOR') {
    const agora = new Date();
    const ativas = reservas.filter(
      r => r.status === 'ATIVA' && new Date(r.data_hora_fim) > agora
    );
    const proxima = ativas
      .filter(r => new Date(r.data_hora_inicio) > agora)
      .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())[0];
    const naoLidos = avisos.filter(a => !a.lido).length;
    const aguardando = minhasEncomendas.filter(e => e.status === 'AGUARDANDO_RETIRADA').length;

    cardsResumo = [
      <CartaoResumo
        key="proxima"
        titulo="Próxima Reserva"
        valor={proxima ? proxima.area : 'Nenhuma'}
        legenda={proxima ? formatarDataHora(proxima.data_hora_inicio) : 'Nenhuma reserva agendada'}
        icone="calendar"
        cor="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60"
        acao={
          !proxima && (
            <Link to="/morador/reservar" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline dark:text-sky-400">
              Fazer uma reserva <Icone nome="chevronRight" className="h-3 w-3" />
            </Link>
          )
        }
      />,
      <CartaoResumo
        key="ativas"
        titulo="Reservas Ativas"
        valor={ativas.length}
        legenda={ativas.length ? 'Confirmadas' : 'Nenhuma no momento'}
        icone="clock"
        cor="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60"
      />,
      <CartaoResumo
        key="avisos"
        titulo="Avisos Não Lidos"
        valor={naoLidos}
        legenda={naoLidos ? 'No mural' : 'Tudo em dia'}
        icone="pin"
        cor="bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
      />,
      <CartaoResumo
        key="encomendas"
        titulo="Encomendas"
        valor={aguardando}
        legenda={aguardando ? 'Aguardando retirada' : 'Nenhuma pendência'}
        icone="package"
        cor="bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60"
        acao={
          <Link to="/morador/encomendas" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline dark:text-sky-400">
            Ver encomendas <Icone nome="chevronRight" className="h-3 w-3" />
          </Link>
        }
      />,
    ];

    atalhos = [
      { to: '/morador/reservar', rotulo: 'Nova Reserva', descricao: 'Reserve as áreas comuns do condomínio', icone: 'calendar' },
      { to: '/morador/reservas', rotulo: 'Minhas Reservas', descricao: 'Veja, acompanhe e cancele suas reservas', icone: 'clock' },
      { to: '/morador/encomendas', rotulo: 'Minhas Encomendas', descricao: 'Acompanhe pacotes na portaria e retiradas', icone: 'package' },
      { to: '/mural', rotulo: 'Mural de Avisos', descricao: 'Comunicados do condomínio', icone: 'pin' },
    ];
  } else if (perfilPrincipal === 'PORTEIRO') {
    const emprestadas = chaves.filter(c => c.status === 'EMPRESTADA').length;

    cardsResumo = [
      <CartaoResumo
        key="encomendas"
        titulo="Encomendas"
        valor={encomendasPortaria.length}
        legenda={encomendasPortaria.length ? 'Aguardando retirada' : 'Nenhuma pendência'}
        icone="package"
        cor="bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
      />,
      <CartaoResumo
        key="chaves"
        titulo="Chaves"
        valor={emprestadas}
        legenda={emprestadas ? 'Emprestadas no momento' : 'Todas disponíveis'}
        icone="key"
        cor="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60"
      />,
    ];

    atalhos = [
      { to: '/portaria/painel', rotulo: 'Painel da Portaria', descricao: 'Ocupação agora, agenda do dia e busca de moradores', icone: 'building' },
      { to: '/portaria/encomendas', rotulo: 'Encomendas', descricao: 'Registrar chegada e dar baixa', icone: 'package' },
      { to: '/portaria/chaves', rotulo: 'Controle de Chaves', descricao: 'Empréstimo e devolução do claviculário', icone: 'key' },
      { to: '/mural', rotulo: 'Mural de Avisos', descricao: 'Comunicados do condomínio', icone: 'pin' },
    ];
  } else {
    const emprestadas = chaves.filter(c => c.status === 'EMPRESTADA').length;
    const naoLidos = avisos.filter(a => !a.lido).length;

    cardsResumo = [
      <CartaoResumo
        key="encomendas"
        titulo="Encomendas"
        valor={encomendasPortaria.length}
        legenda={encomendasPortaria.length ? 'Aguardando retirada' : 'Nenhuma pendência'}
        icone="package"
        cor="bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
      />,
      <CartaoResumo
        key="chaves"
        titulo="Chaves"
        valor={emprestadas}
        legenda={emprestadas ? 'Emprestadas no momento' : 'Todas disponíveis'}
        icone="key"
        cor="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60"
      />,
      <CartaoResumo
        key="avisos"
        titulo="Avisos Não Lidos"
        valor={naoLidos}
        legenda={naoLidos ? 'No mural' : 'Tudo em dia'}
        icone="pin"
        cor="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60"
      />,
    ];

    atalhos = [
      { to: '/sindico/painel', rotulo: 'Painel Geral', descricao: 'Indicadores consolidados do condomínio', icone: 'home' },
      { to: '/portaria/painel', rotulo: 'Painel da Portaria', descricao: 'Ocupação agora, agenda do dia e busca de moradores', icone: 'building' },
      { to: '/sindico/areas', rotulo: 'Áreas Comuns', descricao: 'Regras, horários e manutenções', icone: 'building' },
      { to: '/sindico/pessoas', rotulo: 'Pessoas & Unidades', descricao: 'Cadastro de moradores e blocos', icone: 'users' },
      { to: '/sindico/avisos', rotulo: 'Publicar Avisos', descricao: 'Comunicar o condomínio', icone: 'megaphone' },
    ];
  }

  return (
    <div className="space-y-6">
      <Titulo
        sub={ROTULO_PERFIL[perfilPrincipal] + (unidadesTexto ? ` • ${unidadesTexto}` : '')}
        icone={<Icone nome="home" className="h-5 w-5" />}
      >
        {`${saudacaoPorHorario()}, ${primeiroNome}`}
      </Titulo>

      {carregando ? (
        <div className="flex h-48 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <svg className="h-5 w-5 animate-spin text-navy dark:text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Carregando seu resumo...</span>
          </div>
        </div>
      ) : erro ? (
        <Cartao>
          <EmptyState
            icone="home"
            titulo="Não foi possível carregar o seu resumo"
            descricao={erro}
            acao={
              <Botao onClick={carregar} variante="primario" tamanho="sm">
                Tentar Novamente
              </Botao>
            }
          />
        </Cartao>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cardsResumo}</div>

          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Acesso Rápido
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atalhos.map(a => (
                <Atalho key={a.to} {...a} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
