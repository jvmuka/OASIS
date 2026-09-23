import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, sessaoAtual } from '../api';
import { Cartao, Titulo, Icone, EmptyState, Botao } from '../components/ui';
import { formatarDataHora } from '../utils/data';

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
type MinhaChaveEmprestada = {
  id_entrega_chave: number;
  id_chave: number;
  codigo: string;
  status_chave: string;
  id_area_comum: number;
  area: string;
  area_imagem?: string | null;
  data_hora_retirada: string;
  id_pessoa: number;
  responsavel: string;
  contato_responsavel?: string;
  apartamento?: string;
  bloco?: string;
  com_voce: boolean;
};

type PerfilPrincipal = 'ADMINISTRADOR' | 'SINDICO' | 'PORTEIRO' | 'MORADOR';

const ROTULO_PERFIL: Record<PerfilPrincipal, string> = {
  ADMINISTRADOR: 'Administrador',
  SINDICO: 'Administrador',
  PORTEIRO: 'Porteiro',
  MORADOR: 'Morador',
};

function saudacaoPorHorario() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
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

/** Super Card interativo de acao direta e status para o perfil de Morador. */
function CardAcaoMorador({
  to,
  titulo,
  icone,
  corIcone,
  badge,
  destaque,
  descricao,
  textoAcao,
}: {
  to: string;
  titulo: string;
  icone: IconeNome;
  corIcone: {
    bg: string;
    text: string;
    border: string;
    darkBg: string;
    darkText: string;
    darkBorder: string;
  };
  badge?: {
    texto: string;
    tipo?: 'azul' | 'verde' | 'ambar' | 'indigo' | 'cinza';
  };
  destaque?: {
    principal: string;
    secundario?: string;
  };
  descricao: string;
  textoAcao: string;
}) {
  const badgeClasses = {
    azul: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    verde: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    ambar: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    cinza: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  }[badge?.tipo || 'cinza'];

  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-navy/30 hover:shadow-card active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500/40"
    >
      <div>
        {/* Topo: Ícone temático + Badge de status */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${corIcone.bg} ${corIcone.text} ${corIcone.border} ${corIcone.darkBg} ${corIcone.darkText} ${corIcone.darkBorder}`}
          >
            <Icone nome={icone} className="h-6 w-6" />
          </div>
          {badge && (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight ${badgeClasses}`}>
              {badge.texto}
            </span>
          )}
        </div>

        {/* Informações centrais */}
        <div className="mt-4">
          <h2 className="text-base font-bold text-slate-900 transition-colors group-hover:text-navy dark:text-slate-100 dark:group-hover:text-sky-400">
            {titulo}
          </h2>

          <div className="mt-2 min-h-[46px]">
            {destaque ? (
              <>
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                  {destaque.principal}
                </p>
                {destaque.secundario && (
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {destaque.secundario}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                {descricao}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé integrado com botão/ação */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
        <span className="text-xs font-bold text-navy group-hover:underline dark:text-sky-400">
          {textoAcao}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover:bg-navy group-hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-sky-500 dark:group-hover:text-slate-950">
          <Icone nome="chevronRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/** Tela de boas-vindas: saudacao, resumo do perfil ativo e atalhos rapidos. */
export default function Inicio() {
  const s = sessaoAtual();
  const tipos = s ? s.perfis.map(p => p.tipo) : [];
  const perfilPrincipal: PerfilPrincipal = tipos.includes('MORADOR')
    ? 'MORADOR'
    : (tipos.includes('ADMINISTRADOR') || tipos.includes('SINDICO'))
      ? 'ADMINISTRADOR'
      : tipos.includes('PORTEIRO')
        ? 'PORTEIRO'
        : 'MORADOR';

  const rotuloPapeis = Array.from(
    new Set(
      tipos.map(t =>
        t === 'SINDICO' || t === 'ADMINISTRADOR'
          ? 'Administrador'
          : t === 'PORTEIRO'
          ? 'Porteiro'
          : 'Morador'
      )
    )
  ).join(' • ');

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [avisos, setAvisos] = useState<AvisoMeu[]>([]);
  const [minhasEncomendas, setMinhasEncomendas] = useState<MinhaEncomenda[]>([]);
  const [encomendasPortaria, setEncomendasPortaria] = useState<EncomendaPortaria[]>([]);
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [minhasChaves, setMinhasChaves] = useState<MinhaChaveEmprestada[]>([]);

  const carregar = () => {
    setCarregando(true);
    setErro(null);

    const pMinhasChaves = api.get<MinhaChaveEmprestada[]>('/portaria/minhas-chaves').catch(() => []);

    let chamadas: Promise<any>[];
    if (perfilPrincipal === 'MORADOR') {
      chamadas = [
        api.get<Reserva[]>('/reservas/minhas'),
        api.get<AvisoMeu[]>('/avisos/meus'),
        api.get<MinhaEncomenda[]>('/portaria/minhas-encomendas'),
        pMinhasChaves,
      ];
    } else if (perfilPrincipal === 'PORTEIRO') {
      chamadas = [
        api.get<EncomendaPortaria[]>('/portaria/encomendas?status=AGUARDANDO_RETIRADA'),
        api.get<Chave[]>('/portaria/chaves'),
        pMinhasChaves,
      ];
    } else {
      chamadas = [
        api.get<EncomendaPortaria[]>('/portaria/encomendas?status=AGUARDANDO_RETIRADA'),
        api.get<Chave[]>('/portaria/chaves'),
        api.get<AvisoMeu[]>('/avisos/meus'),
        pMinhasChaves,
      ];
    }

    Promise.all(chamadas)
      .then(res => {
        if (perfilPrincipal === 'MORADOR') {
          setReservas(res[0]);
          setAvisos(res[1]);
          setMinhasEncomendas(res[2]);
          setMinhasChaves(res[3] || []);
        } else if (perfilPrincipal === 'PORTEIRO') {
          setEncomendasPortaria(res[0]);
          setChaves(res[1]);
          setMinhasChaves(res[2] || []);
        } else {
          setEncomendasPortaria(res[0]);
          setChaves(res[1]);
          setAvisos(res[2]);
          setMinhasChaves(res[3] || []);
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
  let cardsMorador: React.ReactNode[] = [];
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

    cardsMorador = [
      <CardAcaoMorador
        key="nova-reserva"
        to="/morador/reservar"
        titulo="Nova Reserva"
        icone="calendar"
        corIcone={{
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          border: 'border-blue-100',
          darkBg: 'dark:bg-blue-950/40',
          darkText: 'dark:text-blue-400',
          darkBorder: 'dark:border-blue-900/60',
        }}
        badge={{ texto: 'Disponível', tipo: 'azul' }}
        destaque={{
          principal: 'Espaços de Convivência & Lazer',
          secundario: 'Churrasqueiras, salão de festas e áreas sociais',
        }}
        descricao="Reserve as áreas comuns e espaços de lazer do condomínio."
        textoAcao="Agendar Área"
      />,
      <CardAcaoMorador
        key="minhas-reservas"
        to="/morador/reservas"
        titulo="Minhas Reservas"
        icone="clock"
        corIcone={{
          bg: 'bg-indigo-50',
          text: 'text-indigo-600',
          border: 'border-indigo-100',
          darkBg: 'dark:bg-indigo-950/40',
          darkText: 'dark:text-indigo-400',
          darkBorder: 'dark:border-indigo-900/60',
        }}
        badge={
          ativas.length > 0
            ? { texto: `${ativas.length} ${ativas.length === 1 ? 'ativa' : 'ativas'}`, tipo: 'indigo' }
            : { texto: '0 ativas', tipo: 'cinza' }
        }
        destaque={
          proxima
            ? {
                principal: proxima.area,
                secundario: formatarDataHora(proxima.data_hora_inicio, false),
              }
            : {
                principal: 'Nenhuma reserva agendada',
                secundario: 'Acompanhe e gerencie seus agendamentos',
              }
        }
        descricao="Veja, acompanhe e cancele suas reservas ativas."
        textoAcao="Gerenciar Reservas"
      />,
      <CardAcaoMorador
        key="minhas-encomendas"
        to="/morador/encomendas"
        titulo="Minhas Encomendas"
        icone="package"
        corIcone={{
          bg: 'bg-emerald-50',
          text: 'text-emerald-600',
          border: 'border-emerald-100',
          darkBg: 'dark:bg-emerald-950/40',
          darkText: 'dark:text-emerald-400',
          darkBorder: 'dark:border-emerald-900/60',
        }}
        badge={
          aguardando > 0
            ? { texto: `${aguardando} ${aguardando === 1 ? 'pendente' : 'pendentes'}`, tipo: 'verde' }
            : { texto: 'Em dia', tipo: 'cinza' }
        }
        destaque={
          aguardando > 0
            ? {
                principal: `${aguardando} ${aguardando === 1 ? 'pacote na portaria' : 'pacotes na portaria'}`,
                secundario: 'Aguardando sua retirada',
              }
            : {
                principal: 'Nenhum pacote pendente',
                secundario: 'Histórico de entregas e encomendas',
              }
        }
        descricao="Acompanhe pacotes recebidos na portaria e retiradas."
        textoAcao="Ver Encomendas"
      />,
      <CardAcaoMorador
        key="mural-avisos"
        to="/mural"
        titulo="Mural de Avisos"
        icone="pin"
        corIcone={{
          bg: 'bg-amber-50',
          text: 'text-amber-600',
          border: 'border-amber-100',
          darkBg: 'dark:bg-amber-950/40',
          darkText: 'dark:text-amber-400',
          darkBorder: 'dark:border-amber-900/60',
        }}
        badge={
          naoLidos > 0
            ? { texto: `${naoLidos} ${naoLidos === 1 ? 'não lido' : 'não lidos'}`, tipo: 'ambar' }
            : { texto: 'Lidos', tipo: 'cinza' }
        }
        destaque={
          naoLidos > 0
            ? {
                principal: `${naoLidos} ${naoLidos === 1 ? 'novo comunicado' : 'novos comunicados'}`,
                secundario: 'Informativos da administração',
              }
            : {
                principal: 'Todos os avisos estão em dia',
                secundario: 'Comunicados e informativos do condomínio',
              }
        }
        descricao="Fique por dentro das novidades, manutenções e comunicados."
        textoAcao="Acessar Mural"
      />,
    ];
  } else if (perfilPrincipal === 'PORTEIRO') {
    const emprestadasGeral = chaves.filter(c => c.status === 'EMPRESTADA').length;
    const minhasEmprestadas = minhasChaves.length;

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
        titulo={minhasEmprestadas > 0 ? "Chaves (Sua Família)" : "Chaves do Condomínio"}
        valor={
          minhasEmprestadas > 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              {minhasEmprestadas} <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">com sua família</span>
            </span>
          ) : (
            emprestadasGeral
          )
        }
        legenda={
          minhasEmprestadas > 0
            ? `${minhasChaves[0].com_voce ? '1 com você' : `1 com ${minhasChaves[0].responsavel}`} (${minhasChaves[0].area}) • ${emprestadasGeral} no condomínio`
            : (emprestadasGeral ? `${emprestadasGeral} no condomínio (0 com você)` : 'Todas disponíveis')
        }
        icone="key"
        cor={
          minhasEmprestadas > 0
            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
            : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60'
        }
        acao={
          <Link to="/portaria/chaves" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline dark:text-sky-400">
            Controle de chaves <Icone nome="chevronRight" className="h-3 w-3" />
          </Link>
        }
      />,
    ];

    atalhos = [
      { to: '/portaria/painel', rotulo: 'Painel da Portaria', descricao: 'Ocupação agora, agenda do dia e busca de moradores', icone: 'building' },
      { to: '/portaria/encomendas', rotulo: 'Encomendas', descricao: 'Registrar chegada e dar baixa', icone: 'package' },
      { to: '/portaria/chaves', rotulo: 'Controle de Chaves', descricao: 'Empréstimo e devolução do claviculário', icone: 'key' },
      { to: '/mural', rotulo: 'Mural de Avisos', descricao: 'Comunicados do condomínio', icone: 'pin' },
    ];
  } else {
    const emprestadasGeral = chaves.filter(c => c.status === 'EMPRESTADA').length;
    const minhasEmprestadas = minhasChaves.length;
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
        titulo={minhasEmprestadas > 0 ? "Chaves (Sua Família)" : "Chaves do Condomínio"}
        valor={
          minhasEmprestadas > 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              {minhasEmprestadas} <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">com sua família</span>
            </span>
          ) : (
            emprestadasGeral
          )
        }
        legenda={
          minhasEmprestadas > 0
            ? `${minhasChaves[0].com_voce ? '1 com você' : `1 com ${minhasChaves[0].responsavel}`} (${minhasChaves[0].area}) • ${emprestadasGeral} no total`
            : (emprestadasGeral ? `${emprestadasGeral} emprestadas no condomínio (0 com você)` : 'Todas disponíveis')
        }
        icone="key"
        cor={
          minhasEmprestadas > 0
            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
            : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60'
        }
        acao={
          <Link to="/portaria/chaves" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline dark:text-sky-400">
            Controle de chaves <Icone nome="chevronRight" className="h-3 w-3" />
          </Link>
        }
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
        sub={(rotuloPapeis || ROTULO_PERFIL[perfilPrincipal]) + (unidadesTexto ? ` • ${unidadesTexto}` : '')}
        icone={<Icone nome="home" className="h-5 w-5" />}
        acao={
          (tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR')) && (
            <Link
              to="/sindico/painel"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-soft hover:border-navy/30 hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:text-white transition-all cursor-pointer"
            >
              <Icone nome="building" className="h-4 w-4 text-navy dark:text-sky-400" />
              Painel Geral de Gestão <Icone nome="chevronRight" className="h-3.5 w-3.5" />
            </Link>
          )
        }
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
          {/* Banner de Chave(s) em Posse da Residência */}
          {minhasChaves.length > 0 && (
            <div className="rounded-2xl border border-amber-300/90 bg-gradient-to-r from-amber-50/95 via-orange-50/70 to-amber-50/95 dark:border-amber-700/80 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40 p-4 shadow-sm animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 dark:border-amber-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <Icone nome="key" className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      Chave em Posse da sua Residência
                      <span className="rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 border border-amber-300/70 dark:border-amber-700/70">
                        {minhasChaves.length} {minhasChaves.length === 1 ? 'chave ativa' : 'chaves ativas'}
                      </span>
                    </h3>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                      Identificamos que você ou sua família estão com chave(s) retirada(s) na portaria.
                    </p>
                  </div>
                </div>

                {(perfilPrincipal === 'ADMINISTRADOR' || perfilPrincipal === 'PORTEIRO') && (
                  <Link
                    to="/portaria/chaves"
                    className="inline-flex items-center gap-1.5 self-start sm:self-center text-xs font-bold text-amber-900 hover:text-navy dark:text-amber-300 dark:hover:text-white transition-colors bg-white/90 dark:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700 px-3 py-1.5 rounded-lg shadow-2xs"
                  >
                    Controle de Chaves <Icone nome="chevronRight" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <div className="mt-3 divide-y divide-amber-200/60 dark:divide-amber-800/40">
                {minhasChaves.map(ch => (
                  <div key={ch.id_entrega_chave} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{ch.area}</span>
                          <span className="rounded-md bg-amber-200/70 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 font-mono text-[11px] font-bold px-2 py-0.5">
                            {ch.codigo}
                          </span>
                          {ch.com_voce ? (
                            <span className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 border border-emerald-300/60 dark:border-emerald-700">
                              COM VOCÊ
                            </span>
                          ) : (
                            <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 border border-blue-300/60 dark:border-blue-700">
                              COM FAMILIAR ({ch.responsavel})
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300 text-xs">
                          {ch.com_voce ? (
                            <>Retirada por <b>você</b> em {formatarDataHora(ch.data_hora_retirada, false)}.</>
                          ) : (
                            <>Retirada pelo familiar <b>{ch.responsavel}</b> em {formatarDataHora(ch.data_hora_retirada, false)}.</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-900/80 dark:text-amber-300/70 italic sm:text-right">
                      Lembre-se de devolver na portaria após o uso.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {perfilPrincipal === 'MORADOR' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cardsMorador}
              </div>

              {/* Card complementar: Minha Família & Moradores da Unidade */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-soft transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icone nome="users" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Minha Família & Moradores da Unidade
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cadastre e gerencie dependentes, contatos de emergência e veículos associados à sua residência.
                    </p>
                  </div>
                </div>
                <Link
                  to="/morador/familia"
                  className="inline-flex items-center gap-1.5 self-start sm:self-center text-xs font-bold text-navy hover:underline dark:text-sky-400 rounded-lg px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700 transition-colors shrink-0"
                >
                  Gerenciar Família <Icone nome="chevronRight" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
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
        </>
      )}
    </div>
  );
}
