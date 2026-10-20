import { useEffect, useState } from 'react';
import { api, sessaoAtual, salvarSessao } from '../../api';
import {
  Botao,
  Campo,
  Cartao,
  inputCls,
  Mensagem,
  Titulo,
  Icone,
  Badge,
  EmptyState,
  Modal,
  ModalConfirmacao,
  mascararCPF,
  mascararCelular,
  Paginacao,
} from '../../components/ui';
import { ModalAtividadePessoa } from '../../components/BuscaAtividadePessoa';
import ModalPerfilUsuario from '../../components/ModalPerfilUsuario';
import EstruturaFisica from '../superadmin/EstruturaFisica';

type Dependente = {
  id_pessoa: number;
  nome: string;
  email: string;
  cpf: string;
  data_nascimento?: string;
  grau_parentesco: string;
  status_aprovacao: string;
  ativo: boolean;
};

type Responsavel = {
  id_pessoa: number;
  nome: string;
  email: string;
};

type UnidadeVinculada = {
  id_unidade: number;
  bloco: string;
  apartamento: string;
  vinculo: 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE' | 'VISITANTE' | 'PRESTADOR_SERVICO';
  parentesco?: string;
  id_responsavel?: number;
  status_aprovacao?: string;
  reside: boolean;
};

type Pessoa = {
  id_pessoa: number;
  nome: string;
  email: string;
  cpf: string;
  celular?: string;
  data_nascimento?: string;
  status_conta?: string;
  papel_controle?: string;
  tipo_servico?: string;
  ativo: boolean;
  perfis: { tipo: string; id_perfil: number }[];
  unidades: UnidadeVinculada[];
  codigo_ativacao?: string;
  responsavel?: Responsavel | null;
  dependentes: Dependente[];
  total_bloqueios_ativos?: number;
  total_historico?: number;
  pode_excluir?: boolean;
};

type AprovacaoPendente = {
  id_pessoa_unidade: number;
  id_pessoa: number;
  nome: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  celular?: string;
  id_unidade: number;
  numero_apartamento: string;
  bloco: string;
  grau_parentesco: string;
  data_inicio_ocupacao: string;
  id_responsavel: number;
  nome_responsavel: string;
  email_responsavel: string;
};

type Unidade = {
  id_unidade: number;
  bloco: string;
  numero_apartamento: string;
  proprietario?: string;
  id_proprietario?: number;
  proprietario_reside?: boolean;
  inquilino?: string;
  id_inquilino?: number;
  inquilino_reside?: boolean;
  total_moradores?: number;
  total_ocupantes?: number;
  nomes_ocupantes?: string;
};

function obterTextoOcupacaoUnidade(u: Unidade): string {
  const ocupantes = Number(u.total_ocupantes ?? u.total_moradores ?? 0);
  if (ocupantes > 0 || u.proprietario || u.inquilino) {
    const resideTxt =
      u.proprietario_reside === false ? ' (Não reside)' : u.proprietario_reside === true ? ' (Reside)' : '';
    const detalhes = u.proprietario
      ? `Prop: ${u.proprietario}${resideTxt}`
      : u.inquilino
      ? `Inq: ${u.inquilino}`
      : `${ocupantes} morador(es)`;
    return `(⚠️ Ocupado • ${detalhes})`;
  }
  return '(Disponível / Vago)';
}

function obterStatusVinculosUnidade(
  unidade?: Unidade,
  idPessoaAtual?: number,
  pessoaAtual?: Pessoa | null
) {
  if (!unidade) {
    return {
      podeProprietario: true,
      motivoProprietario: '',
      podeInquilino: true,
      motivoInquilino: '',
      podeDependente: true,
      proprietarioReside: false,
      ehProprioProprietario: false,
      ehProprioInquilino: false,
      temOutroProprietario: false,
      temOutroInquilino: false,
      sugestaoVinculo: 'PROPRIETARIO' as 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE',
    };
  }

  const idAtual =
    idPessoaAtual !== undefined && idPessoaAtual !== null
      ? Number(idPessoaAtual)
      : pessoaAtual?.id_pessoa !== undefined && pessoaAtual?.id_pessoa !== null
      ? Number(pessoaAtual.id_pessoa)
      : undefined;
  const nomeAtual = pessoaAtual?.nome?.trim().toLowerCase();

  // É o próprio proprietário desta unidade se:
  // a) O ID da pessoa confere com unidade.id_proprietario
  // b) OU a pessoa já possui esta unidade vinculada em pessoa.unidades como PROPRIETARIO
  // c) OU o nome da pessoa confere com unidade.proprietario
  const ehProprioProprietario = Boolean(
    unidade.proprietario &&
      ((idAtual !== undefined && unidade.id_proprietario !== undefined && Number(unidade.id_proprietario) === idAtual) ||
        (pessoaAtual?.unidades?.some(
          uv => Number(uv.id_unidade) === Number(unidade.id_unidade) && uv.vinculo === 'PROPRIETARIO'
        )) ||
        (nomeAtual && unidade.proprietario && unidade.proprietario.trim().toLowerCase() === nomeAtual))
  );

  // É o próprio inquilino desta unidade se:
  // a) O ID da pessoa confere com unidade.id_inquilino
  // b) OU a pessoa já possui esta unidade vinculada em pessoa.unidades como INQUILINO
  // c) OU o nome da pessoa confere com unidade.inquilino
  const ehProprioInquilino = Boolean(
    unidade.inquilino &&
      ((idAtual !== undefined && unidade.id_inquilino !== undefined && Number(unidade.id_inquilino) === idAtual) ||
        (pessoaAtual?.unidades?.some(
          uv => Number(uv.id_unidade) === Number(unidade.id_unidade) && uv.vinculo === 'INQUILINO'
        )) ||
        (nomeAtual && unidade.inquilino && unidade.inquilino.trim().toLowerCase() === nomeAtual))
  );

  const temOutroProprietario = Boolean(unidade.proprietario && !ehProprioProprietario);
  const temOutroInquilino = Boolean(unidade.inquilino && !ehProprioInquilino);

  // Verifica se o proprietário reside no imóvel
  let proprietarioReside = false;
  if (unidade.proprietario) {
    if (unidade.proprietario_reside !== undefined && unidade.proprietario_reside !== null) {
      proprietarioReside = Boolean(unidade.proprietario_reside);
    } else if (ehProprioProprietario && pessoaAtual?.unidades) {
      const uv = pessoaAtual.unidades.find(u => Number(u.id_unidade) === Number(unidade.id_unidade));
      if (uv && uv.reside !== undefined) {
        proprietarioReside = Boolean(uv.reside);
      } else {
        proprietarioReside = true;
      }
    } else {
      proprietarioReside = true;
    }
  }

  // 1. Regra Proprietário:
  // - Se já houver outro proprietário cadastrado, não deixa outro morador ser proprietário titular
  // - Se for o próprio proprietário titular, a opção deve ficar totalmente liberada (habilitada)
  let podeProprietario = true;
  let motivoProprietario = '';
  if (temOutroProprietario) {
    podeProprietario = false;
    motivoProprietario = `Já possui proprietário titular (${unidade.proprietario})`;
  } else if (ehProprioProprietario) {
    podeProprietario = true;
    motivoProprietario = '';
  }

  // 2. Regra Inquilino:
  // - Se for o próprio proprietário do imóvel, NÃO pode ser inquilino do seu próprio apartamento
  // - Se já houver um inquilino titular na unidade, não deixa outro inquilino titular
  // - Se o proprietário residir no apartamento, NUNCA permite vincular ninguém como inquilino
  // - Se for o próprio inquilino atual da locação (em edição), a opção permanece permitida
  let podeInquilino = true;
  let motivoInquilino = '';
  if (ehProprioProprietario) {
    podeInquilino = false;
    motivoInquilino = 'Esta pessoa é o proprietário titular do imóvel';
  } else if (temOutroInquilino) {
    podeInquilino = false;
    motivoInquilino = `Já possui inquilino titular (${unidade.inquilino})`;
  } else if (proprietarioReside) {
    podeInquilino = false;
    motivoInquilino = `Indisponível: o proprietário (${unidade.proprietario}) reside no imóvel`;
  } else if (ehProprioInquilino) {
    podeInquilino = true;
    motivoInquilino = '';
  }

  const podeDependente = true;

  let sugestaoVinculo: 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE' = 'DEPENDENTE';
  if (ehProprioProprietario) {
    sugestaoVinculo = 'PROPRIETARIO';
  } else if (ehProprioInquilino) {
    sugestaoVinculo = 'INQUILINO';
  } else if (podeProprietario) {
    sugestaoVinculo = 'PROPRIETARIO';
  } else if (podeInquilino) {
    sugestaoVinculo = 'INQUILINO';
  } else {
    sugestaoVinculo = 'DEPENDENTE';
  }

  return {
    podeProprietario,
    motivoProprietario,
    podeInquilino,
    motivoInquilino,
    podeDependente,
    proprietarioReside,
    ehProprioProprietario,
    ehProprioInquilino,
    temOutroProprietario,
    temOutroInquilino,
    sugestaoVinculo,
  };
}

function calcularIdade(dataNasc?: string): number | null {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

function formatarParentesco(p?: string) {
  if (!p) return '';
  switch (p) {
    case 'CONJUGE':
      return 'Cônjuge';
    case 'FILHO':
      return 'Filho(a)';
    case 'PAI_MAE':
      return 'Pai / Mãe';
    case 'OUTRO':
      return 'Outro Familiar';
    default:
      return p;
  }
}

const OPCOES_PAPEIS = [
  {
    tipo: 'MORADOR',
    titulo: 'Morador',
    descricao: 'Reservas de áreas comuns, encomendas e gestão da família',
    icone: 'home' as const,
    corAtiva:
      'border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200 shadow-xs',
    iconeCor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    tipo: 'PORTEIRO',
    titulo: 'Porteiro',
    descricao: 'Portaria, encomendas e claviculário de chaves',
    icone: 'key' as const,
    corAtiva:
      'border-amber-500 bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-200 shadow-xs',
    iconeCor: 'text-amber-600 dark:text-amber-400',
  },
  {
    tipo: 'SINDICO',
    titulo: 'Administrador',
    descricao: 'Gestão geral, cadastros, avisos e relatórios',
    icone: 'shield' as const,
    corAtiva:
      'border-indigo-500 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-indigo-200 shadow-xs',
    iconeCor: 'text-indigo-600 dark:text-indigo-400',
  },
];

const OPCOES_PAPEIS_EDICAO = [...OPCOES_PAPEIS];

/** Determina explicitamente o que o usuário é no condomínio considerando qualquer combinação */
function obterPapelUsuario(p: Pessoa): {
  papel: string;
  badgeCls: string;
  icone: 'shield' | 'home' | 'key' | 'user' | 'wrench';
} {
  const tipos = (p.perfis || []).map(pf => pf.tipo);
  const temSindico = tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR');
  const temMorador = tipos.includes('MORADOR');
  const temPorteiro = tipos.includes('PORTEIRO');

  if (p.papel_controle === 'PRESTADOR_SERVICO' || (!temSindico && !temMorador && !temPorteiro && p.unidades?.some(u => u.vinculo === 'PRESTADOR_SERVICO'))) {
    return {
      papel: p.tipo_servico ? `Prestador: ${p.tipo_servico}` : 'Prestador de Serviço',
      badgeCls:
        'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60',
      icone: 'wrench',
    };
  }
  if (p.papel_controle === 'VISITANTE' || (!temSindico && !temMorador && !temPorteiro && p.unidades?.some(u => u.vinculo === 'VISITANTE'))) {
    return {
      papel: 'Visitante',
      badgeCls:
        'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/60',
      icone: 'user',
    };
  }

  if (temSindico && temMorador && temPorteiro) {
    return {
      papel: 'Administrador / Morador / Porteiro',
      badgeCls:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700',
      icone: 'shield',
    };
  }
  if (temSindico && temMorador) {
    return {
      papel: 'Administrador / Morador',
      badgeCls:
        'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60',
      icone: 'shield',
    };
  }
  if (temSindico && temPorteiro) {
    return {
      papel: 'Administrador / Porteiro',
      badgeCls:
        'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
      icone: 'shield',
    };
  }
  if (temPorteiro && temMorador) {
    return {
      papel: 'Porteiro / Morador',
      badgeCls:
        'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60',
      icone: 'key',
    };
  }
  if (temSindico) {
    return {
      papel: 'Apenas Administrador',
      badgeCls:
        'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
      icone: 'shield',
    };
  }
  if (temPorteiro) {
    return {
      papel: 'Porteiro',
      badgeCls:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
      icone: 'key',
    };
  }
  return {
    papel: 'Morador',
    badgeCls:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    icone: 'home',
  };
}

export interface PessoasProps {
  apenasConsulta?: boolean;
  embutido?: boolean;
  titulo?: string;
  subtitulo?: string;
}

/** UC11 - Gestão de Pessoas, Unidades, Vínculos Familiares e Aprovações */
export default function Pessoas({
  apenasConsulta = false,
  embutido = false,
  titulo,
  subtitulo,
}: PessoasProps = {}) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [aprovacoes, setAprovacoes] = useState<AprovacaoPendente[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'pessoas' | 'aprovacoes' | 'estrutura'>('pessoas');

  // Filtros Segmentados
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [buscaNome, setBuscaNome] = useState('');
  const [buscaCpf, setBuscaCpf] = useState('');
  const [buscaApto, setBuscaApto] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState<string>('TODAS');

  // Ordenação de Colunas
  type ColunaOrdenavel = 'nome' | 'apartamento' | 'papel' | 'dependentes' | 'status';
  const [colunaOrdenada, setColunaOrdenada] = useState<ColunaOrdenavel>('nome');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');
  const [paginaPessoas, setPaginaPessoas] = useState(1);
  const [paginaAprovacoes, setPaginaAprovacoes] = useState(1);

  function alternarOrdenacao(coluna: ColunaOrdenavel) {
    setPaginaPessoas(1);
    if (colunaOrdenada === coluna) {
      setDirecaoOrdenacao(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenada(coluna);
      setDirecaoOrdenacao('asc');
    }
  }

  // Modais de Criação & Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modalVisitanteAberto, setModalVisitanteAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [pessoaEditando, setPessoaEditando] = useState<Pessoa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoVisitante, setSalvandoVisitante] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [erroVisitante, setErroVisitante] = useState<string | null>(null);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Formulário de Visitante e Prestador de Serviço
  const [formVisitante, setFormVisitante] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    email: '',
    celular: '',
    tipo: 'VISITANTE' as 'VISITANTE' | 'PRESTADOR_SERVICO',
    id_unidade: '',
    tipo_servico: '',
  });

  // Modais de Inspeção, Atividade, Inativação, Reativação e Exclusão
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Pessoa | null>(null);
  const [pessoaAtividadeModal, setPessoaAtividadeModal] = useState<Pessoa | null>(null);
  const [menuAcoesAbertoId, setMenuAcoesAbertoId] = useState<number | null>(null);
  const [inativando, setInativando] = useState<Pessoa | null>(null);
  const [reativando, setReativando] = useState<Pessoa | null>(null);
  const [excluindo, setExcluindo] = useState<Pessoa | null>(null);
  const [salvandoReativacao, setSalvandoReativacao] = useState(false);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);

  // Fecha o menu de ações ao clicar em qualquer lugar da tela
  useEffect(() => {
    if (menuAcoesAbertoId === null) return;
    const fecharMenu = () => setMenuAcoesAbertoId(null);
    window.addEventListener('click', fecharMenu);
    return () => window.removeEventListener('click', fecharMenu);
  }, [menuAcoesAbertoId]);

  // Pop-up específico de conflito / erro de negócio
  const [popupErro, setPopupErro] = useState<string | null>(null);
  const [codigoGeradoSucesso, setCodigoGeradoSucesso] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const sessao = sessaoAtual();
  const perfisUsuario = (sessao?.perfis || []).map(p => p.tipo);
  const ehApenasPorteiro = perfisUsuario.includes('PORTEIRO') && !perfisUsuario.includes('SINDICO') && !perfisUsuario.includes('ADMINISTRADOR');
  const somenteLeitura = apenasConsulta || ehApenasPorteiro;

  // Formulário de Cadastro
  const FORM_INICIAL_CADASTRO = {
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    id_unidade: '',
    tipo_vinculo: '',
    perfis: [] as string[],
    id_responsavel: '',
    grau_parentesco: 'FILHO',
    reside: true,
    tipo_servico: '',
  };

  const [form, setForm] = useState<{
    nome: string;
    email: string;
    cpf: string;
    data_nascimento: string;
    celular: string;
    id_unidade: string;
    tipo_vinculo: string;
    perfis: string[];
    id_responsavel: string;
    grau_parentesco: string;
    reside: boolean;
    tipo_servico: string;
  }>(FORM_INICIAL_CADASTRO);

  // Formulário de Edição
  const [formEdicao, setFormEdicao] = useState<{
    nome: string;
    email: string;
    cpf: string;
    data_nascimento: string;
    celular: string;
    id_unidade: string;
    tipo_vinculo: string;
    perfis: string[];
    id_responsavel: string;
    grau_parentesco: string;
    reside: boolean;
    tipo_servico: string;
  }>({
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    id_unidade: '',
    tipo_vinculo: '',
    perfis: ['PORTEIRO'],
    id_responsavel: '',
    grau_parentesco: 'FILHO',
    reside: true,
    tipo_servico: '',
  });

  // Contagem de administradores ativos para proteção do administrador único
  const totalAdminsAtivos = pessoas.filter(p =>
    p.ativo && (p.perfis || []).some(pf => pf.tipo === 'SINDICO' || pf.tipo === 'ADMINISTRADOR')
  ).length;

  const ehProprioUsuario = Boolean(
    sessao?.pessoa?.id_pessoa && pessoaEditando?.id_pessoa === sessao.pessoa.id_pessoa
  );
  const ehUnicoAdmin = ehProprioUsuario && totalAdminsAtivos <= 1;

  // Morador cadastrado não pode ter o papel alterado para Visitante ou Prestador de Serviço
  const ehMoradorEdicao = Boolean(
    pessoaEditando && (
      (pessoaEditando.perfis || []).some(pf => pf.tipo === 'MORADOR') ||
      Boolean(pessoaEditando.email) ||
      (pessoaEditando.unidades && pessoaEditando.unidades.length > 0 && pessoaEditando.papel_controle !== 'VISITANTE' && pessoaEditando.papel_controle !== 'PRESTADOR_SERVICO')
    )
  );

  function togglePerfilEdicao(tipo: string) {
    if (ehUnicoAdmin && tipo === 'SINDICO') return;

    if (tipo === 'MORADOR' && !formEdicao.id_unidade) {
      setErroEdicao('Para selecionar o papel de Morador, você deve vincular uma unidade residencial acima.');
      return;
    }

    const atuais = formEdicao.perfis || [];
    setErroEdicao(null);

    // Se está desmarcando o tipo que já estava selecionado
    if (atuais.includes(tipo)) {
      if (tipo === 'MORADOR' && formEdicao.id_unidade) {
        setErroEdicao('Este usuário possui uma unidade vinculada e deve obrigatoriamente manter o perfil de Morador. Para remover o perfil de Morador, desvincule a unidade primeiro.');
        return;
      }
      if (atuais.length === 1) {
        setErroEdicao('A pessoa deve ter pelo menos um papel ativo no condomínio.');
        return;
      }
      setFormEdicao({ ...formEdicao, perfis: atuais.filter(t => t !== tipo) });
      return;
    }

    setFormEdicao({ ...formEdicao, perfis: [...atuais, tipo] });
  }

  function togglePerfilCadastro(tipo: string) {
    if (tipo === 'MORADOR' && !form.id_unidade) {
      setErroCadastro('Para selecionar o papel de Morador, você deve vincular uma unidade residencial acima.');
      return;
    }

    const atuais = form.perfis || [];
    setErroCadastro(null);

    // Se está desmarcando o tipo que já estava selecionado
    if (atuais.includes(tipo)) {
      if (tipo === 'MORADOR' && form.id_unidade) {
        setErroCadastro('Esta pessoa possui uma unidade vinculada e deve obrigatoriamente manter o perfil de Morador. Para remover o perfil de Morador, desvincule a unidade primeiro.');
        return;
      }
      if (atuais.length === 1) {
        setErroCadastro('O usuário deve ter pelo menos um papel ativo no condomínio.');
        return;
      }
      setForm({ ...form, perfis: atuais.filter(t => t !== tipo) });
      return;
    }

    setForm({ ...form, perfis: [...atuais, tipo] });
  }

  // Penalidades e Restrições de Áreas Comuns (RN03)
  const [areas, setAreas] = useState<{ id_area_comum: number; nome: string }[]>([]);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [pessoaBloqueio, setPessoaBloqueio] = useState<Pessoa | null>(null);
  const [bloqueiosPessoa, setBloqueiosPessoa] = useState<any[]>([]);
  const [carregandoBloqueios, setCarregandoBloqueios] = useState(false);
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [formBloqueio, setFormBloqueio] = useState({
    id_area_comum: '',
    motivo: 'INFRACAO',
    descricao: '',
    data_hora_fim: '',
  });

  const carregarPessoas = () => {
    return api
      .get<Pessoa[]>('/cadastros/pessoas')
      .then(setPessoas)
      .catch(() => setPessoas([]));
  };

  const carregarUnidades = () =>
    api.get<Unidade[]>('/cadastros/unidades').then(setUnidades);

  const carregarAprovacoes = () =>
    api.get<AprovacaoPendente[]>('/cadastros/aprovacoes-pendentes').then(setAprovacoes);

  useEffect(() => {
    carregarPessoas();
    carregarUnidades();
    if (!somenteLeitura) {
      carregarAprovacoes();
    }
  }, [somenteLeitura]);

  const pessoasAtivas = pessoas.filter(p => p.ativo);
  const pessoasInativas = pessoas.filter(p => !p.ativo);

  const temBuscaTexto = Boolean(buscaNome.trim() || buscaCpf.trim() || buscaApto.trim());
  const temFiltroAtivo = Boolean(
    temBuscaTexto || (filtroFuncao && filtroFuncao !== 'TODAS') || filtroStatus !== 'TODOS'
  );

  function limparFiltros() {
    setBuscaNome('');
    setBuscaCpf('');
    setBuscaApto('');
    setFiltroFuncao('TODAS');
    setFiltroStatus('TODOS');
    setPaginaPessoas(1);
  }

  // Filtragem combinada
  const pessoasFiltradas = pessoas.filter(p => {
    // 0. Filtro Status
    // Quando pesquisa por nome ou dados, inclui perfis inativos para facilitar a localização
    if (filtroStatus === 'ATIVOS' && !p.ativo) {
      if (!buscaNome.trim()) return false;
    }
    if (filtroStatus === 'INATIVOS' && p.ativo) {
      return false;
    }

    // 1. Filtro Nome / E-mail
    if (buscaNome.trim()) {
      const termo = buscaNome.toLowerCase().trim();
      const matchNome = p.nome.toLowerCase().includes(termo);
      const matchEmail = (p.email || '').toLowerCase().includes(termo);
      const matchServico = (p.tipo_servico || '').toLowerCase().includes(termo);
      if (!matchNome && !matchEmail && !matchServico) return false;
    }

    // 2. Filtro CPF
    if (buscaCpf.trim()) {
      const termoCpfLimpo = buscaCpf.replace(/\D/g, '');
      const pCpfLimpo = (p.cpf || '').replace(/\D/g, '');
      if (termoCpfLimpo) {
        if (!pCpfLimpo.includes(termoCpfLimpo)) return false;
      } else {
        if (!(p.cpf || '').toLowerCase().includes(buscaCpf.toLowerCase().trim())) return false;
      }
    }

    // 3. Filtro Apartamento / Bloco
    if (buscaApto.trim()) {
      const termoApto = buscaApto.toLowerCase().trim();
      const temUnidade = (p.unidades || []).some(u => {
        const apto = (u.apartamento || '').toLowerCase();
        const bloco = (u.bloco || '').toLowerCase();
        return (
          apto.includes(termoApto) ||
          bloco.includes(termoApto) ||
          `bl. ${bloco} - apto ${apto}`.toLowerCase().includes(termoApto) ||
          `bloco ${bloco} apartamento ${apto}`.toLowerCase().includes(termoApto) ||
          `${bloco}${apto}`.includes(termoApto)
        );
      });
      if (!temUnidade) return false;
    }

    // 4. Filtro Função / Papel no Condomínio
    if (filtroFuncao && filtroFuncao !== 'TODAS') {
      const tiposPerfis = (p.perfis || []).map(pf => pf.tipo);
      const uAtiva = p.unidades && p.unidades[0];
      const vinculo = uAtiva?.vinculo;

      if (filtroFuncao === 'PROPRIETARIO') {
        if (vinculo !== 'PROPRIETARIO') return false;
      } else if (filtroFuncao === 'INQUILINO') {
        if (vinculo !== 'INQUILINO') return false;
      } else if (filtroFuncao === 'DEPENDENTE') {
        if (vinculo !== 'DEPENDENTE') return false;
      } else if (filtroFuncao === 'MORADOR') {
        if (!tiposPerfis.includes('MORADOR')) return false;
      } else if (filtroFuncao === 'PORTEIRO') {
        if (!tiposPerfis.includes('PORTEIRO')) return false;
      } else if (filtroFuncao === 'ADMINISTRADOR') {
        if (!tiposPerfis.includes('SINDICO') && !tiposPerfis.includes('ADMINISTRADOR')) return false;
      } else if (filtroFuncao === 'VISITANTE') {
        if (p.papel_controle !== 'VISITANTE' && vinculo !== 'VISITANTE') return false;
      } else if (filtroFuncao === 'PRESTADOR_SERVICO') {
        if (p.papel_controle !== 'PRESTADOR_SERVICO' && vinculo !== 'PRESTADOR_SERVICO') return false;
      }
    }

    return true;
  });

  // Ordenação por coluna clicável
  const listaExibida = [...pessoasFiltradas].sort((a, b) => {
    let comp = 0;

    if (colunaOrdenada === 'nome') {
      comp = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    } else if (colunaOrdenada === 'apartamento') {
      const uA = a.unidades?.[0];
      const uB = b.unidades?.[0];
      if (!uA && !uB) comp = 0;
      else if (!uA) comp = 1;
      else if (!uB) comp = -1;
      else {
        const compBloco = (uA.bloco || '').localeCompare(uB.bloco || '', 'pt-BR');
        if (compBloco !== 0) {
          comp = compBloco;
        } else {
          const numA = parseInt(uA.apartamento, 10) || 0;
          const numB = parseInt(uB.apartamento, 10) || 0;
          comp = numA !== numB ? numA - numB : uA.apartamento.localeCompare(uB.apartamento);
        }
      }
    } else if (colunaOrdenada === 'papel') {
      const papelA = `${obterPapelUsuario(a).papel} ${a.unidades?.[0]?.vinculo || ''}`;
      const papelB = `${obterPapelUsuario(b).papel} ${b.unidades?.[0]?.vinculo || ''}`;
      comp = papelA.localeCompare(papelB, 'pt-BR');
    } else if (colunaOrdenada === 'dependentes') {
      const depA = a.dependentes?.length || 0;
      const depB = b.dependentes?.length || 0;
      comp = depA - depB;
    } else if (colunaOrdenada === 'status') {
      const statusWeightA = a.ativo ? 2 : 0;
      const statusWeightB = b.ativo ? 2 : 0;
      const bloqA = a.total_bloqueios_ativos || 0;
      const bloqB = b.total_bloqueios_ativos || 0;
      if (statusWeightA !== statusWeightB) {
        comp = statusWeightA - statusWeightB;
      } else {
        comp = bloqA - bloqB;
      }
    }

    return direcaoOrdenacao === 'asc' ? comp : -comp;
  });

  const ITENS_POR_PAGINA = 20;
  const totalPaginasPessoas = Math.ceil(listaExibida.length / ITENS_POR_PAGINA) || 1;
  const listaExibidaPaginada = listaExibida.slice(
    (paginaPessoas - 1) * ITENS_POR_PAGINA,
    paginaPessoas * ITENS_POR_PAGINA
  );

  const totalPaginasAprovacoes = Math.ceil(aprovacoes.length / ITENS_POR_PAGINA) || 1;
  const aprovacoesPaginadas = aprovacoes.slice(
    (paginaAprovacoes - 1) * ITENS_POR_PAGINA,
    paginaAprovacoes * ITENS_POR_PAGINA
  );

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroCadastro('Erro de cadastro: O CPF deve conter exatamente 11 dígitos.');
      setMsg({ t: 'O CPF deve conter exatamente 11 dígitos.', tipo: 'erro' });
      return;
    }

    if (!form.perfis || form.perfis.length === 0) {
      setErroCadastro('Selecione ao menos um papel ativo para o usuário.');
      setMsg({ t: 'Selecione ao menos um papel ativo para o usuário.', tipo: 'erro' });
      return;
    }

    if (!form.data_nascimento) {
      setErroCadastro('A data de nascimento é obrigatória para cadastro de morador ou usuário do sistema.');
      setMsg({ t: 'Informe a data de nascimento.', tipo: 'erro' });
      return;
    }

    if (!form.email.trim()) {
      setErroCadastro('O e-mail é obrigatório para cadastros com acesso ao sistema.');
      setMsg({ t: 'Informe o e-mail para acesso ao sistema.', tipo: 'erro' });
      return;
    }

    // Validação obrigatória de Morador: exige unidade vinculada
    if (form.perfis.includes('MORADOR') && (!form.id_unidade || Number(form.id_unidade) <= 0)) {
      setErroCadastro('Para o papel de Morador, é obrigatório selecionar uma unidade vinculada (bloco e apartamento).');
      setMsg({ t: 'Para o papel de Morador, é obrigatório selecionar uma unidade vinculada.', tipo: 'erro' });
      return;
    }

    // Se vinculou unidade, deve conter o papel Morador
    if (form.id_unidade && !form.perfis.includes('MORADOR')) {
      setErroCadastro('Ao vincular uma unidade residencial, é obrigatório atribuir o perfil de Morador para esta pessoa.');
      setMsg({ t: 'Ao vincular uma unidade, o perfil de Morador é obrigatório.', tipo: 'erro' });
      return;
    }

    setSalvando(true);
    setErroCadastro(null);
    setMsg({ t: '', tipo: 'ok' });
    try {
      const res = await api.post<any>('/cadastros/pessoas', {
        ...form,
        cpf: cpfLimpo,
        perfis: form.perfis,
        tipo_vinculo: form.id_unidade ? form.tipo_vinculo : undefined,
        id_unidade: form.id_unidade ? Number(form.id_unidade) : undefined,
        id_responsavel: form.id_unidade && form.tipo_vinculo === 'DEPENDENTE' && form.id_responsavel ? Number(form.id_responsavel) : undefined,
        grau_parentesco: form.id_unidade && form.tipo_vinculo === 'DEPENDENTE' ? form.grau_parentesco : undefined,
        reside: form.reside,
      });

      setMsg({ t: `Usuário "${form.nome}" cadastrado com sucesso!`, tipo: 'ok' });
      setCodigoGeradoSucesso(res.codigo_ativacao || null);
      setForm({ ...FORM_INICIAL_CADASTRO });
      setModalAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      const errTxt = err.message || 'Erro ao realizar cadastro.';
      if (
        errTxt.toLowerCase().includes('proprietário') ||
        errTxt.toLowerCase().includes('proprietario') ||
        errTxt.includes('uk_unidade_proprietario_ativo') ||
        errTxt.toLowerCase().includes('inquilino') ||
        errTxt.includes('uk_unidade_inquilino_ativo')
      ) {
        setPopupErro(errTxt);
      }
      setErroCadastro(errTxt);
      setMsg({ t: errTxt, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function cadastrarVisitante(e: React.FormEvent) {
    e.preventDefault();
    setErroVisitante(null);

    const cpfLimpo = formVisitante.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroVisitante('O CPF deve conter exatamente 11 dígitos.');
      return;
    }
    if (!formVisitante.nome.trim()) {
      setErroVisitante('O nome completo é obrigatório.');
      return;
    }
    if (formVisitante.tipo === 'PRESTADOR_SERVICO' && !formVisitante.tipo_servico.trim()) {
      setErroVisitante('Por favor, informe a descrição do tipo de serviço (ex: Eletricista, Encanador, Pintor, etc.).');
      return;
    }

    setSalvandoVisitante(true);
    try {
      await api.post('/cadastros/pessoas', {
        nome: formVisitante.nome.trim(),
        cpf: cpfLimpo,
        data_nascimento: formVisitante.data_nascimento || undefined,
        email: formVisitante.email.trim() ? formVisitante.email.trim().toLowerCase() : undefined,
        celular: formVisitante.celular ? formVisitante.celular.replace(/\D/g, '') : undefined,
        perfis: [formVisitante.tipo],
        id_unidade: formVisitante.id_unidade ? Number(formVisitante.id_unidade) : undefined,
        tipo_vinculo: formVisitante.tipo,
        reside: false,
        tipo_servico: formVisitante.tipo === 'PRESTADOR_SERVICO' ? formVisitante.tipo_servico.trim() : undefined,
      });

      setMsg({
        t: `${formVisitante.tipo === 'VISITANTE' ? 'Visitante' : 'Prestador de Serviço'} "${formVisitante.nome.trim()}" cadastrado(a) com sucesso!`,
        tipo: 'ok',
      });
      setModalVisitanteAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      setErroVisitante(err.message || 'Erro ao cadastrar pessoa.');
    } finally {
      setSalvandoVisitante(false);
    }
  }

  function abrirModalEdicao(p: any) {
    const pExistente = pessoas.find(item => item.id_pessoa === p.id_pessoa);
    const pNormalizado = { ...(pExistente || {}), ...p };

    if ((!pNormalizado.unidades || pNormalizado.unidades.length === 0) && pNormalizado.id_unidade) {
      pNormalizado.unidades = [{
        id_unidade: pNormalizado.id_unidade,
        bloco: pNormalizado.bloco,
        apartamento: pNormalizado.numero_apartamento || pNormalizado.apartamento,
        vinculo: pNormalizado.tipo_vinculo || 'PROPRIETARIO',
        parentesco: pNormalizado.grau_parentesco,
        id_responsavel: pNormalizado.id_responsavel,
        reside: pNormalizado.reside !== undefined ? pNormalizado.reside : true,
      }];
    }

    setPessoaEditando(pNormalizado);
    const u = pNormalizado.unidades && pNormalizado.unidades[0];
    const tipos = (pNormalizado.perfis || []).map((pf: any) => (typeof pf === 'string' ? pf : pf.tipo));
    const perfisAtivos: string[] = [];
    if (tipos.includes('MORADOR')) perfisAtivos.push('MORADOR');
    if (tipos.includes('PORTEIRO')) perfisAtivos.push('PORTEIRO');
    if (tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR')) perfisAtivos.push('SINDICO');

    if (!u) {
      // Sem unidade vinculada: pessoa não pode ter perfil de morador
      const filtrados = perfisAtivos.filter(p => p !== 'MORADOR');
      perfisAtivos.length = 0;
      perfisAtivos.push(...(filtrados.length > 0 ? filtrados : ['PORTEIRO']));
    } else {
      // Com unidade vinculada: deve conter obrigatoriamente perfil de morador
      if (!perfisAtivos.includes('MORADOR')) {
        perfisAtivos.push('MORADOR');
      }
    }

    if (perfisAtivos.length === 0) perfisAtivos.push(u ? 'MORADOR' : 'PORTEIRO');

    let vinculoInicial = u ? (u.vinculo || 'PROPRIETARIO') : '';
    if (vinculoInicial === 'PRESTADOR_SERVICO' || vinculoInicial === 'VISITANTE') {
      vinculoInicial = 'PROPRIETARIO';
    }
    if (u) {
      const unidInfo = unidades.find(un => un.id_unidade === u.id_unidade);
      const st = obterStatusVinculosUnidade(unidInfo, pNormalizado.id_pessoa, pNormalizado);
      if (vinculoInicial === 'PROPRIETARIO' && !st.podeProprietario) {
        vinculoInicial = st.sugestaoVinculo;
      } else if (vinculoInicial === 'INQUILINO' && !st.podeInquilino) {
        vinculoInicial = st.sugestaoVinculo;
      }
    }

    setFormEdicao({
      nome: pNormalizado.nome || '',
      email: pNormalizado.email || '',
      cpf: mascararCPF(pNormalizado.cpf || ''),
      data_nascimento: pNormalizado.data_nascimento ? pNormalizado.data_nascimento.substring(0, 10) : '',
      celular: mascararCelular(pNormalizado.celular || ''),
      id_unidade: u ? String(u.id_unidade) : '',
      tipo_vinculo: vinculoInicial,
      perfis: perfisAtivos,
      id_responsavel: u?.id_responsavel ? String(u.id_responsavel) : (pNormalizado.id_responsavel ? String(pNormalizado.id_responsavel) : ''),
      grau_parentesco: u?.parentesco || pNormalizado.grau_parentesco || 'FILHO',
      reside: u?.reside !== undefined ? u.reside : (pNormalizado.reside !== undefined ? pNormalizado.reside : true),
      tipo_servico: pNormalizado.tipo_servico || '',
    });
    setErroEdicao(null);
    setModalEdicaoAberto(true);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaEditando) return;
    const cpfLimpo = formEdicao.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroEdicao('Erro de cadastro: O CPF deve conter exatamente 11 dígitos.');
      setMsg({ t: 'O CPF deve conter exatamente 11 dígitos.', tipo: 'erro' });
      return;
    }

    if (!formEdicao.perfis || formEdicao.perfis.length === 0) {
      setErroEdicao('Selecione ao menos um papel ativo para o usuário.');
      setMsg({ t: 'Selecione ao menos um papel ativo para o usuário.', tipo: 'erro' });
      return;
    }

    if (ehUnicoAdmin && !formEdicao.perfis.includes('SINDICO')) {
      setErroEdicao('Não é permitido remover o seu próprio perfil de administrador quando você é o único administrador ativo do condomínio.');
      setMsg({ t: 'Você é o único administrador ativo e não pode remover este perfil de si mesmo.', tipo: 'erro' });
      return;
    }

    // Validação obrigatória de Morador: exige unidade vinculada
    if (formEdicao.perfis.includes('MORADOR') && (!formEdicao.id_unidade || Number(formEdicao.id_unidade) <= 0)) {
      setErroEdicao('Para o papel de Morador, é obrigatório selecionar uma unidade vinculada (bloco e apartamento).');
      setMsg({ t: 'Para o papel de Morador, é obrigatório selecionar uma unidade vinculada.', tipo: 'erro' });
      return;
    }

    // Se vinculou unidade, deve conter o papel Morador
    if (formEdicao.id_unidade && !formEdicao.perfis.includes('MORADOR')) {
      setErroEdicao('Ao vincular uma unidade, é obrigatório atribuir o perfil de Morador para esta pessoa.');
      setMsg({ t: 'Ao vincular uma unidade, o perfil de Morador é obrigatório.', tipo: 'erro' });
      return;
    }

    setSalvandoEdicao(true);
    setErroEdicao(null);

    try {
      await api.put(`/cadastros/pessoas/${pessoaEditando.id_pessoa}`, {
        nome: formEdicao.nome,
        email: formEdicao.email?.trim() ? formEdicao.email.trim() : null,
        cpf: cpfLimpo,
        celular: formEdicao.celular,
        data_nascimento: formEdicao.data_nascimento ? formEdicao.data_nascimento : null,
        id_unidade: formEdicao.id_unidade ? Number(formEdicao.id_unidade) : null,
        tipo_vinculo: formEdicao.id_unidade ? formEdicao.tipo_vinculo : null,
        id_responsavel:
          formEdicao.id_unidade && formEdicao.tipo_vinculo === 'DEPENDENTE' && formEdicao.id_responsavel
            ? Number(formEdicao.id_responsavel)
            : null,
        grau_parentesco: formEdicao.id_unidade && formEdicao.tipo_vinculo === 'DEPENDENTE' ? formEdicao.grau_parentesco : null,
        perfis: formEdicao.perfis,
        reside: formEdicao.reside,
        tipo_servico: null,
        papel_controle: formEdicao.perfis[0] || 'MORADOR',
      });

      // Se editou o próprio usuário logado, atualiza a sessão local imediatamente
      if (sessao && sessao.pessoa.id_pessoa === pessoaEditando.id_pessoa) {
        const token = localStorage.getItem('oasis_token') || '';
        const novosPerfisObj = formEdicao.perfis.map((tp, idx) => ({ id_perfil: idx + 1, tipo: tp as any }));
        salvarSessao(token, {
          ...sessao,
          perfis: novosPerfisObj,
        });
      }

      setMsg({ t: `Cadastro de "${formEdicao.nome}" atualizado com sucesso!`, tipo: 'ok' });
      setModalEdicaoAberto(false);
      setPessoaEditando(null);
      carregarPessoas();
      carregarUnidades();
      if (perfilSelecionado?.id_pessoa === pessoaEditando.id_pessoa) {
        api
          .get<any>(`/cadastros/pessoas/${pessoaEditando.id_pessoa}/detalhes`)
          .then(setPerfilSelecionado)
          .catch(() => {});
      }
    } catch (err: any) {
      const errTxt = err.message || 'Erro ao atualizar cadastro.';
      if (
        errTxt.toLowerCase().includes('proprietário') ||
        errTxt.toLowerCase().includes('proprietario') ||
        errTxt.includes('uk_unidade_proprietario_ativo') ||
        errTxt.toLowerCase().includes('inquilino') ||
        errTxt.includes('uk_unidade_inquilino_ativo')
      ) {
        setPopupErro(errTxt);
      }
      setErroEdicao(errTxt);
      setMsg({ t: errTxt, tipo: 'erro' });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function confirmarInativacao() {
    if (!inativando) return;
    try {
      await api.patch(`/cadastros/pessoas/${inativando.id_pessoa}/inativar`);
      setMsg({
        t: `Pessoa "${inativando.nome}" inativada e movida para a aba de Inativos.`,
        tipo: 'ok',
      });
      setInativando(null);
      setModalPerfilAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  async function confirmarReativacao() {
    if (!reativando) return;
    setSalvandoReativacao(true);
    try {
      await api.patch(`/cadastros/pessoas/${reativando.id_pessoa}/reativar`);
      setMsg({ t: `Perfil de "${reativando.nome}" reativado com sucesso!`, tipo: 'ok' });
      setReativando(null);
      if (modalPerfilAberto) setModalPerfilAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      const errTxt = err.message || 'Erro ao reativar usuário.';
      if (
        errTxt.toLowerCase().includes('proprietário') ||
        errTxt.toLowerCase().includes('proprietario') ||
        errTxt.includes('uk_unidade_proprietario_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um proprietário ativo.');
      } else if (
        errTxt.toLowerCase().includes('inquilino') ||
        errTxt.includes('uk_unidade_inquilino_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um inquilino ativo.');
      } else {
        setPopupErro(errTxt);
      }
      setMsg({ t: errTxt, tipo: 'erro' });
    } finally {
      setSalvandoReativacao(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    try {
      await api.delete(`/cadastros/pessoas/${excluindo.id_pessoa}`);
      setMsg({
        t: `Cadastro de "${excluindo.nome}" excluído definitivamente com sucesso.`,
        tipo: 'ok',
      });
      setExcluindo(null);
      if (modalPerfilAberto) setModalPerfilAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      const errTxt = err.message || 'Erro ao excluir cadastro.';
      setPopupErro(errTxt);
      setMsg({ t: errTxt, tipo: 'erro' });
    } finally {
      setSalvandoExclusao(false);
    }
  }

  async function avaliarSolicitacao(idPu: number, aprovado: boolean) {
    try {
      const res = await api.patch<any>(`/cadastros/aprovacoes/${idPu}/avaliar`, { aprovado });
      if (aprovado) {
        setMsg({
          t: `Cadastro aprovado com sucesso! Código gerado: ${res.codigo_ativacao || 'Ativo'}`,
          tipo: 'ok',
        });
      } else {
        setMsg({ t: 'Solicitação de cadastro rejeitada.', tipo: 'ok' });
      }
      carregarAprovacoes();
      carregarPessoas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  function abrirPerfil(p: Pessoa) {
    setPerfilSelecionado(p);
    setModalPerfilAberto(true);
  }

  const carregarAreas = () => {
    if (areas.length === 0) {
      api.get<any[]>('/areas').then(res => {
        setAreas(res.map(a => ({ id_area_comum: a.id_area_comum, nome: a.nome })));
      });
    }
  };

  const abrirModalBloqueio = (p: Pessoa) => {
    setPessoaBloqueio(p);
    setModalBloqueioAberto(true);
    setCarregandoBloqueios(true);
    carregarAreas();
    setFormBloqueio({
      id_area_comum: '',
      motivo: 'INFRACAO',
      descricao: '',
      data_hora_fim: '',
    });
    api
      .get<any[]>(`/cadastros/pessoas/${p.id_pessoa}/bloqueios`)
      .then(setBloqueiosPessoa)
      .catch(() => setBloqueiosPessoa([]))
      .finally(() => setCarregandoBloqueios(false));
  };

  const aplicarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaBloqueio) return;
    setSalvandoBloqueio(true);
    try {
      const r = await api.post<any>(`/cadastros/pessoas/${pessoaBloqueio.id_pessoa}/bloqueios`, {
        id_area_comum: formBloqueio.id_area_comum ? Number(formBloqueio.id_area_comum) : undefined,
        motivo: formBloqueio.motivo,
        descricao: formBloqueio.descricao,
        data_hora_fim: formBloqueio.data_hora_fim ? `${formBloqueio.data_hora_fim}T23:59:59` : undefined,
      });
      const canceladasTexto = r?.reservas_canceladas && r.reservas_canceladas > 0
        ? ` (${r.reservas_canceladas} reserva(s) ativa(s) cancelada(s) automaticamente)`
        : '';
      setMsg({ t: `Penalidade aplicada com sucesso.${canceladasTexto}`, tipo: 'ok' });
      setFormBloqueio({
        id_area_comum: '',
        motivo: 'INFRACAO',
        descricao: '',
        data_hora_fim: '',
      });
      const res = await api.get<any[]>(`/cadastros/pessoas/${pessoaBloqueio.id_pessoa}/bloqueios`);
      setBloqueiosPessoa(res);
      carregarPessoas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvandoBloqueio(false);
    }
  };

  const encerrarBloqueio = async (idBloqueio: number) => {
    try {
      await api.patch(`/cadastros/bloqueios/${idBloqueio}/encerrar`);
      setMsg({ t: 'Penalidade revogada com sucesso.', tipo: 'ok' });
      if (pessoaBloqueio) {
        const res = await api.get<any[]>(`/cadastros/pessoas/${pessoaBloqueio.id_pessoa}/bloqueios`);
        setBloqueiosPessoa(res);
      }
      carregarPessoas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  };

  function navegarParaResponsavel(idResp: number) {
    const resp = pessoas.find(p => p.id_pessoa === idResp);
    if (resp) {
      setPerfilSelecionado(resp);
    } else {
      api.get<any>(`/cadastros/pessoas/${idResp}/detalhes`).then(setPerfilSelecionado);
    }
  }

  function iniciarCadastroDependente(titular: Pessoa, idUnidade: number) {
    setForm({
      nome: '',
      email: '',
      cpf: '',
      data_nascimento: '',
      celular: '',
      id_unidade: String(idUnidade),
      tipo_vinculo: 'DEPENDENTE',
      perfis: ['MORADOR'],
      id_responsavel: String(titular.id_pessoa),
      grau_parentesco: 'FILHO',
      reside: true,
      tipo_servico: '',
    });
    setErroCadastro(null);
    setModalPerfilAberto(false);
    setModalAberto(true);
  }

  const c = (k: keyof typeof form) => (e: React.ChangeEvent<any>) => {
    const val = e.target.value;
    if (k === 'id_unidade') {
      if (!val) {
        setForm(prev => ({
          ...prev,
          id_unidade: '',
          tipo_vinculo: '',
          id_responsavel: '',
        }));
        return;
      } else {
        let novosPerfis = [...form.perfis];
        if (!novosPerfis.includes('MORADOR')) {
          novosPerfis.push('MORADOR');
        }
        const unid = unidades.find(u => String(u.id_unidade) === String(val));
        const st = obterStatusVinculosUnidade(unid);
        setForm(prev => {
          let novoVinculo = prev.tipo_vinculo;
          if (!novoVinculo || (novoVinculo === 'PROPRIETARIO' && !st.podeProprietario) || (novoVinculo === 'INQUILINO' && !st.podeInquilino)) {
            novoVinculo = st.sugestaoVinculo;
          }
          return {
            ...prev,
            id_unidade: val,
            perfis: novosPerfis,
            tipo_vinculo: novoVinculo,
            reside: novoVinculo === 'PROPRIETARIO' ? prev.reside : true,
          };
        });
        return;
      }
    }
    if (k === 'tipo_vinculo') {
      const unid = unidades.find(u => String(u.id_unidade) === String(form.id_unidade));
      const st = obterStatusVinculosUnidade(unid);
      if (val === 'PROPRIETARIO' && !st.podeProprietario) {
        setErroCadastro(`Não é possível selecionar Proprietário (Titular): ${st.motivoProprietario}.`);
        return;
      }
      if (val === 'INQUILINO' && !st.podeInquilino) {
        setErroCadastro(`Não é possível selecionar Inquilino: ${st.motivoInquilino}.`);
        return;
      }
      setErroCadastro(null);
      setForm(prev => ({
        ...prev,
        tipo_vinculo: val,
        reside: val === 'PROPRIETARIO' ? prev.reside : true,
      }));
      return;
    }
    setForm(prev => ({ ...prev, [k]: val }));
  };

  const cEdicao = (k: keyof typeof formEdicao) => (e: React.ChangeEvent<any>) => {
    const val = e.target.value;
    if (k === 'id_unidade') {
      if (!val) {
        // Sem unidade: remove MORADOR dos perfis e zera tipo_vinculo
        const novosPerfis = formEdicao.perfis.filter(p => p !== 'MORADOR');
        if (novosPerfis.length === 0) {
          novosPerfis.push('PORTEIRO');
        }
        setFormEdicao(prev => ({
          ...prev,
          id_unidade: '',
          tipo_vinculo: '',
          id_responsavel: '',
          perfis: novosPerfis,
        }));
        return;
      } else {
        // Com unidade vinculada:
        let novosPerfis = [...formEdicao.perfis];
        if (!novosPerfis.includes('MORADOR')) {
          novosPerfis.push('MORADOR');
        }
        const unid = unidades.find(u => String(u.id_unidade) === String(val));
        const st = obterStatusVinculosUnidade(unid, pessoaEditando?.id_pessoa, pessoaEditando);
        setFormEdicao(prev => {
          let novoVinculo = prev.tipo_vinculo;
          if (!novoVinculo || (novoVinculo === 'PROPRIETARIO' && !st.podeProprietario) || (novoVinculo === 'INQUILINO' && !st.podeInquilino)) {
            novoVinculo = st.sugestaoVinculo;
          }
          return {
            ...prev,
            id_unidade: val,
            perfis: novosPerfis,
            tipo_vinculo: novoVinculo,
            reside: novoVinculo === 'PROPRIETARIO' ? prev.reside : true,
          };
        });
        return;
      }
    }
    if (k === 'tipo_vinculo') {
      const unid = unidades.find(u => String(u.id_unidade) === String(formEdicao.id_unidade));
      const st = obterStatusVinculosUnidade(unid, pessoaEditando?.id_pessoa, pessoaEditando);
      if (val === 'PROPRIETARIO' && !st.podeProprietario) {
        setErroEdicao(`Não é possível selecionar Proprietário (Titular): ${st.motivoProprietario}.`);
        return;
      }
      if (val === 'INQUILINO' && !st.podeInquilino) {
        setErroEdicao(`Não é possível selecionar Inquilino: ${st.motivoInquilino}.`);
        return;
      }
      setErroEdicao(null);
      setFormEdicao(prev => ({
        ...prev,
        tipo_vinculo: val,
        reside: val === 'PROPRIETARIO' ? prev.reside : true,
      }));
      return;
    }
    setFormEdicao(prev => ({ ...prev, [k]: val }));
  };

  // Titulares na unidade selecionada (Cadastro)
  const titularesNaUnidade = pessoas.filter(p =>
    p.unidades.some(
      u =>
        String(u.id_unidade) === String(form.id_unidade) &&
        (u.vinculo === 'PROPRIETARIO' || u.vinculo === 'INQUILINO')
    )
  );

  // Titulares na unidade selecionada (Edição)
  const titularesNaUnidadeEdicao = pessoas.filter(p =>
    p.id_pessoa !== pessoaEditando?.id_pessoa &&
    p.unidades.some(
      u =>
        String(u.id_unidade) === String(formEdicao.id_unidade) &&
        (u.vinculo === 'PROPRIETARIO' || u.vinculo === 'INQUILINO')
    )
  );

  return (
    <div className={embutido ? 'space-y-4' : 'space-y-6'}>
      {!embutido && (
        <>
          <Titulo
            sub="Controle de moradores, relações familiares, gestão de inquilinos, síndicos e portaria."
            icone={<Icone nome="users" className="h-5 w-5" />}
            acao={
              !somenteLeitura && abaAtiva !== 'estrutura' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Botao
                    variante="primario"
                    icone={<Icone nome="plus" className="h-4 w-4" />}
                    onClick={() => {
                      setForm({
                        nome: '',
                        email: '',
                        cpf: '',
                        data_nascimento: '',
                        celular: '',
                        id_unidade: '',
                        tipo_vinculo: '',
                        perfis: [],
                        id_responsavel: '',
                        grau_parentesco: 'FILHO',
                        reside: true,
                        tipo_servico: '',
                      });
                      setErroCadastro(null);
                      setModalAberto(true);
                    }}
                  >
                    Cadastrar Usuário / Morador
                  </Botao>
                  <Botao
                    variante="claro"
                    icone={<Icone nome="shield" className="h-4 w-4" />}
                    onClick={() => {
                      setFormVisitante({
                        nome: '',
                        cpf: '',
                        data_nascimento: '',
                        email: '',
                        celular: '',
                        tipo: 'VISITANTE',
                        id_unidade: '',
                        tipo_servico: '',
                      });
                      setErroVisitante(null);
                      setModalVisitanteAberto(true);
                    }}
                  >
                    Cadastrar Visitante / Prestador
                  </Botao>
                </div>
              ) : undefined
            }
          >
            Pessoas & Unidades
          </Titulo>

          {/* Seletor de Abas: Cadastros Gerais vs Aprovações Pendentes */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setAbaAtiva('pessoas')}
              className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                abaAtiva === 'pessoas'
                  ? 'border-navy text-navy dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icone nome="users" className="h-3.5 w-3.5" />
              Pessoas & Cadastros ({pessoas.length})
            </button>

            {!somenteLeitura && (
              <button
                onClick={() => setAbaAtiva('aprovacoes')}
                className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  abaAtiva === 'aprovacoes'
                    ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Icone nome="check" className="h-3.5 w-3.5" />
                Aprovações de Dependentes
                {aprovacoes.length > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {aprovacoes.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setAbaAtiva('estrutura')}
              className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                abaAtiva === 'estrutura'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icone nome="building" className="h-3.5 w-3.5" />
              Gestão Estrutural & Vagas
            </button>
          </div>
        </>
      )}

      {/* ABA 1: TABELA DE PESSOAS (COM FILTRO INTEGRADO DE STATUS E BUSCA ABRANGENTE) */}
      {(abaAtiva === 'pessoas' || embutido) && (
        <Cartao>
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Icone nome={titulo ? 'search' : 'users'} className="h-4 w-4 text-navy dark:text-sky-400" />
                    {titulo || 'Pessoas & Cadastros'} ({pessoas.length})
                  </h3>

                  {/* Pills de Filtragem Rápida por Status */}
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('TODOS')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filtroStatus === 'TODOS'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Todos ({pessoas.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('ATIVOS')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        filtroStatus === 'ATIVOS'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Ativos ({pessoasAtivas.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('INATIVOS')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        filtroStatus === 'INATIVOS'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      Inativos ({pessoasInativas.length})
                    </button>
                  </div>

                  {temFiltroAtivo && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Filtrado: {listaExibida.length} de {pessoas.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitulo || 'Gerencie moradores, dependentes, porteiros, administradores, visitantes e prestadores de serviço do condomínio.'}
                </p>
              </div>

              {!somenteLeitura && (
                <div className="shrink-0">
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setForm({ ...FORM_INICIAL_CADASTRO });
                      setErroCadastro(null);
                      setModalAberto(true);
                    }}
                  >
                    Cadastrar Pessoa
                  </Botao>
                </div>
              )}
            </div>

            {/* Painel de Filtros Segmentados */}
            <div className="mt-1 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {/* 1. Nome ou E-mail */}
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-400">
                    <Icone nome="search" className="h-3.5 w-3.5" />
                  </span>
                  <input
                    className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                    placeholder="Filtrar por nome ou e-mail..."
                    value={buscaNome}
                    onChange={e => setBuscaNome(e.target.value)}
                  />
                  {buscaNome && (
                    <button
                      type="button"
                      onClick={() => setBuscaNome('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Limpar nome"
                    >
                      <Icone nome="x" className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* 2. CPF */}
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-400">
                    <Icone nome="shield" className="h-3.5 w-3.5" />
                  </span>
                  <input
                    className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                    placeholder="Filtrar por CPF..."
                    value={buscaCpf}
                    onChange={e => setBuscaCpf(e.target.value)}
                  />
                  {buscaCpf && (
                    <button
                      type="button"
                      onClick={() => setBuscaCpf('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Limpar CPF"
                    >
                      <Icone nome="x" className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* 3. Apartamento / Bloco */}
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-400">
                    <Icone nome="building" className="h-3.5 w-3.5" />
                  </span>
                  <input
                    className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                    placeholder="Apto ou Bloco (ex: 61, A)..."
                    value={buscaApto}
                    onChange={e => setBuscaApto(e.target.value)}
                  />
                  {buscaApto && (
                    <button
                      type="button"
                      onClick={() => setBuscaApto('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Limpar apartamento"
                    >
                      <Icone nome="x" className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* 4. Função / Papel */}
                <div className="relative">
                  <select
                    className={`${inputCls} text-xs py-1.5 font-medium`}
                    value={filtroFuncao}
                    onChange={e => setFiltroFuncao(e.target.value)}
                  >
                    <option value="TODAS" className="dark:bg-slate-800 dark:text-slate-100">Todos os papéis e funções</option>
                    <option value="MORADOR" className="dark:bg-slate-800 dark:text-slate-100">Moradores em geral</option>
                    <option value="PROPRIETARIO" className="dark:bg-slate-800 dark:text-slate-100">Proprietários (Titulares)</option>
                    <option value="INQUILINO" className="dark:bg-slate-800 dark:text-slate-100">Inquilinos (Titulares)</option>
                    <option value="DEPENDENTE" className="dark:bg-slate-800 dark:text-slate-100">Dependentes da Família</option>
                    <option value="PORTEIRO" className="dark:bg-slate-800 dark:text-slate-100">Porteiros / Funcionários</option>
                    <option value="ADMINISTRADOR" className="dark:bg-slate-800 dark:text-slate-100">Administradores / Síndicos</option>
                    <option value="VISITANTE" className="dark:bg-slate-800 dark:text-slate-100">Visitantes</option>
                    <option value="PRESTADOR_SERVICO" className="dark:bg-slate-800 dark:text-slate-100">Prestadores de Serviço</option>
                  </select>
                </div>

                {/* 5. Status */}
                <div className="relative">
                  <select
                    className={`${inputCls} text-xs py-1.5 font-medium`}
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value as any)}
                  >
                    <option value="TODOS" className="dark:bg-slate-800 dark:text-slate-100">Status: Todos</option>
                    <option value="ATIVOS" className="dark:bg-slate-800 dark:text-slate-100">Status: Apenas Ativos</option>
                    <option value="INATIVOS" className="dark:bg-slate-800 dark:text-slate-100">Status: Apenas Inativos</option>
                  </select>
                </div>
              </div>

              {temFiltroAtivo && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Mostrando <b>{listaExibida.length}</b> de <b>{pessoas.length}</b> usuários encontrados
                  </span>
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    title="Limpar todos os filtros"
                  >
                    <Icone nome="x" className="h-3 w-3" />
                    Limpar todos os filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {listaExibida.length === 0 ? (
            <EmptyState
              icone="users"
              titulo="Nenhum usuário encontrado"
              descricao={
                temFiltroAtivo
                  ? 'Tente remover ou ajustar os filtros de nome, CPF, apartamento, status ou papel para expandir a busca.'
                  : 'Comece adicionando moradores, titulares, visitantes ou funcionários ao condomínio.'
              }
              acao={
                temFiltroAtivo ? (
                  <Botao variante="claro" tamanho="sm" onClick={limparFiltros}>
                    Limpar Filtros
                  </Botao>
                ) : !somenteLeitura ? (
                  <div className="flex items-center gap-2">
                    <Botao
                      variante="primario"
                      tamanho="sm"
                      icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setForm({
                          nome: '',
                          email: '',
                          cpf: '',
                          data_nascimento: '',
                          celular: '',
                          id_unidade: '',
                          tipo_vinculo: '',
                          perfis: ['MORADOR'],
                          id_responsavel: '',
                          grau_parentesco: 'FILHO',
                          reside: true,
                          tipo_servico: '',
                        });
                        setErroCadastro(null);
                        setModalAberto(true);
                      }}
                    >
                      Cadastrar Morador
                    </Botao>
                    <Botao
                      variante="claro"
                      tamanho="sm"
                      icone={<Icone nome="shield" className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setFormVisitante({
                          nome: '',
                          cpf: '',
                          data_nascimento: '',
                          email: '',
                          celular: '',
                          tipo: 'VISITANTE',
                          id_unidade: '',
                          tipo_servico: '',
                        });
                        setErroVisitante(null);
                        setModalVisitanteAberto(true);
                      }}
                    >
                      Cadastrar Visitante / Prestador
                    </Botao>
                  </div>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto min-h-[300px] pb-16">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    <th
                      onClick={() => alternarOrdenacao('nome')}
                      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group hover:text-navy dark:hover:text-sky-400 ${
                        colunaOrdenada === 'nome' ? 'text-navy dark:text-sky-400 font-extrabold' : ''
                      }`}
                      title={`Clique para ordenar por Nome (${colunaOrdenada === 'nome' && direcaoOrdenacao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>Nome / Contato</span>
                        <span className={`text-[10px] ${colunaOrdenada === 'nome' ? 'opacity-100 font-black text-navy dark:text-sky-400' : 'opacity-30 group-hover:opacity-80'}`}>
                          {colunaOrdenada === 'nome' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th
                      onClick={() => alternarOrdenacao('apartamento')}
                      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group hover:text-navy dark:hover:text-sky-400 ${
                        colunaOrdenada === 'apartamento' ? 'text-navy dark:text-sky-400 font-extrabold' : ''
                      }`}
                      title={`Clique para ordenar por Apartamento (${colunaOrdenada === 'apartamento' && direcaoOrdenacao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>Apartamento / Bloco</span>
                        <span className={`text-[10px] ${colunaOrdenada === 'apartamento' ? 'opacity-100 font-black text-navy dark:text-sky-400' : 'opacity-30 group-hover:opacity-80'}`}>
                          {colunaOrdenada === 'apartamento' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th
                      onClick={() => alternarOrdenacao('papel')}
                      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group hover:text-navy dark:hover:text-sky-400 ${
                        colunaOrdenada === 'papel' ? 'text-navy dark:text-sky-400 font-extrabold' : ''
                      }`}
                      title={`Clique para ordenar por Vínculo e Papel (${colunaOrdenada === 'papel' && direcaoOrdenacao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>Vínculo & Papel</span>
                        <span className={`text-[10px] ${colunaOrdenada === 'papel' ? 'opacity-100 font-black text-navy dark:text-sky-400' : 'opacity-30 group-hover:opacity-80'}`}>
                          {colunaOrdenada === 'papel' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th
                      onClick={() => alternarOrdenacao('dependentes')}
                      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group hover:text-navy dark:hover:text-sky-400 ${
                        colunaOrdenada === 'dependentes' ? 'text-navy dark:text-sky-400 font-extrabold' : ''
                      }`}
                      title={`Clique para ordenar por Dependentes (${colunaOrdenada === 'dependentes' && direcaoOrdenacao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>Dependentes</span>
                        <span className={`text-[10px] ${colunaOrdenada === 'dependentes' ? 'opacity-100 font-black text-navy dark:text-sky-400' : 'opacity-30 group-hover:opacity-80'}`}>
                          {colunaOrdenada === 'dependentes' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th
                      onClick={() => alternarOrdenacao('status')}
                      className={`py-2.5 px-3 select-none cursor-pointer transition-colors group hover:text-navy dark:hover:text-sky-400 ${
                        colunaOrdenada === 'status' ? 'text-navy dark:text-sky-400 font-extrabold' : ''
                      }`}
                      title={`Clique para ordenar por Status (${colunaOrdenada === 'status' && direcaoOrdenacao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>Status</span>
                        <span className={`text-[10px] ${colunaOrdenada === 'status' ? 'opacity-100 font-black text-navy dark:text-sky-400' : 'opacity-30 group-hover:opacity-80'}`}>
                          {colunaOrdenada === 'status' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>

                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {listaExibidaPaginada.map(p => {
                    const uAtiva = p.unidades && p.unidades[0];
                    const isDependente = uAtiva && uAtiva.vinculo === 'DEPENDENTE';
                    const isTitular = uAtiva && (uAtiva.vinculo === 'PROPRIETARIO' || uAtiva.vinculo === 'INQUILINO');
                    const papelInfo = obterPapelUsuario(p);

                    return (
                      <tr
                        key={p.id_pessoa}
                        onClick={() => abrirPerfil(p)}
                        className={`transition-colors cursor-pointer ${
                          !p.ativo
                            ? 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 opacity-80'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                              {p.nome.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                  {p.nome}
                                </span>
                                {p.tipo_servico && (
                                  <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    {p.tipo_servico}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                                {p.email ? `${p.email} • ` : ''}CPF: {p.cpf}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                          {p.unidades && p.unidades.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.unidades.map((u, i) => (
                                <span
                                  key={i}
                                  className={`rounded-md px-2 py-0.5 font-bold text-[11px] ${
                                    u.bloco === 'Prédio' || u.apartamento === 'Geral'
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60'
                                      : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {u.bloco === 'Prédio' || u.apartamento === 'Geral'
                                    ? '🏢 Prédio / Áreas Comuns'
                                    : `Bl. ${u.bloco} - Apto ${u.apartamento}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-xs">
                          <div className="flex flex-col gap-1 items-start">
                            {/* Papel explícito no condomínio */}
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${papelInfo.badgeCls}`}
                            >
                              <Icone nome={papelInfo.icone} className="h-3 w-3 shrink-0" />
                              {papelInfo.papel}
                            </span>

                            {/* Vínculo com apartamento */}
                            {uAtiva ? (
                              <div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                      uAtiva.vinculo === 'PROPRIETARIO'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                        : uAtiva.vinculo === 'INQUILINO'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : uAtiva.vinculo === 'VISITANTE'
                                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                                        : uAtiva.vinculo === 'PRESTADOR_SERVICO'
                                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                        : 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                    }`}
                                  >
                                    {uAtiva.vinculo}
                                    {uAtiva.parentesco ? ` (${formatarParentesco(uAtiva.parentesco)})` : ''}
                                  </span>

                                  {/* Badge de Residência (Sim / Não) para moradores e proprietários */}
                                  {uAtiva.vinculo !== 'VISITANTE' && uAtiva.vinculo !== 'PRESTADOR_SERVICO' && (
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                        uAtiva.reside !== false
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      }`}
                                      title={uAtiva.reside !== false ? 'Reside no imóvel' : 'Não reside no imóvel (titular externo)'}
                                    >
                                      {uAtiva.reside !== false ? 'Residente' : 'Não Residente'}
                                    </span>
                                  )}
                                </div>
                                {isDependente && p.responsavel && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Resp.: <b className="text-slate-600 dark:text-slate-300">{p.responsavel.nome}</b>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sem unidade vinculada</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-xs">
                          {p.dependentes && p.dependentes.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-[11px] text-navy dark:text-sky-400">
                                {p.dependentes.length} dependente(s)
                              </span>
                            </div>
                          ) : isTitular ? (
                            <span className="text-slate-400 text-[11px]">Nenhum</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            <Badge tipo={p.ativo ? 'sucesso' : 'perigo'}>
                              {p.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {p.total_bloqueios_ativos && p.total_bloqueios_ativos > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300 border border-red-200 dark:border-rose-900/60 px-1.5 py-0.5 text-[10px] font-bold"
                                title="Usuário com penalidade / restrição ativa para áreas comuns"
                              >
                                🚫 {p.total_bloqueios_ativos} Penalidade{p.total_bloqueios_ativos > 1 ? 's' : ''}
                              </span>
                            ) : null}
                            {p.codigo_ativacao && (
                              <span
                                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400"
                                title="Código de 1º Acesso Disponível"
                              >
                                <Icone nome="key" className="h-3 w-3" />
                                {p.codigo_ativacao}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {somenteLeitura ? (
                              <button
                                onClick={() => abrirPerfil(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-navy bg-navy-50/60 hover:bg-navy-100/80 dark:text-sky-400 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
                              >
                                <Icone nome="eye" className="h-3.5 w-3.5" />
                                Ver Perfil
                              </button>
                            ) : (
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setMenuAcoesAbertoId(menuAcoesAbertoId === p.id_pessoa ? null : p.id_pessoa);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
                                  title="Opções do usuário"
                                >
                                  <span>Opções</span>
                                  <Icone nome="chevronDown" className="h-3 w-3 opacity-60" />
                                </button>

                                {menuAcoesAbertoId === p.id_pessoa && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-40 animate-scale-in"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuAcoesAbertoId(null);
                                        abrirPerfil(p);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                                    >
                                      <Icone nome="eye" className="h-3.5 w-3.5 text-navy dark:text-sky-400 shrink-0" />
                                      Ver Perfil
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuAcoesAbertoId(null);
                                        abrirModalEdicao(p);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 text-left cursor-pointer"
                                    >
                                      <Icone nome="edit" className="h-3.5 w-3.5 shrink-0" />
                                      Editar Cadastro
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuAcoesAbertoId(null);
                                        setPessoaAtividadeModal(p);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50/60 dark:hover:bg-teal-950/40 text-left cursor-pointer"
                                    >
                                      <Icone nome="calendar" className="h-3.5 w-3.5 shrink-0" />
                                      Atividades & Reservas
                                    </button>

                                    {p.ativo ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuAcoesAbertoId(null);
                                            abrirModalBloqueio(p);
                                          }}
                                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left cursor-pointer ${
                                            p.total_bloqueios_ativos && p.total_bloqueios_ativos > 0
                                              ? 'text-red-600 dark:text-rose-400 bg-red-50/40 dark:bg-rose-950/20'
                                              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40'
                                          }`}
                                        >
                                          <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                                          Penalidades {p.total_bloqueios_ativos ? `(${p.total_bloqueios_ativos})` : ''}
                                        </button>

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuAcoesAbertoId(null);
                                            setInativando(p);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                                        >
                                          <Icone nome="eyeOff" className="h-3.5 w-3.5 shrink-0" />
                                          Inativar Usuário
                                        </button>

                                        {p.pode_excluir ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMenuAcoesAbertoId(null);
                                              setExcluindo(p);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                                          >
                                            <Icone nome="trash" className="h-3.5 w-3.5 shrink-0" />
                                            Excluir Perfil Errado
                                          </button>
                                        ) : (
                                          <div
                                            title="Esta pessoa possui histórico registrado no condomínio (reservas, encomendas, portaria, etc.) e não pode ser excluída por segurança. Utilize 'Inativar Usuário'."
                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed text-left select-none"
                                          >
                                            <Icone nome="shield" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                            <span>Exclusão bloqueada</span>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuAcoesAbertoId(null);
                                            setReativando(p);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-left cursor-pointer"
                                        >
                                          <Icone nome="check" className="h-3.5 w-3.5 shrink-0" />
                                          Reativar Perfil
                                        </button>

                                        {p.pode_excluir ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMenuAcoesAbertoId(null);
                                              setExcluindo(p);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                                          >
                                            <Icone nome="trash" className="h-3.5 w-3.5 shrink-0" />
                                            Excluir Perfil Errado
                                          </button>
                                        ) : (
                                          <div
                                            title="Esta pessoa possui histórico registrado no condomínio e não pode ser excluída por segurança."
                                            className="w-full flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed text-left select-none"
                                          >
                                            <Icone nome="shield" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                            <span>Exclusão bloqueada</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Paginacao
              paginaAtual={paginaPessoas}
              totalPaginas={totalPaginasPessoas}
              totalRegistros={listaExibida.length}
              itensPorPagina={ITENS_POR_PAGINA}
              onMudarPagina={setPaginaPessoas}
            />
          </>
        )}
        </Cartao>
      )}

      {/* ABA 3: APROVAÇÕES PENDENTES DE DEPENDENTES */}
      {abaAtiva === 'aprovacoes' && (
        <Cartao>
          <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Solicitações de Dependentes Pendentes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Moradores titulares solicitaram a inclusão destes membros na unidade. Avalie para autorizar o acesso.
            </p>
          </div>

          {aprovacoes.length === 0 ? (
            <EmptyState
              icone="check"
              titulo="Nenhuma aprovação pendente"
              descricao="Todas as solicitações de dependentes foram avaliadas."
            />
          ) : (
            <div className="space-y-3">
              {aprovacoesPaginadas.map(ap => (
                <div
                  key={ap.id_pessoa_unidade}
                  className="rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {formatarParentesco(ap.grau_parentesco)}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {ap.nome}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Apartamento: <b>Bl. {ap.bloco} - Apto {ap.numero_apartamento}</b> • E-mail: {ap.email} • CPF: {ap.cpf}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Solicitado pelo titular: <b>{ap.nome_responsavel}</b> ({ap.email_responsavel})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Botao
                      variante="claro"
                      tamanho="sm"
                      onClick={() => avaliarSolicitacao(ap.id_pessoa_unidade, false)}
                    >
                      Rejeitar
                    </Botao>
                    <Botao
                      variante="primario"
                      tamanho="sm"
                      icone={<Icone nome="check" className="h-3.5 w-3.5" />}
                      onClick={() => avaliarSolicitacao(ap.id_pessoa_unidade, true)}
                    >
                      Aprovar Acesso
                    </Botao>
                  </div>
                </div>
              ))}

              <Paginacao
                paginaAtual={paginaAprovacoes}
                totalPaginas={totalPaginasAprovacoes}
                totalRegistros={aprovacoes.length}
                itensPorPagina={ITENS_POR_PAGINA}
                onMudarPagina={setPaginaAprovacoes}
              />
            </div>
          )}
        </Cartao>
      )}

      {/* ABA 3: GESTÃO ESTRUTURAL & VAGAS (COM ACESSO INTEGRADO A EDIÇÃO E DEPENDENTES) */}
      {abaAtiva === 'estrutura' && (
        <EstruturaFisica
          somenteLeitura={true}
          aoEditarPessoa={(p) => abrirModalEdicao(p)}
          aoAdicionarDependente={(titular, idUnidade) => iniciarCadastroDependente(titular, idUnidade)}
          aoBloquear={(p) => abrirModalBloqueio(p)}
          aoInativar={(p) => setInativando(p)}
          aoReativar={(p) => setReativando(p)}
          aoExcluir={(p) => setExcluindo(p)}
        />
      )}

      {/* MODAL: INSPEÇÃO INTERATIVA DO PERFIL & ÁRVORE FAMILIAR (COMPONENTE COMPARTILHADO) */}
      <ModalPerfilUsuario
        aberto={modalPerfilAberto}
        fechar={() => setModalPerfilAberto(false)}
        pessoa={perfilSelecionado}
        aoEditar={(p) => abrirModalEdicao(p)}
        aoVerAtividades={(p) => setPessoaAtividadeModal(p)}
        aoAdicionarDependente={(titular, idUnidade) => iniciarCadastroDependente(titular, idUnidade)}
        aoNavegarParaPessoa={(id) => navegarParaResponsavel(id)}
        aoBloquear={(p) => abrirModalBloqueio(p)}
        aoInativar={(p) => setInativando(p)}
        aoReativar={(p) => setReativando(p)}
        aoExcluir={(p) => setExcluindo(p)}
        somenteLeitura={somenteLeitura}
      />

      {/* MODAL: ATIVIDADE & RESERVAS EM TEMPO REAL */}
      {pessoaAtividadeModal && (
        <ModalAtividadePessoa
          pessoa={pessoaAtividadeModal}
          fechar={() => setPessoaAtividadeModal(null)}
        />
      )}

      {/* Modais de ação restritos à administração */}
      {!somenteLeitura && (
        <>
          {/* MODAL: CADASTRO DE PESSOA & VÍNCULO */}
          {/* MODAL: CADASTRO DE MORADOR / USUÁRIO DO SISTEMA */}
          <Modal
            aberto={modalAberto}
            fechar={() => {
              setForm({ ...FORM_INICIAL_CADASTRO });
              setErroCadastro(null);
              setModalAberto(false);
            }}
            titulo="Cadastrar Usuário / Morador do Sistema"
            largura="max-w-2xl"
            rodape={
              <>
                <Botao
                  type="button"
                  variante="claro"
                  onClick={() => {
                    setForm({ ...FORM_INICIAL_CADASTRO });
                    setErroCadastro(null);
                    setModalAberto(false);
                  }}
                >
                  Cancelar
                </Botao>
                <Botao
                  type="submit"
                  form="form-cadastro-pessoa"
                  variante="primario"
                  carregando={salvando}
                  icone={<Icone nome="check" className="h-4 w-4" />}
                >
                  Cadastrar Usuário
                </Botao>
              </>
            }
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-2">
              Cadastro de morador, porteiro ou administrador com geração de código de 1º acesso para login no sistema.
            </p>
            <form id="form-cadastro-pessoa" onSubmit={cadastrar} className="space-y-4">
              {erroCadastro && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
                  <Icone nome="alert" className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção no cadastro:</span>
                    <p className="mt-0.5">{erroCadastro}</p>
                  </div>
                </div>
              )}
              <Campo rotulo="Nome Completo" obrigatorio>
                <input
                  className={inputCls}
                  value={form.nome}
                  onChange={c('nome')}
                  required
                  maxLength={100}
                  placeholder="Ex.: Maria Clara dos Santos"
                />
              </Campo>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo rotulo="CPF" obrigatorio>
                  <input
                    className={inputCls}
                    value={form.cpf}
                    onChange={e => setForm({ ...form, cpf: mascararCPF(e.target.value) })}
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                  />
                </Campo>

                <Campo rotulo="Data de Nascimento" obrigatorio>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.data_nascimento}
                    onChange={c('data_nascimento')}
                    required
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo rotulo="E-mail de Login" obrigatorio>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={c('email')}
                    required
                    maxLength={120}
                    placeholder="maria@email.com"
                  />
                </Campo>

                <Campo rotulo="Celular" obrigatorio>
                  <input
                    type="tel"
                    className={inputCls}
                    value={form.celular}
                    onChange={e => setForm({ ...form, celular: mascararCelular(e.target.value) })}
                    required
                    maxLength={15}
                    placeholder="(42) 99999-9999"
                  />
                </Campo>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Vínculo com Imóvel & Papéis
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Campo rotulo="Unidade" obrigatorio={form.perfis.includes('MORADOR')}>
                      <select
                        className={inputCls}
                        value={form.id_unidade}
                        onChange={c('id_unidade')}
                        required={form.perfis.includes('MORADOR')}
                      >
                        <option value="">Nenhuma (para Porteiro / Administrador)</option>
                        {unidades
                          .filter(u => u.bloco !== 'Prédio' && u.numero_apartamento !== 'Geral')
                          .map(u => (
                            <option key={u.id_unidade} value={String(u.id_unidade)}>
                              {`Bloco ${u.bloco} - Apto ${u.numero_apartamento} ${obterTextoOcupacaoUnidade(u)}`}
                            </option>
                          ))}
                      </select>
                    </Campo>
                  </div>

                  <div className="sm:col-span-1">
                    <Campo rotulo="Tipo de Vínculo">
                      {(() => {
                        const unidSel = unidades.find(u => String(u.id_unidade) === String(form.id_unidade));
                        const st = obterStatusVinculosUnidade(unidSel);

                        return (
                          <select
                            className={`${inputCls} ${
                              !form.id_unidade
                                ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                                : ''
                            }`}
                            value={!form.id_unidade ? '' : form.tipo_vinculo}
                            onChange={c('tipo_vinculo')}
                            disabled={!form.id_unidade}
                          >
                            {!form.id_unidade ? (
                              <option value="">Não aplicável (sem unidade vinculada)</option>
                            ) : (
                              <>
                                <option
                                  value="PROPRIETARIO"
                                  disabled={!st.podeProprietario}
                                  className={!st.podeProprietario ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : ''}
                                >
                                  {`Proprietário (Titular)${!st.podeProprietario ? ` — (${st.motivoProprietario})` : ''}`}
                                </option>
                                <option
                                  value="INQUILINO"
                                  disabled={!st.podeInquilino}
                                  className={!st.podeInquilino ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : ''}
                                >
                                  {`Inquilino (Titular Locação)${!st.podeInquilino ? ` — (${st.motivoInquilino})` : ''}`}
                                </option>
                                <option value="DEPENDENTE">Dependente Familiar</option>
                              </>
                            )}
                          </select>
                        );
                      })()}
                    </Campo>
                    {!form.id_unidade && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Selecione uma unidade acima para definir o tipo de vínculo de morador.
                      </p>
                    )}
                  </div>
                </div>

                {/* Aviso quando o apartamento selecionado já possui moradores/usuários vinculados */}
                {(() => {
                  const unidSel = unidades.find(u => String(u.id_unidade) === String(form.id_unidade));
                  const temOcupantes = unidSel && (Number(unidSel.total_ocupantes || unidSel.total_moradores || 0) > 0 || Boolean(unidSel.proprietario || unidSel.inquilino));
                  if (!temOcupantes || !unidSel) return null;
                  const st = obterStatusVinculosUnidade(unidSel);

                  return (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/60 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs animate-fade-in">
                      <Icone nome="alert" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-1.5 w-full">
                        <span className="font-bold flex items-center gap-1.5">
                          <span>Aviso de Ocupação da Unidade:</span>
                          <span className="font-semibold text-amber-800 dark:text-amber-300">
                            Apartamento com moradores já vinculados
                          </span>
                        </span>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                          {unidSel.proprietario && (
                            <span>
                              Proprietário atual: <b>{unidSel.proprietario}</b> ({st.proprietarioReside ? 'Residente no imóvel' : 'Não reside no imóvel'}).{' '}
                            </span>
                          )}
                          {unidSel.inquilino && <span>Inquilino atual: <b>{unidSel.inquilino}</b>.{' '}</span>}
                          {unidSel.nomes_ocupantes && <span>Morador(es): <b>{unidSel.nomes_ocupantes}</b>.{' '}</span>}
                          {`Total: ${unidSel.total_ocupantes || unidSel.total_moradores || 1} pessoa(s) vinculada(s).`}
                        </p>
                        <div className="pt-1.5 text-[11px] space-y-1 border-t border-amber-200 dark:border-amber-900/60">
                          {!st.podeProprietario && (
                            <p className="text-amber-900 dark:text-amber-300 flex items-center gap-1">
                              <span>🚫</span>
                              <span><b>Proprietário (Titular)</b> indisponível: este apartamento já possui proprietário titular cadastrado.</span>
                            </p>
                          )}
                          {!st.podeInquilino && (
                            <p className="text-amber-900 dark:text-amber-300 flex items-center gap-1">
                              <span>🚫</span>
                              <span><b>Inquilino</b> indisponível: {st.motivoInquilino}.</span>
                            </p>
                          )}
                          {st.podeInquilino && !st.podeProprietario && (
                            <p className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                              <span>✓</span>
                              <span><b>Inquilino</b> permitido: o proprietário não reside no imóvel e não há inquilino titular cadastrado.</span>
                            </p>
                          )}
                          {!st.podeProprietario && !st.podeInquilino && (
                            <p className="text-indigo-900 dark:text-indigo-300 font-semibold flex items-center gap-1">
                              <span>ℹ️</span>
                              <span>Como já existem titulares no imóvel, vincule este morador como <b>Dependente Familiar</b>.</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* SE FOR MORADOR: RESIDE NA UNIDADE (SIM / NÃO) */}
                {form.perfis.includes('MORADOR') && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Reside no Apartamento? <span className="text-red-500">*</span>
                    </label>
                    {form.tipo_vinculo !== 'PROPRIETARIO' ? (
                      <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <Icone nome="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          <b>Sim (Residente no Imóvel)</b> — Moradores com vínculo de <b>{form.tipo_vinculo === 'INQUILINO' ? 'Inquilino' : 'Dependente Familiar'}</b> residem obrigatoriamente no apartamento.
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, reside: true })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            form.reside
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-600 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <Icone nome="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Sim (Residente no Imóvel)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setForm({ ...form, reside: false })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            !form.reside
                              ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <Icone nome="x" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span>Não (Proprietário Não Residente)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* SELEÇÃO MÚLTIPLA DE PAPÉIS NO CADASTRO DE USUÁRIO */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Papéis no Condomínio <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Selecione um ou mais papéis para o usuário do sistema
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                    {OPCOES_PAPEIS.map(op => {
                      const selecionado = form.perfis.includes(op.tipo);
                      const moradorObrigatorio = op.tipo === 'MORADOR' && Boolean(form.id_unidade);
                      const moradorSemUnidade = op.tipo === 'MORADOR' && !form.id_unidade;

                      return (
                        <div
                          key={op.tipo}
                          onClick={() => {
                            if (moradorSemUnidade) {
                              setErroCadastro('Para atribuir o papel de Morador, selecione primeiro uma unidade residencial acima.');
                              return;
                            }
                            togglePerfilCadastro(op.tipo);
                          }}
                          className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all select-none ${
                            moradorSemUnidade
                              ? 'cursor-not-allowed opacity-40 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400'
                              : 'cursor-pointer hover:shadow-xs'
                          } ${
                            selecionado && !moradorSemUnidade
                              ? op.corAtiva
                              : !moradorSemUnidade
                              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                              : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  selecionado
                                    ? 'bg-white/80 dark:bg-slate-800 shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                              >
                                <Icone nome={op.icone} className={`h-4 w-4 ${selecionado ? op.iconeCor : ''}`} />
                              </div>

                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                  selecionado
                                    ? 'border-transparent bg-navy text-white dark:bg-sky-500 shadow-2xs'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {selecionado && (
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {op.titulo}
                              </span>
                              {moradorObrigatorio && (
                                <span className="rounded bg-emerald-200/90 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                                  🔒 Vinculado
                                </span>
                              )}
                              {moradorSemUnidade && (
                                <span className="rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 text-[9px] font-bold">
                                  Requer unidade
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                              {op.descricao}
                            </p>

                            {moradorObrigatorio && (
                              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                                <Icone nome="check" className="h-3 w-3 shrink-0" />
                                Obrigatório com unidade vinculada
                              </p>
                            )}
                            {moradorSemUnidade && (
                              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                <Icone nome="alert" className="h-3 w-3 shrink-0" />
                                Vincule uma unidade acima para ativar
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SE FOR DEPENDENTE: CAMPOS ADICIONAIS DE RESPONSÁVEL E PARENTESCO */}
                {form.tipo_vinculo === 'DEPENDENTE' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Campo rotulo="Titular Responsável" obrigatorio>
                      <select
                        className={inputCls}
                        value={form.id_responsavel}
                        onChange={c('id_responsavel')}
                        required
                      >
                        <option value="">Selecione o Titular da Unidade</option>
                        {titularesNaUnidade.map(t => (
                          <option key={t.id_pessoa} value={t.id_pessoa}>
                            {t.nome} ({t.unidades[0]?.vinculo})
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo rotulo="Grau de Parentesco" obrigatorio>
                      <select
                        className={inputCls}
                        value={form.grau_parentesco}
                        onChange={c('grau_parentesco')}
                        required
                      >
                        <option value="CONJUGE">Cônjuge / Companheiro(a)</option>
                        <option value="FILHO">Filho(a) / Enteado(a)</option>
                        <option value="PAI_MAE">Pai / Mãe / Sogro(a)</option>
                        <option value="OUTRO">Outro Familiar / Agregado</option>
                      </select>
                    </Campo>
                  </div>
                )}
              </div>
            </form>
          </Modal>

          {/* MODAL: CADASTRO DE VISITANTE / PRESTADOR DE SERVIÇO */}
          <Modal
            aberto={modalVisitanteAberto}
            fechar={() => { if (!salvandoVisitante) setModalVisitanteAberto(false); }}
            titulo="Cadastrar Visitante / Prestador de Serviço"
            largura="max-w-2xl"
            rodape={
              <>
                <Botao
                  type="button"
                  variante="claro"
                  disabled={salvandoVisitante}
                  onClick={() => setModalVisitanteAberto(false)}
                >
                  Cancelar
                </Botao>
                <Botao
                  type="submit"
                  form="form-cadastro-visitante"
                  variante="primario"
                  carregando={salvandoVisitante}
                  icone={<Icone nome="check" className="h-4 w-4" />}
                >
                  Salvar Cadastro
                </Botao>
              </>
            }
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-2">
              Cadastro para controle de acesso físico, portaria e empréstimo de chaves. Não gera login no sistema.
            </p>
            <form id="form-cadastro-visitante" onSubmit={cadastrarVisitante} className="space-y-4">
              {erroVisitante && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
                  <Icone nome="alert" className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção no cadastro:</span>
                    <p className="mt-0.5">{erroVisitante}</p>
                  </div>
                </div>
              )}

              <Campo rotulo="Tipo de Acesso / Papel">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormVisitante(f => ({ ...f, tipo: 'VISITANTE' }))}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formVisitante.tipo === 'VISITANTE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Visitante
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormVisitante(f => ({ ...f, tipo: 'PRESTADOR_SERVICO' }))}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formVisitante.tipo === 'PRESTADOR_SERVICO'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    Prestador de Serviço
                  </button>
                </div>
              </Campo>

              {formVisitante.tipo === 'PRESTADOR_SERVICO' && (
                <Campo
                  rotulo="Descrição do Tipo de Prestador de Serviço"
                  obrigatorio
                  ajuda="Informe a profissão, especialidade ou tipo de trabalho (ex: Eletricista, Encanador, Pintor, Técnico de Internet, etc.)"
                >
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Ex: Eletricista, Encanador, Pintor, Técnico de Internet..."
                    value={formVisitante.tipo_servico}
                    onChange={e => setFormVisitante(f => ({ ...f, tipo_servico: e.target.value }))}
                    className={inputCls}
                  />
                </Campo>
              )}

              <Campo rotulo="Nome Completo" obrigatorio>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ex: João da Silva"
                  value={formVisitante.nome}
                  onChange={e => setFormVisitante(f => ({ ...f, nome: e.target.value }))}
                  className={inputCls}
                />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo rotulo="CPF" obrigatorio>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={formVisitante.cpf}
                    onChange={e => setFormVisitante(f => ({ ...f, cpf: mascararCPF(e.target.value) }))}
                    className={inputCls}
                  />
                </Campo>

                <Campo rotulo="Data de Nascimento (opcional)">
                  <input
                    type="date"
                    value={formVisitante.data_nascimento}
                    onChange={e => setFormVisitante(f => ({ ...f, data_nascimento: e.target.value }))}
                    className={inputCls}
                  />
                </Campo>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo rotulo="E-mail (opcional)">
                  <input
                    type="email"
                    maxLength={120}
                    placeholder="visitante@email.com"
                    value={formVisitante.email}
                    onChange={e => setFormVisitante(f => ({ ...f, email: e.target.value }))}
                    className={inputCls}
                  />
                </Campo>

                <Campo rotulo="Celular (opcional)">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={formVisitante.celular}
                    onChange={e => setFormVisitante(f => ({ ...f, celular: mascararCelular(e.target.value) }))}
                    className={inputCls}
                  />
                </Campo>
              </div>

              <Campo rotulo="Unidade Relacionada (opcional)">
                <select
                  value={formVisitante.id_unidade}
                  onChange={e => setFormVisitante(f => ({ ...f, id_unidade: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Nenhuma unidade vinculada</option>
                  {unidades
                    .filter(u => u.bloco === 'Prédio' || u.numero_apartamento === 'Geral')
                    .map(u => (
                      <option key={u.id_unidade} value={u.id_unidade}>
                        🏢 Prédio / Condomínio (Áreas Comuns)
                      </option>
                    ))}
                  {unidades
                    .filter(u => u.bloco !== 'Prédio' && u.numero_apartamento !== 'Geral')
                    .map(u => (
                      <option key={u.id_unidade} value={u.id_unidade}>
                        Bloco {u.bloco} - Apto {u.numero_apartamento}
                      </option>
                    ))}
                </select>
              </Campo>
            </form>
          </Modal>

      {/* MODAL: EDIÇÃO DE DADOS, PERFIL & VÍNCULO (CORREÇÃO DE ERROS) */}
      <Modal
        aberto={modalEdicaoAberto}
        fechar={() => setModalEdicaoAberto(false)}
        titulo={`Editar Cadastro — ${pessoaEditando?.nome || ''}`}
        largura="max-w-2xl"
        rodape={
          <div className="flex items-center justify-between w-full">
            {pessoaEditando ? (
              pessoaEditando.pode_excluir ? (
                <Botao
                  type="button"
                  variante="perigo"
                  tamanho="sm"
                  onClick={() => {
                    setExcluindo(pessoaEditando);
                    setModalEdicaoAberto(false);
                  }}
                  icone={<Icone nome="trash" className="h-4 w-4" />}
                >
                  Excluir Perfil Errado
                </Botao>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
                  <Icone nome="shield" className="h-3.5 w-3.5 text-slate-400" />
                  <span>Exclusão bloqueada (possui histórico). Use Inativar.</span>
                </div>
              )
            ) : <div />}
            <div className="flex items-center gap-2">
              <Botao type="button" variante="claro" onClick={() => setModalEdicaoAberto(false)}>
                Cancelar
              </Botao>
              <Botao
                type="submit"
                form="form-edicao-pessoa"
                variante="primario"
                carregando={salvandoEdicao}
                icone={<Icone nome="check" className="h-4 w-4" />}
              >
                Salvar Alterações
              </Botao>
            </div>
          </div>
        }
      >
        <form id="form-edicao-pessoa" onSubmit={salvarEdicao} className="space-y-4">
          {ehMoradorEdicao && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 flex items-start gap-2.5">
              <Icone nome="shield" className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
              <div>
                <span className="font-bold">Regra de Segurança de Moradores:</span>
                <p className="mt-0.5">
                  Por integridade cadastral e conformidade, os campos <b>Nome Completo</b>, <b>CPF</b>, <b>Data de Nascimento</b> e <b>E-mail de Login</b> são bloqueados para edição após o cadastro. Você pode alterar celular, unidade vinculada, tipo de vínculo e permissões.
                </p>
              </div>
            </div>
          )}

          {erroEdicao && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
              <Icone nome="alert" className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold">Atenção ao atualizar:</span>
                <p className="mt-0.5">{erroEdicao}</p>
              </div>
            </div>
          )}

          <Campo
            rotulo={
              <span className="inline-flex items-center gap-1.5">
                <span>Nome Completo</span>
                {ehMoradorEdicao && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    🔒 Bloqueado
                  </span>
                )}
              </span>
            }
            obrigatorio
          >
            <input
              className={`${inputCls} ${
                ehMoradorEdicao
                  ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                  : ''
              }`}
              value={formEdicao.nome}
              onChange={cEdicao('nome')}
              disabled={ehMoradorEdicao}
              required
              maxLength={100}
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo
              rotulo={
                <span className="inline-flex items-center gap-1.5">
                  <span>CPF</span>
                  {ehMoradorEdicao && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      🔒 Bloqueado
                    </span>
                  )}
                </span>
              }
              obrigatorio
            >
              <input
                className={`${inputCls} ${
                  ehMoradorEdicao
                    ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                    : ''
                }`}
                value={formEdicao.cpf}
                onChange={e => setFormEdicao({ ...formEdicao, cpf: mascararCPF(e.target.value) })}
                disabled={ehMoradorEdicao}
                required
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </Campo>

            <Campo
              rotulo={
                <span className="inline-flex items-center gap-1.5">
                  <span>Data de Nascimento {formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO') ? '(Opcional)' : ''}</span>
                  {ehMoradorEdicao && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      🔒 Bloqueado
                    </span>
                  )}
                </span>
              }
              obrigatorio={!formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
            >
              <input
                type="date"
                className={`${inputCls} ${
                  ehMoradorEdicao
                    ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                    : ''
                }`}
                value={formEdicao.data_nascimento}
                onChange={cEdicao('data_nascimento')}
                disabled={ehMoradorEdicao}
                required={!formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo
              rotulo={
                <span className="inline-flex items-center gap-1.5">
                  <span>{formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO') ? 'E-mail (Opcional)' : 'E-mail de Login'}</span>
                  {ehMoradorEdicao && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      🔒 Bloqueado
                    </span>
                  )}
                </span>
              }
              obrigatorio={!formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
            >
              <input
                type="email"
                className={`${inputCls} ${
                  ehMoradorEdicao
                    ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                    : ''
                }`}
                value={formEdicao.email}
                onChange={cEdicao('email')}
                disabled={ehMoradorEdicao}
                required={!formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
                maxLength={120}
              />
            </Campo>

            <Campo rotulo="Celular" obrigatorio>
              <input
                type="tel"
                className={inputCls}
                value={formEdicao.celular}
                onChange={e => setFormEdicao({ ...formEdicao, celular: mascararCelular(e.target.value) })}
                required
                maxLength={15}
                placeholder="(42) 99999-9999"
              />
            </Campo>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vínculo com Unidade & Papel
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Campo rotulo="Unidade" obrigatorio={formEdicao.perfis.includes('MORADOR')}>
                  <select
                    className={inputCls}
                    value={formEdicao.id_unidade}
                    onChange={cEdicao('id_unidade')}
                    required={formEdicao.perfis.includes('MORADOR')}
                  >
                    <option value="">Nenhuma (para Porteiro / Administrador)</option>
                    {unidades
                      .filter(u => u.bloco !== 'Prédio' && u.numero_apartamento !== 'Geral')
                      .map(u => (
                        <option key={u.id_unidade} value={String(u.id_unidade)}>
                          {`Bloco ${u.bloco} - Apto ${u.numero_apartamento} ${obterTextoOcupacaoUnidade(u)}`}
                        </option>
                      ))}
                  </select>
                </Campo>
              </div>

              <div className="sm:col-span-1">
                <Campo rotulo="Tipo de Vínculo">
                  {(() => {
                    const unidSel = unidades.find(u => String(u.id_unidade) === String(formEdicao.id_unidade));
                    const st = obterStatusVinculosUnidade(unidSel, pessoaEditando?.id_pessoa, pessoaEditando);

                    return (
                      <select
                        className={`${inputCls} ${
                          !formEdicao.id_unidade
                            ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                            : ''
                        }`}
                        value={!formEdicao.id_unidade ? '' : formEdicao.tipo_vinculo}
                        onChange={cEdicao('tipo_vinculo')}
                        disabled={!formEdicao.id_unidade}
                      >
                        {!formEdicao.id_unidade ? (
                          <option value="">Não aplicável (sem unidade vinculada)</option>
                        ) : (
                          <>
                            <option
                              value="PROPRIETARIO"
                              disabled={!st.podeProprietario}
                              className={!st.podeProprietario ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : ''}
                            >
                              {`Proprietário (Titular)${!st.podeProprietario ? ` — (${st.motivoProprietario})` : ''}`}
                            </option>
                            <option
                              value="INQUILINO"
                              disabled={!st.podeInquilino}
                              className={!st.podeInquilino ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' : ''}
                            >
                              {`Inquilino (Titular Locação)${!st.podeInquilino ? ` — (${st.motivoInquilino})` : ''}`}
                            </option>
                            <option value="DEPENDENTE">Dependente Familiar</option>
                          </>
                        )}
                      </select>
                    );
                  })()}
                </Campo>
                {!formEdicao.id_unidade && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Selecione uma unidade acima para definir o tipo de vínculo.
                  </p>
                )}
              </div>
            </div>

            {/* Aviso quando o apartamento selecionado na edição já possui moradores/usuários vinculados */}
            {(() => {
              const unidSel = unidades.find(u => String(u.id_unidade) === String(formEdicao.id_unidade));
              const temOcupantes = unidSel && (Number(unidSel.total_ocupantes || unidSel.total_moradores || 0) > 0 || Boolean(unidSel.proprietario || unidSel.inquilino));
              if (!temOcupantes || !unidSel) return null;
              const st = obterStatusVinculosUnidade(unidSel, pessoaEditando?.id_pessoa, pessoaEditando);

              return (
                <div className="rounded-xl border border-amber-300 bg-amber-50/95 dark:border-amber-800 dark:bg-amber-950/60 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs animate-fade-in">
                  <Icone nome="alert" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1.5 w-full">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>Aviso de Ocupação da Unidade:</span>
                      <span className="font-semibold text-amber-800 dark:text-amber-300">
                        Apartamento com moradores já vinculados
                      </span>
                    </span>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                      {unidSel.proprietario && (
                        <span>
                          Proprietário atual: <b>{unidSel.proprietario}</b> ({st.proprietarioReside ? 'Residente no imóvel' : 'Não reside no imóvel'}).{' '}
                        </span>
                      )}
                      {unidSel.inquilino && <span>Inquilino atual: <b>{unidSel.inquilino}</b>.{' '}</span>}
                      {unidSel.nomes_ocupantes && <span>Morador(es): <b>{unidSel.nomes_ocupantes}</b>.{' '}</span>}
                      {`Total: ${unidSel.total_ocupantes || unidSel.total_moradores || 1} pessoa(s) vinculada(s).`}
                    </p>
                    <div className="pt-1.5 text-[11px] space-y-1 border-t border-amber-200 dark:border-amber-900/60">
                      {st.ehProprioProprietario && (
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                          <span>👤</span>
                          <span>Você está editando o <b>Proprietário Titular</b> desta unidade.</span>
                        </p>
                      )}
                      {!st.podeProprietario && !st.ehProprioProprietario && (
                        <p className="text-amber-900 dark:text-amber-300 flex items-center gap-1">
                          <span>🚫</span>
                          <span><b>Proprietário (Titular)</b> indisponível: este apartamento já possui proprietário titular cadastrado.</span>
                        </p>
                      )}
                      {st.ehProprioInquilino && (
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                          <span>👤</span>
                          <span>Você está editando o <b>Inquilino Titular</b> desta locação.</span>
                        </p>
                      )}
                      {!st.podeInquilino && !st.ehProprioInquilino && (
                        <p className="text-amber-900 dark:text-amber-300 flex items-center gap-1">
                          <span>🚫</span>
                          <span><b>Inquilino</b> indisponível: {st.motivoInquilino}.</span>
                        </p>
                      )}
                      {st.podeInquilino && !st.ehProprioInquilino && !st.ehProprioProprietario && (
                        <p className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                          <span>✓</span>
                          <span><b>Inquilino</b> permitido: o proprietário não reside no imóvel e não há inquilino titular cadastrado.</span>
                        </p>
                      )}
                      {!st.podeProprietario && !st.podeInquilino && !st.ehProprioProprietario && !st.ehProprioInquilino && (
                        <p className="text-indigo-900 dark:text-indigo-300 font-semibold flex items-center gap-1">
                          <span>ℹ️</span>
                          <span>Como já existem titulares no imóvel, vincule este morador como <b>Dependente Familiar</b>.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SE FOR MORADOR: RESIDE NA UNIDADE (SIM / NÃO) */}
            {formEdicao.perfis.includes('MORADOR') && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reside no Apartamento? <span className="text-red-500">*</span>
                </label>
                {formEdicao.tipo_vinculo !== 'PROPRIETARIO' ? (
                  <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Icone nome="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      <b>Sim (Residente no Imóvel)</b> — Moradores com vínculo de <b>{formEdicao.tipo_vinculo === 'INQUILINO' ? 'Inquilino' : 'Dependente Familiar'}</b> residem obrigatoriamente no apartamento.
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormEdicao({ ...formEdicao, reside: true })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        formEdicao.reside
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-600 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Icone nome="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Sim (Residente no Imóvel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormEdicao({ ...formEdicao, reside: false })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !formEdicao.reside
                          ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Icone nome="x" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>Não (Proprietário Não Residente)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SELEÇÃO MÚLTIPLA DE PAPÉIS NA EDIÇÃO */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Papéis no Condomínio <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Marque os papéis que este usuário exercerá no condomínio
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                {OPCOES_PAPEIS.map(op => {
                  const selecionado = formEdicao.perfis.includes(op.tipo);
                  const bloqueadoAdmin = ehUnicoAdmin && op.tipo === 'SINDICO';
                  const moradorObrigatorio = op.tipo === 'MORADOR' && Boolean(formEdicao.id_unidade);
                  const moradorSemUnidade = op.tipo === 'MORADOR' && !formEdicao.id_unidade;
                  const cardDesabilitado = bloqueadoAdmin || moradorSemUnidade;

                  return (
                    <div
                      key={op.tipo}
                      onClick={() => {
                        if (bloqueadoAdmin) return;
                        if (moradorSemUnidade) {
                          setErroEdicao('Para atribuir o papel de Morador, selecione primeiro uma unidade residencial acima.');
                          return;
                        }
                        togglePerfilEdicao(op.tipo);
                      }}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all select-none ${
                        bloqueadoAdmin
                          ? 'cursor-not-allowed border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 dark:border-indigo-600 opacity-95'
                          : cardDesabilitado
                          ? 'cursor-not-allowed opacity-40 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400'
                          : 'cursor-pointer hover:shadow-xs'
                      } ${
                        selecionado && !cardDesabilitado
                          ? op.corAtiva
                          : !cardDesabilitado
                          ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          : ''
                      }`}
                    >
                      <div>
                        {/* Linha Superior: Ícone à esquerda, Checkbox à direita */}
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              selecionado
                                ? 'bg-white/80 dark:bg-slate-800 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Icone nome={op.icone} className={`h-4 w-4 ${selecionado ? op.iconeCor : ''}`} />
                          </div>

                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              selecionado
                                ? 'border-transparent bg-navy text-white dark:bg-sky-500 shadow-2xs'
                                : cardDesabilitado
                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {selecionado && (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Título & Badge de trava */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {op.titulo}
                          </span>
                          {bloqueadoAdmin && (
                            <span className="rounded bg-amber-200/90 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                              🔒 Obrigatório
                            </span>
                          )}
                          {moradorObrigatorio && (
                            <span className="rounded bg-emerald-200/90 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                              🔒 Vinculado
                            </span>
                          )}
                          {moradorSemUnidade && (
                            <span className="rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 text-[9px] font-bold">
                              Requer unidade
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {op.descricao}
                        </p>

                        {moradorObrigatorio && (
                          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                            <Icone nome="check" className="h-3 w-3 shrink-0" />
                            Obrigatório com unidade vinculada
                          </p>
                        )}
                        {moradorSemUnidade && (
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                            <Icone nome="alert" className="h-3 w-3 shrink-0" />
                            Vincule uma unidade acima para ativar
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {ehUnicoAdmin && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                  <Icone nome="shield" className="h-4 w-4 shrink-0" />
                  <span>
                    Você é o único administrador ativo do condomínio. Por segurança, seu perfil administrativo não pode ser removido.
                  </span>
                </div>
              )}
            </div>

            {/* SE FOR DEPENDENTE: RESPONSÁVEL E GRAU DE PARENTESCO */}
            {formEdicao.tipo_vinculo === 'DEPENDENTE' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <Campo rotulo="Titular Responsável" obrigatorio>
                  <select
                    className={inputCls}
                    value={formEdicao.id_responsavel}
                    onChange={cEdicao('id_responsavel')}
                    required
                  >
                    <option value="">Selecione o Titular da Unidade</option>
                    {titularesNaUnidadeEdicao.map(t => (
                      <option key={t.id_pessoa} value={t.id_pessoa}>
                        {t.nome} ({t.unidades[0]?.vinculo})
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo rotulo="Grau de Parentesco" obrigatorio>
                  <select
                    className={inputCls}
                    value={formEdicao.grau_parentesco}
                    onChange={cEdicao('grau_parentesco')}
                    required
                  >
                    <option value="CONJUGE">Cônjuge / Companheiro(a)</option>
                    <option value="FILHO">Filho(a) / Enteado(a)</option>
                    <option value="PAI_MAE">Pai / Mãe / Sogro(a)</option>
                    <option value="OUTRO">Outro Familiar / Agregado</option>
                  </select>
                </Campo>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL DE SUCESSO DO CÓDIGO DE ATIVAÇÃO */}
      {codigoGeradoSucesso && (
        <Modal
          aberto={true}
          fechar={() => setCodigoGeradoSucesso(null)}
          titulo="Código de Primeiro Acesso Gerado"
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
              <Icone nome="key" className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Entregue este código ao morador para que ele defina sua senha no primeiro acesso:
              </p>
              <div className="mt-3 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/60">
                <span className="font-mono text-2xl font-black tracking-widest text-sky-900 dark:text-sky-200">
                  {codigoGeradoSucesso}
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Botao
                variante="primario"
                onClick={() => {
                  navigator.clipboard.writeText(codigoGeradoSucesso);
                  setMsg({ t: 'Código copiado para a área de transferência!', tipo: 'ok' });
                  setCodigoGeradoSucesso(null);
                }}
              >
                Copiar e Concluir
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      {/* POP-UP DE ERRO ESPECÍFICO DE CONFLITO DE CADASTRO OU TITULARIDADE */}
      {popupErro && (
        <ModalConfirmacao
          aberto={!!popupErro}
          fechar={() => setPopupErro(null)}
          confirmar={() => setPopupErro(null)}
          titulo={popupErro.toLowerCase().includes('excluir') ? 'Aviso de Exclusão' : 'Aviso de Cadastro'}
          mensagem={
            <div className="space-y-2 text-left">
              <p className="text-xs font-bold text-red-600 dark:text-rose-400">
                {popupErro}
              </p>
              {popupErro.toLowerCase().includes('apartamento') ||
              popupErro.toLowerCase().includes('proprietário') ||
              popupErro.toLowerCase().includes('inquilino') ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                  Regra Condominial: Cada apartamento pode ter no máximo 1 proprietário ativo e 1 inquilino ativo. Caso precise trocar o titular ou corrigir um cadastro anterior, edite o perfil existente ou inative o morador atual.
                </p>
              ) : popupErro.toLowerCase().includes('histórico') ||
                popupErro.toLowerCase().includes('reserva') ||
                popupErro.toLowerCase().includes('encomenda') ||
                popupErro.toLowerCase().includes('chave') ||
                popupErro.toLowerCase().includes('comunicado') ||
                popupErro.toLowerCase().includes('bloqueio') ? (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                  Auditoria & Histórico: Para preservar os registros de portaria e reservas do condomínio, pessoas com histórico oficial não podem ser apagadas do banco. Utilize a opção "Inativar" para revogar todo e qualquer acesso com segurança.
                </p>
              ) : null}
            </div>
          }
          textoBotaoConfirmar="Entendido"
          textoBotaoCancelar=""
          variante="perigo"
          icone="alert"
        />
      )}

      {/* MODAL DE PENALIDADES E BLOQUEIO DE ÁREAS COMUNS (RN03) */}
      <Modal
        aberto={modalBloqueioAberto}
        fechar={() => setModalBloqueioAberto(false)}
        titulo={`Penalidades & Restrições de Áreas — ${pessoaBloqueio?.nome || ''}${
          pessoaBloqueio?.email ? ` (${pessoaBloqueio.email})` : ''
        }`}
        largura="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-start gap-2.5">
            <Icone nome="alert" className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Regra Condominial (RN03):</span>
              <p className="mt-0.5">
                O afastamento impede que o morador realize reservas para as áreas selecionadas (ou todas as áreas) durante o período estipulado, em decorrência de infração ou penalidade às regras do condomínio.
              </p>
              {pessoaBloqueio && (
                <p className="mt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  Morador: {pessoaBloqueio.nome} • CPF: {pessoaBloqueio.cpf} • E-mail: {pessoaBloqueio.email}
                </p>
              )}
            </div>
          </div>

          {/* Histórico e Penalidades Vigentes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Penalidades Registradas
            </h4>
            {carregandoBloqueios ? (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            ) : bloqueiosPessoa.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">
                Nenhuma penalidade ou restrição registrada para esta pessoa.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {bloqueiosPessoa.map((b: any) => (
                  <div
                    key={b.id_bloqueio_perfil}
                    className={`rounded-xl border p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      b.ativo
                        ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {b.nome_area ? `Área: ${b.nome_area}` : 'Todas as Áreas Comuns (Geral)'}
                        </span>
                        <Badge tipo={b.ativo ? 'aviso' : 'neutro'}>
                          {b.ativo ? 'Vigente' : 'Encerrada'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Motivo: {b.motivo}
                        </span>
                      </div>
                      {b.descricao && (
                        <p className="mt-1 text-slate-600 dark:text-slate-300 italic">
                          "{b.descricao}"
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        Início: {new Date(b.data_hora_inicio).toLocaleDateString('pt-BR')}
                        {b.data_hora_fim
                          ? ` • Término: ${new Date(b.data_hora_fim).toLocaleDateString('pt-BR')}`
                          : ' • Prazo: Indeterminado'}
                        {b.registrado_por && ` • Registrado por: ${b.registrado_por}`}
                      </p>
                    </div>

                    {b.ativo && (
                      <Botao
                        type="button"
                        variante="claro"
                        tamanho="sm"
                        onClick={() => encerrarBloqueio(b.id_bloqueio_perfil)}
                        className="shrink-0 text-red-600 hover:text-red-700"
                      >
                        Revogar Penalidade
                      </Botao>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulário para Aplicar Nova Penalidade */}
          <form onSubmit={aplicarBloqueio} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Aplicar Nova Penalidade / Afastamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo rotulo="Área Comum Afetada">
                <select
                  className={inputCls}
                  value={formBloqueio.id_area_comum}
                  onChange={e => setFormBloqueio({ ...formBloqueio, id_area_comum: e.target.value })}
                >
                  <option value="">Todas as Áreas Comuns (Suspensão Geral)</option>
                  {areas.map(a => (
                    <option key={a.id_area_comum} value={a.id_area_comum}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo rotulo="Motivo da Penalidade" obrigatorio>
                <select
                  className={inputCls}
                  value={formBloqueio.motivo}
                  onChange={e => setFormBloqueio({ ...formBloqueio, motivo: e.target.value })}
                >
                  <option value="INFRACAO">Infração às Regras do Condomínio</option>
                  <option value="INADIMPLENCIA">Inadimplência</option>
                  <option value="SOLICITACAO">Solicitação Própria</option>
                  <option value="OUTRO">Outro Motivo</option>
                </select>
              </Campo>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo rotulo="Data/Hora de Término (Opcional)" ajuda="Deixe em branco se indeterminado">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={formBloqueio.data_hora_fim}
                  onChange={e => setFormBloqueio({ ...formBloqueio, data_hora_fim: e.target.value })}
                />
              </Campo>

              <Campo rotulo="Justificativa da Ocorrência" obrigatorio className="sm:col-span-2">
                <textarea
                  required
                  rows={2}
                  className={inputCls}
                  placeholder="Descreva a ocorrência, regras infringidas ou motivo da suspensão..."
                  value={formBloqueio.descricao}
                  onChange={e => setFormBloqueio({ ...formBloqueio, descricao: e.target.value })}
                />
              </Campo>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Botao type="button" variante="claro" onClick={() => setModalBloqueioAberto(false)}>
                Fechar
              </Botao>
              <Botao
                type="submit"
                variante="perigo"
                carregando={salvandoBloqueio}
                icone={<Icone nome="alert" className="h-4 w-4" />}
              >
                Aplicar Penalidade
              </Botao>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de Confirmação de Inativação */}
      <ModalConfirmacao
        aberto={!!inativando}
        fechar={() => setInativando(null)}
        confirmar={confirmarInativacao}
        titulo="Inativar Usuário"
        mensagem={
          inativando && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza de que deseja inativar{' '}
                <b className="text-slate-900 dark:text-slate-100">{inativando.nome}</b> (
                {inativando.email})?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                O usuário será movido para a aba "Usuários Inativos". Todos os perfis vigentes desta pessoa e os vínculos de seus dependentes serão encerrados.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Inativar Usuário"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="alert"
      />

      {/* Modal de Confirmação de Reativação */}
      <ModalConfirmacao
        aberto={!!reativando}
        fechar={() => setReativando(null)}
        confirmar={confirmarReativacao}
        titulo="Reativar Perfil de Usuário"
        carregando={salvandoReativacao}
        mensagem={
          reativando && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Deseja restabelecer o acesso e reativar o usuário{' '}
                <b className="text-slate-900 dark:text-slate-100">{reativando.nome}</b>?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                O perfil será restaurado e voltará a aparecer na aba de "Cadastros Ativos". O vínculo residencial mais recente também será reativado, desde que não haja outro titular ocupando o mesmo apartamento.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Reativar Perfil"
        textoBotaoCancelar="Cancelar"
        variante="sucesso"
        icone="check"
      />

      {/* Modal de Confirmação de Exclusão Definitiva */}
      <ModalConfirmacao
        aberto={!!excluindo}
        fechar={() => setExcluindo(null)}
        confirmar={excluindo?.pode_excluir === false ? () => setExcluindo(null) : confirmarExclusao}
        titulo={excluindo?.pode_excluir === false ? 'Exclusão Bloqueada por Segurança' : 'Excluir Perfil Criado por Engano'}
        carregando={salvandoExclusao}
        mensagem={
          excluindo && (
            <div className="space-y-3 text-left">
              {excluindo.pode_excluir === false ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                    <Icone nome="shield" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Exclusão não permitida por questão de segurança
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    O morador <b className="text-slate-900 dark:text-slate-100">{excluindo.nome}</b> possui registros vinculados no condomínio (reservas de áreas comuns, encomendas na portaria, chaves, avisos ou dependentes).
                  </p>
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                    Para preservar a auditoria jurídica e integridade histórica do condomínio, exclusões só são possíveis caso o perfil tenha sido criado por engano e não possua nenhuma movimentação. Para revogar os acessos deste morador, utilize a opção <b>"Inativar Usuário"</b>.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Tem certeza de que deseja <b className="text-red-600">excluir definitivamente</b> o cadastro de{' '}
                    <b className="text-slate-900 dark:text-slate-100">{excluindo.nome}</b> ({excluindo.email})?
                  </p>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-800/60 space-y-1">
                    <p className="font-bold text-rose-700 dark:text-rose-300">Perfil sem registros vinculados:</p>
                    <p>
                      Esta pessoa não possui movimentações (reservas, encomendas ou portaria) no condomínio. Esta opção destina-se a remover perfis cadastrados incorretamente pela administração.
                    </p>
                  </div>
                </>
              )}
            </div>
          )
        }
        textoBotaoConfirmar={excluindo?.pode_excluir === false ? 'Entendido (Fechar)' : 'Sim, Excluir Cadastro'}
        textoBotaoCancelar={excluindo?.pode_excluir === false ? undefined : 'Cancelar'}
        variante={excluindo?.pode_excluir === false ? 'primario' : 'perigo'}
        icone={excluindo?.pode_excluir === false ? 'shield' : 'trash'}
      />
        </>
      )}

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
