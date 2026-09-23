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
} from '../../components/ui';

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
  inquilino?: string;
};

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
  {
    tipo: 'VISITANTE',
    titulo: 'Visitante',
    descricao: 'Controle de visitantes do condomínio (sem login no sistema)',
    icone: 'user' as const,
    corAtiva:
      'border-cyan-500 bg-cyan-50/80 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-500 dark:text-cyan-200 shadow-xs',
    iconeCor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    tipo: 'PRESTADOR_SERVICO',
    titulo: 'Prestador de Serviço',
    descricao: 'Obras, reparos e empréstimo de chaves (sem login no sistema)',
    icone: 'wrench' as const,
    corAtiva:
      'border-orange-500 bg-orange-50/80 text-orange-900 dark:bg-orange-950/40 dark:border-orange-500 dark:text-orange-200 shadow-xs',
    iconeCor: 'text-orange-600 dark:text-orange-400',
  },
];

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
  const [abaAtiva, setAbaAtiva] = useState<'pessoas' | 'aprovacoes'>('pessoas');

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

  function alternarOrdenacao(coluna: ColunaOrdenavel) {
    if (colunaOrdenada === coluna) {
      setDirecaoOrdenacao(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenada(coluna);
      setDirecaoOrdenacao('asc');
    }
  }

  // Modais de Criação & Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [pessoaEditando, setPessoaEditando] = useState<Pessoa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Modais de Inspeção, Inativação, Reativação e Exclusão
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Pessoa | null>(null);
  const [inativando, setInativando] = useState<Pessoa | null>(null);
  const [reativando, setReativando] = useState<Pessoa | null>(null);
  const [excluindo, setExcluindo] = useState<Pessoa | null>(null);
  const [salvandoReativacao, setSalvandoReativacao] = useState(false);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);

  // Pop-up específico de conflito / erro de negócio
  const [popupErro, setPopupErro] = useState<string | null>(null);
  const [codigoGeradoSucesso, setCodigoGeradoSucesso] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const sessao = sessaoAtual();
  const perfisUsuario = (sessao?.perfis || []).map(p => p.tipo);
  const ehApenasPorteiro = perfisUsuario.includes('PORTEIRO') && !perfisUsuario.includes('SINDICO') && !perfisUsuario.includes('ADMINISTRADOR');
  const somenteLeitura = apenasConsulta || ehApenasPorteiro;

  // Formulário de Cadastro
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
  }>({
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    id_unidade: '',
    tipo_vinculo: 'PROPRIETARIO',
    perfis: ['MORADOR'],
    id_responsavel: '',
    grau_parentesco: 'FILHO',
    reside: true,
    tipo_servico: '',
  });

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
    tipo_vinculo: 'PROPRIETARIO',
    perfis: ['MORADOR'],
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

  function togglePerfilEdicao(tipo: string) {
    if (ehUnicoAdmin && tipo === 'SINDICO') return;
    if (ehUnicoAdmin && (tipo === 'VISITANTE' || tipo === 'PRESTADOR_SERVICO')) {
      setErroEdicao('O único administrador ativo do condomínio não pode ter o papel alterado para Visitante ou Prestador de Serviço.');
      return;
    }

    const atuais = formEdicao.perfis || [];
    setErroEdicao(null);

    // Se está desmarcando o tipo que já estava selecionado
    if (atuais.includes(tipo)) {
      if (tipo === 'VISITANTE' || tipo === 'PRESTADOR_SERVICO') {
        // Ao desmarcar o papel exclusivo, volta para Morador e reseta vínculo
        setFormEdicao({ ...formEdicao, perfis: ['MORADOR'], tipo_vinculo: 'PROPRIETARIO' });
        return;
      }
      if (atuais.length === 1) {
        setErroEdicao('A pessoa deve ter pelo menos um papel ativo no condomínio.');
        return;
      }
      setFormEdicao({ ...formEdicao, perfis: atuais.filter(t => t !== tipo) });
      return;
    }

    // Se está selecionando VISITANTE ou PRESTADOR_SERVICO, nenhum outro papel pode ser marcado
    if (tipo === 'VISITANTE' || tipo === 'PRESTADOR_SERVICO') {
      setFormEdicao({ ...formEdicao, perfis: [tipo], tipo_vinculo: tipo });
      return;
    }

    // Se está selecionando outro papel (ex: Morador, Porteiro, Síndico) e Visitante/Prestador estava selecionado,
    // substitui pelo novo papel e reseta vínculo para PROPRIETARIO
    if (atuais.includes('VISITANTE') || atuais.includes('PRESTADOR_SERVICO')) {
      setFormEdicao({
        ...formEdicao,
        perfis: [tipo],
        tipo_vinculo: 'PROPRIETARIO',
      });
      return;
    }

    setFormEdicao({ ...formEdicao, perfis: [...atuais, tipo] });
  }

  function togglePerfilCadastro(tipo: string) {
    const atuais = form.perfis || [];
    setErroCadastro(null);

    // Se está desmarcando o tipo que já estava selecionado
    if (atuais.includes(tipo)) {
      if (tipo === 'VISITANTE' || tipo === 'PRESTADOR_SERVICO') {
        // Ao desmarcar o papel exclusivo, volta para Morador e reseta vínculo
        setForm({ ...form, perfis: ['MORADOR'], tipo_vinculo: 'PROPRIETARIO' });
        return;
      }
      if (atuais.length === 1) {
        setErroCadastro('A pessoa deve ter pelo menos um papel ativo no condomínio.');
        return;
      }
      setForm({ ...form, perfis: atuais.filter(t => t !== tipo) });
      return;
    }

    // Se está selecionando VISITANTE ou PRESTADOR_SERVICO, nenhum outro papel pode ser marcado
    if (tipo === 'VISITANTE' || tipo === 'PRESTADOR_SERVICO') {
      setForm({ ...form, perfis: [tipo], tipo_vinculo: tipo });
      return;
    }

    // Se está selecionando outro papel (ex: Morador, Porteiro, Síndico) e Visitante/Prestador estava selecionado,
    // substitui pelo novo papel e reseta vínculo para PROPRIETARIO
    if (atuais.includes('VISITANTE') || atuais.includes('PRESTADOR_SERVICO')) {
      setForm({
        ...form,
        perfis: [tipo],
        tipo_vinculo: 'PROPRIETARIO',
      });
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

    const ehApenasExterno = form.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO');
    const ehPrestador = form.perfis.includes('PRESTADOR_SERVICO');
    const ehVisitante = form.perfis.includes('VISITANTE');
    const tipoVinculoEfetivo = ehPrestador
      ? 'PRESTADOR_SERVICO'
      : ehVisitante
      ? 'VISITANTE'
      : form.tipo_vinculo;

    if (ehPrestador && !form.tipo_servico.trim()) {
      setErroCadastro('Por favor, informe a descrição do tipo de prestador de serviço (ex: Eletricista, Encanador, Pintor, etc.).');
      setMsg({ t: 'Informe a descrição do tipo de prestador de serviço.', tipo: 'erro' });
      return;
    }

    // Validação obrigatória de Morador: exige unidade vinculada
    if (form.perfis.includes('MORADOR') && (!form.id_unidade || Number(form.id_unidade) <= 0)) {
      setErroCadastro('Para o papel de Morador, é obrigatório selecionar uma unidade vinculada (bloco e apartamento).');
      setMsg({ t: 'Para o papel de Morador, é obrigatório selecionar uma unidade vinculada.', tipo: 'erro' });
      return;
    }

    if (!ehApenasExterno && !form.email.trim()) {
      setErroCadastro('O e-mail é obrigatório para cadastros com acesso ao sistema.');
      setMsg({ t: 'Informe o e-mail para acesso ao sistema.', tipo: 'erro' });
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
        tipo_vinculo: tipoVinculoEfetivo,
        id_unidade: form.id_unidade ? Number(form.id_unidade) : undefined,
        id_responsavel: tipoVinculoEfetivo === 'DEPENDENTE' && form.id_responsavel ? Number(form.id_responsavel) : undefined,
        grau_parentesco: tipoVinculoEfetivo === 'DEPENDENTE' ? form.grau_parentesco : undefined,
        reside: ehApenasExterno ? false : form.reside,
        tipo_servico: ehPrestador ? form.tipo_servico.trim() : undefined,
      });

      setMsg({ t: `Pessoa "${form.nome}" cadastrada com sucesso!`, tipo: 'ok' });
      setCodigoGeradoSucesso(res.codigo_ativacao || null);
      setModalAberto(false);
      carregarPessoas();
      carregarUnidades();
    } catch (err: any) {
      const errTxt = err.message || 'Erro ao realizar cadastro.';
      if (
        errTxt.toLowerCase().includes('proprietário') ||
        errTxt.toLowerCase().includes('proprietario') ||
        errTxt.includes('uk_unidade_proprietario_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um proprietário ativo cadastrado.');
      } else if (
        errTxt.toLowerCase().includes('inquilino') ||
        errTxt.includes('uk_unidade_inquilino_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um inquilino ativo cadastrado.');
      }
      setErroCadastro(errTxt);
      setMsg({ t: errTxt, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalEdicao(p: Pessoa) {
    setPessoaEditando(p);
    const u = p.unidades && p.unidades[0];
    const tipos = (p.perfis || []).map(pf => pf.tipo);
    const perfisAtivos: string[] = [];
    if (tipos.includes('MORADOR')) perfisAtivos.push('MORADOR');
    if (tipos.includes('PORTEIRO')) perfisAtivos.push('PORTEIRO');
    if (tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR')) perfisAtivos.push('SINDICO');
    if (p.papel_controle === 'VISITANTE' || u?.vinculo === 'VISITANTE') perfisAtivos.push('VISITANTE');
    if (p.papel_controle === 'PRESTADOR_SERVICO' || u?.vinculo === 'PRESTADOR_SERVICO') perfisAtivos.push('PRESTADOR_SERVICO');

    if (perfisAtivos.length === 0) perfisAtivos.push('MORADOR');

    let vinculoInicial = u?.vinculo || 'PROPRIETARIO';
    if (perfisAtivos.includes('PRESTADOR_SERVICO')) {
      vinculoInicial = 'PRESTADOR_SERVICO';
    } else if (perfisAtivos.includes('VISITANTE')) {
      vinculoInicial = 'VISITANTE';
    } else if (vinculoInicial === 'PRESTADOR_SERVICO' || vinculoInicial === 'VISITANTE') {
      vinculoInicial = 'PROPRIETARIO';
    }

    setFormEdicao({
      nome: p.nome || '',
      email: p.email || '',
      cpf: mascararCPF(p.cpf || ''),
      data_nascimento: p.data_nascimento ? p.data_nascimento.substring(0, 10) : '',
      celular: mascararCelular(p.celular || ''),
      id_unidade: u ? String(u.id_unidade) : '',
      tipo_vinculo: vinculoInicial,
      perfis: perfisAtivos,
      id_responsavel: u?.id_responsavel ? String(u.id_responsavel) : '',
      grau_parentesco: u?.parentesco || 'FILHO',
      reside: u?.reside !== undefined ? u.reside : true,
      tipo_servico: p.tipo_servico || '',
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

    const ehPrestadorEdicao = formEdicao.perfis.includes('PRESTADOR_SERVICO');
    const ehVisitanteEdicao = formEdicao.perfis.includes('VISITANTE');
    const tipoVinculoEfetivoEdicao = ehPrestadorEdicao
      ? 'PRESTADOR_SERVICO'
      : ehVisitanteEdicao
      ? 'VISITANTE'
      : formEdicao.tipo_vinculo;

    if (ehPrestadorEdicao && !formEdicao.tipo_servico.trim()) {
      setErroEdicao('Por favor, informe a descrição do tipo de prestador de serviço (ex: Eletricista, Encanador, Pintor, etc.).');
      setMsg({ t: 'Informe a descrição do tipo de prestador de serviço.', tipo: 'erro' });
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

    setSalvandoEdicao(true);
    setErroEdicao(null);

    try {
      await api.put(`/cadastros/pessoas/${pessoaEditando.id_pessoa}`, {
        nome: formEdicao.nome,
        email: formEdicao.email,
        cpf: cpfLimpo,
        celular: formEdicao.celular,
        data_nascimento: formEdicao.data_nascimento,
        id_unidade: formEdicao.id_unidade ? Number(formEdicao.id_unidade) : null,
        tipo_vinculo: tipoVinculoEfetivoEdicao,
        id_responsavel:
          tipoVinculoEfetivoEdicao === 'DEPENDENTE' && formEdicao.id_responsavel
            ? Number(formEdicao.id_responsavel)
            : null,
        grau_parentesco: tipoVinculoEfetivoEdicao === 'DEPENDENTE' ? formEdicao.grau_parentesco : null,
        perfis: formEdicao.perfis,
        reside: (ehPrestadorEdicao || ehVisitanteEdicao) ? false : formEdicao.reside,
        tipo_servico: ehPrestadorEdicao ? formEdicao.tipo_servico.trim() : null,
        papel_controle: ehVisitanteEdicao
          ? 'VISITANTE'
          : ehPrestadorEdicao
          ? 'PRESTADOR_SERVICO'
          : (formEdicao.perfis[0] || 'MORADOR'),
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
        errTxt.includes('uk_unidade_proprietario_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um proprietário ativo cadastrado.');
      } else if (
        errTxt.toLowerCase().includes('inquilino') ||
        errTxt.includes('uk_unidade_inquilino_ativo')
      ) {
        setPopupErro('Erro de cadastro pois o apartamento já tem um inquilino ativo cadastrado.');
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

  const c = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm({ ...form, [k]: e.target.value });

  const cEdicao = (k: keyof typeof formEdicao) => (e: React.ChangeEvent<any>) =>
    setFormEdicao({ ...formEdicao, [k]: e.target.value });

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
              !somenteLeitura ? (
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
                      tipo_vinculo: 'PROPRIETARIO',
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
                  Cadastrar Pessoa
                </Botao>
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
                    onClick={() => setModalAberto(true)}
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
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                    onClick={() => setModalAberto(true)}
                  >
                    Cadastrar Pessoa
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
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
                  {listaExibida.map(p => {
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
                                {p.email} • CPF: {p.cpf}
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
                                  className="rounded-md bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 font-bold text-[11px]"
                                >
                                  Bl. {u.bloco} - Apto {u.apartamento}
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
                                className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400"
                                title="Código de 1º Acesso Disponível"
                              >
                                🔑 {p.codigo_ativacao}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirPerfil(p)}
                              className="text-xs font-semibold text-navy dark:text-sky-400 hover:underline cursor-pointer"
                            >
                              Ver
                            </button>

                            {!somenteLeitura && (
                              <>
                                {/* Botão de Edição sempre disponível para corrigir cadastros errôneos */}
                                <button
                                  onClick={() => abrirModalEdicao(p)}
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  title="Editar dados cadastrais, perfil e unidade"
                                >
                                  Editar
                                </button>

                                {p.ativo ? (
                                  <>
                                    <button
                                      onClick={() => abrirModalBloqueio(p)}
                                      className={`text-xs font-semibold hover:underline cursor-pointer ${
                                        p.total_bloqueios_ativos && p.total_bloqueios_ativos > 0
                                          ? 'text-red-600 dark:text-rose-400 font-bold'
                                          : 'text-amber-600 dark:text-amber-400'
                                      }`}
                                      title="Aplicar penalidade ou afastamento de áreas comuns"
                                    >
                                      Penalidades{p.total_bloqueios_ativos && p.total_bloqueios_ativos > 0 ? ` (${p.total_bloqueios_ativos})` : ''}
                                    </button>
                                    <button
                                      onClick={() => setInativando(p)}
                                      className="text-xs font-semibold text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Inativar usuário"
                                    >
                                      Inativar
                                    </button>
                                    <button
                                      onClick={() => setExcluindo(p)}
                                      className="text-xs font-semibold text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Excluir cadastro permanentemente"
                                    >
                                      Excluir
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setReativando(p)}
                                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                      title="Reativar usuário e restabelecer acessos"
                                    >
                                      Reativar
                                    </button>
                                    <button
                                      onClick={() => setExcluindo(p)}
                                      className="text-xs font-semibold text-red-500 dark:text-rose-400 hover:underline cursor-pointer"
                                      title="Excluir cadastro permanentemente caso criado por erro"
                                    >
                                      Excluir
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              {aprovacoes.map(ap => (
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
            </div>
          )}
        </Cartao>
      )}

      {/* MODAL: INSPEÇÃO INTERATIVA DO PERFIL & ÁRVORE FAMILIAR (TITULAR ↔ DEPENDENTES) */}
      <Modal
        aberto={modalPerfilAberto}
        fechar={() => setModalPerfilAberto(false)}
        titulo="Perfil & Relações Familiares"
      >
        {perfilSelecionado && (
          <div className="space-y-4">
            {/* Header com dados pessoais e badge do papel */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white font-bold text-lg">
                {perfilSelecionado.nome.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">
                    {perfilSelecionado.nome}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      obterPapelUsuario(perfilSelecionado).badgeCls
                    }`}
                  >
                    {obterPapelUsuario(perfilSelecionado).papel}
                  </span>
                  <Badge tipo={perfilSelecionado.ativo ? 'sucesso' : 'perigo'}>
                    {perfilSelecionado.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {perfilSelecionado.email} • {perfilSelecionado.celular || 'Sem celular cadastrado'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500 font-mono">
                    CPF: {perfilSelecionado.cpf}
                  </span>
                  {perfilSelecionado.data_nascimento && (
                    <span className="text-[11px] text-slate-500">
                      • Idade: {calcularIdade(perfilSelecionado.data_nascimento)} anos
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Especialidade / Descrição do Prestador de Serviço */}
            {perfilSelecionado.tipo_servico && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Tipo / Especialidade do Prestador de Serviço
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {perfilSelecionado.tipo_servico}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  <Icone nome="wrench" className="h-4 w-4" />
                </div>
              </div>
            )}

            {/* Dados da Unidade */}
            {perfilSelecionado.unidades && perfilSelecionado.unidades.length > 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Vínculo com Imóvel
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Bloco {perfilSelecionado.unidades[0].bloco} - Apartamento{' '}
                    {perfilSelecionado.unidades[0].apartamento}
                  </span>
                  <span className="rounded bg-navy-50 text-navy dark:bg-slate-700 dark:text-sky-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {perfilSelecionado.unidades[0].vinculo}
                  </span>
                </div>
              </div>
            )}

            {/* SE FOR DEPENDENTE: EXIBE TITULAR RESPONSÁVEL SUPERIOR */}
            {perfilSelecionado.responsavel && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/30 p-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Icone nome="users" className="h-3.5 w-3.5" />
                  Usuário Superior / Titular Responsável
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {perfilSelecionado.responsavel.nome}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {perfilSelecionado.responsavel.email}
                    </p>
                  </div>
                  <Botao
                    variante="claro"
                    tamanho="sm"
                    onClick={() => navegarParaResponsavel(perfilSelecionado.responsavel!.id_pessoa)}
                  >
                    Ver Perfil do Titular
                  </Botao>
                </div>
              </div>
            )}

            {/* SE FOR TITULAR: EXIBE LISTA DE DEPENDENTES VINCULADOS */}
            {perfilSelecionado.unidades?.[0]?.vinculo !== 'DEPENDENTE' && (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Dependentes da Família ({perfilSelecionado.dependentes?.length || 0})
                  </p>
                  {!somenteLeitura && perfilSelecionado.unidades?.[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        iniciarCadastroDependente(
                          perfilSelecionado,
                          perfilSelecionado.unidades[0].id_unidade
                        )
                      }
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                    >
                      + Adicionar Dependente
                    </button>
                  )}
                </div>

                {perfilSelecionado.dependentes && perfilSelecionado.dependentes.length > 0 ? (
                  <div className="space-y-2">
                    {perfilSelecionado.dependentes.map(dep => (
                      <div
                        key={dep.id_pessoa}
                        onClick={() => navegarParaResponsavel(dep.id_pessoa)}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {dep.nome}
                            </span>
                            <span className="rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-bold">
                              {formatarParentesco(dep.grau_parentesco)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {dep.email} • {dep.data_nascimento ? `${calcularIdade(dep.data_nascimento)} anos` : ''}
                          </p>
                        </div>
                        <span className="text-slate-400 text-xs font-semibold">Ver ➔</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Nenhum dependente cadastrado para este titular.
                  </p>
                )}
              </div>
            )}

            {/* Código de Ativação caso exista */}
            {perfilSelecionado.codigo_ativacao && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                    Código de Primeiro Acesso
                  </p>
                  <p className="font-mono text-sm font-black text-sky-900 dark:text-sky-200">
                    {perfilSelecionado.codigo_ativacao}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(perfilSelecionado.codigo_ativacao || '');
                    setMsg({ t: 'Código copiado para a área de transferência!', tipo: 'ok' });
                  }}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Copiar Código
                </button>
              </div>
            )}

            {/* Penalidades ativas caso existam */}
            {perfilSelecionado.total_bloqueios_ativos && perfilSelecionado.total_bloqueios_ativos > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50/70 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-xs text-red-700 dark:text-rose-300 flex items-center gap-2">
                <Icone nome="alert" className="h-4 w-4 text-red-600 dark:text-rose-400 shrink-0" />
                <span>Usuário possui <b>{perfilSelecionado.total_bloqueios_ativos}</b> penalidade(s) / restrição(ões) ativa(s) para áreas comuns.</span>
              </div>
            ) : null}

            {/* Ações do Perfil */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {somenteLeitura ? (
                <Botao
                  variante="claro"
                  tamanho="sm"
                  onClick={() => setModalPerfilAberto(false)}
                >
                  Fechar
                </Botao>
              ) : (
                <>
                  <Botao
                    variante="claro"
                    tamanho="sm"
                    onClick={() => {
                      setModalPerfilAberto(false);
                      abrirModalEdicao(perfilSelecionado);
                    }}
                  >
                    Editar Cadastro
                  </Botao>

                  {perfilSelecionado.ativo ? (
                    <>
                      <Botao
                        variante="claro"
                        tamanho="sm"
                        onClick={() => {
                          setModalPerfilAberto(false);
                          abrirModalBloqueio(perfilSelecionado);
                        }}
                      >
                        Penalidades
                      </Botao>
                      <Botao
                        variante="secundario"
                        tamanho="sm"
                        onClick={() => setInativando(perfilSelecionado)}
                      >
                        Inativar Usuário
                      </Botao>
                      <Botao
                        variante="perigo"
                        tamanho="sm"
                        onClick={() => setExcluindo(perfilSelecionado)}
                      >
                        Excluir Definitivamente
                      </Botao>
                    </>
                  ) : (
                    <>
                      <Botao
                        variante="sucesso"
                        tamanho="sm"
                        onClick={() => setReativando(perfilSelecionado)}
                      >
                        Reativar Perfil
                      </Botao>
                      <Botao
                        variante="perigo"
                        tamanho="sm"
                        onClick={() => setExcluindo(perfilSelecionado)}
                      >
                        Excluir Definitivamente
                      </Botao>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modais de ação restritos à administração */}
      {!somenteLeitura && (
        <>
          {/* MODAL: CADASTRO DE PESSOA & VÍNCULO */}
          <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        titulo="Cadastrar Nova Pessoa & Vínculo"
        largura="max-w-2xl"
        rodape={
          <>
            <Botao type="button" variante="claro" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              form="form-cadastro-pessoa"
              variante="primario"
              carregando={salvando}
              icone={<Icone nome="check" className="h-4 w-4" />}
            >
              Cadastrar Pessoa
            </Botao>
          </>
        }
      >
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
            <Campo
              rotulo={form.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO') ? 'E-mail (Opcional)' : 'E-mail de Login'}
              obrigatorio={!form.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
            >
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={c('email')}
                required={!form.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
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
              Vínculo, Unidade & Perfil
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Unidade" obrigatorio={form.perfis.includes('MORADOR')}>
                <select
                  className={inputCls}
                  value={form.id_unidade}
                  onChange={c('id_unidade')}
                  required={form.perfis.includes('MORADOR')}
                >
                  <option value="">Nenhuma (visitante/prestador/porteiro)</option>
                  {unidades.map(u => (
                    <option key={u.id_unidade} value={u.id_unidade}>
                      Bl. {u.bloco} - Apto {u.numero_apartamento}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                rotulo={
                  form.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Tipo de Vínculo (Prestador de Serviço)'
                    : form.perfis.includes('VISITANTE')
                    ? 'Tipo de Vínculo (Visitante)'
                    : 'Tipo de Vínculo'
                }
                ajuda={
                  form.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Vínculo bloqueado e padronizado para Prestador de Serviço.'
                    : form.perfis.includes('VISITANTE')
                    ? 'Vínculo bloqueado e padronizado para Visitante.'
                    : undefined
                }
              >
                <select
                  className={`${inputCls} ${
                    form.perfis.includes('PRESTADOR_SERVICO') || form.perfis.includes('VISITANTE')
                      ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                      : ''
                  }`}
                  value={
                    form.perfis.includes('PRESTADOR_SERVICO')
                      ? 'PRESTADOR_SERVICO'
                      : form.perfis.includes('VISITANTE')
                      ? 'VISITANTE'
                      : form.tipo_vinculo
                  }
                  onChange={c('tipo_vinculo')}
                  disabled={form.perfis.includes('PRESTADOR_SERVICO') || form.perfis.includes('VISITANTE')}
                >
                  {form.perfis.includes('PRESTADOR_SERVICO') ? (
                    <option value="PRESTADOR_SERVICO">Prestador de Serviço (Bloqueado)</option>
                  ) : form.perfis.includes('VISITANTE') ? (
                    <option value="VISITANTE">Visitante (Bloqueado)</option>
                  ) : (
                    <>
                      <option value="PROPRIETARIO">Proprietário (Titular)</option>
                      <option value="INQUILINO">Inquilino (Titular Locação)</option>
                      <option value="DEPENDENTE">Dependente Familiar</option>
                    </>
                  )}
                </select>
              </Campo>
            </div>

            {/* TIPO DE PRESTADOR DE SERVIÇO (DESCRIÇÃO / ESPECIALIDADE) */}
            {(form.perfis.includes('PRESTADOR_SERVICO') || form.tipo_vinculo === 'PRESTADOR_SERVICO') && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <Campo
                  rotulo="Descrição do Tipo de Prestador de Serviço"
                  obrigatorio
                  ajuda="Informe a profissão, especialidade ou tipo de trabalho (ex: Eletricista, Encanador, Pintor, Técnico de Internet, Marceneiro, etc.)"
                >
                  <input
                    className={inputCls}
                    value={form.tipo_servico}
                    onChange={c('tipo_servico')}
                    required
                    maxLength={100}
                    placeholder="Ex: Eletricista, Encanador, Pintor, Técnico de Internet, Marceneiro..."
                  />
                </Campo>
              </div>
            )}

            {/* SE FOR MORADOR: RESIDE NA UNIDADE (SIM / NÃO) */}
            {form.perfis.includes('MORADOR') && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reside no Apartamento? <span className="text-red-500">*</span>
                </label>
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {form.reside
                    ? 'O morador reside no imóvel e usufrui normalmente das áreas e encomendas.'
                    : 'Proprietário não residente com moradia externa.'}
                </p>
              </div>
            )}

            {/* SELEÇÃO MÚLTIPLA DE PAPÉIS NO CADASTRO */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Papéis no Condomínio <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {form.perfis.includes('VISITANTE')
                    ? 'Visitante é exclusivo (nenhuma outra opção pode ser marcada simultaneamente)'
                    : form.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Prestador de Serviço é exclusivo (nenhuma outra opção pode ser marcada simultaneamente)'
                    : 'Selecione um ou mais papéis simultâneos'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                {OPCOES_PAPEIS.map(op => {
                  const selecionado = form.perfis.includes(op.tipo);
                  const exclusivoAtivo = form.perfis.includes('VISITANTE')
                    ? 'VISITANTE'
                    : form.perfis.includes('PRESTADOR_SERVICO')
                    ? 'PRESTADOR_SERVICO'
                    : null;
                  const bloqueadoPorExclusivo = exclusivoAtivo !== null && exclusivoAtivo !== op.tipo;

                  return (
                    <div
                      key={op.tipo}
                      onClick={() => togglePerfilCadastro(op.tipo)}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all select-none cursor-pointer hover:shadow-xs ${
                        selecionado
                          ? op.corAtiva
                          : bloqueadoPorExclusivo
                          ? 'opacity-40 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 hover:border-slate-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
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
                                : bloqueadoPorExclusivo
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

                        {/* Título & Badge de Exclusividade */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {op.titulo}
                          </span>
                          {(op.tipo === 'VISITANTE' || op.tipo === 'PRESTADOR_SERVICO') && (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                              Exclusivo
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {op.descricao}
                        </p>

                        {bloqueadoPorExclusivo && (
                          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            <Icone nome="alert" className="h-3 w-3 shrink-0" />
                            Bloqueado (clique para alternar)
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

      {/* MODAL: EDIÇÃO DE DADOS, PERFIL & VÍNCULO (CORREÇÃO DE ERROS) */}
      <Modal
        aberto={modalEdicaoAberto}
        fechar={() => setModalEdicaoAberto(false)}
        titulo={`Editar Cadastro — ${pessoaEditando?.nome || ''}`}
        largura="max-w-2xl"
        rodape={
          <div className="flex items-center justify-between w-full">
            {pessoaEditando ? (
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
                Excluir Usuário
              </Botao>
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
          {erroEdicao && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5">
              <Icone nome="alert" className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold">Atenção ao atualizar:</span>
                <p className="mt-0.5">{erroEdicao}</p>
              </div>
            </div>
          )}

          <Campo rotulo="Nome Completo" obrigatorio>
            <input
              className={inputCls}
              value={formEdicao.nome}
              onChange={cEdicao('nome')}
              required
              maxLength={100}
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="CPF" obrigatorio>
              <input
                className={inputCls}
                value={formEdicao.cpf}
                onChange={e => setFormEdicao({ ...formEdicao, cpf: mascararCPF(e.target.value) })}
                required
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </Campo>

            <Campo rotulo="Data de Nascimento" obrigatorio>
              <input
                type="date"
                className={inputCls}
                value={formEdicao.data_nascimento}
                onChange={cEdicao('data_nascimento')}
                required
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo
              rotulo={formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO') ? 'E-mail (Opcional)' : 'E-mail de Login'}
              obrigatorio={!formEdicao.perfis.every(pf => pf === 'VISITANTE' || pf === 'PRESTADOR_SERVICO')}
            >
              <input
                type="email"
                className={inputCls}
                value={formEdicao.email}
                onChange={cEdicao('email')}
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
              <Campo rotulo="Unidade" obrigatorio={formEdicao.perfis.includes('MORADOR')}>
                <select
                  className={inputCls}
                  value={formEdicao.id_unidade}
                  onChange={cEdicao('id_unidade')}
                  required={formEdicao.perfis.includes('MORADOR')}
                >
                  <option value="">Nenhuma (visitante/prestador/porteiro)</option>
                  {unidades.map(u => (
                    <option key={u.id_unidade} value={u.id_unidade}>
                      Bl. {u.bloco} - Apto {u.numero_apartamento}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                rotulo={
                  formEdicao.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Tipo de Vínculo (Prestador de Serviço)'
                    : formEdicao.perfis.includes('VISITANTE')
                    ? 'Tipo de Vínculo (Visitante)'
                    : 'Tipo de Vínculo'
                }
                ajuda={
                  formEdicao.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Vínculo bloqueado e padronizado para Prestador de Serviço.'
                    : formEdicao.perfis.includes('VISITANTE')
                    ? 'Vínculo bloqueado e padronizado para Visitante.'
                    : undefined
                }
              >
                <select
                  className={`${inputCls} ${
                    formEdicao.perfis.includes('PRESTADOR_SERVICO') || formEdicao.perfis.includes('VISITANTE')
                      ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-90'
                      : ''
                  }`}
                  value={
                    formEdicao.perfis.includes('PRESTADOR_SERVICO')
                      ? 'PRESTADOR_SERVICO'
                      : formEdicao.perfis.includes('VISITANTE')
                      ? 'VISITANTE'
                      : formEdicao.tipo_vinculo
                  }
                  onChange={cEdicao('tipo_vinculo')}
                  disabled={formEdicao.perfis.includes('PRESTADOR_SERVICO') || formEdicao.perfis.includes('VISITANTE')}
                >
                  {formEdicao.perfis.includes('PRESTADOR_SERVICO') ? (
                    <option value="PRESTADOR_SERVICO">Prestador de Serviço (Bloqueado)</option>
                  ) : formEdicao.perfis.includes('VISITANTE') ? (
                    <option value="VISITANTE">Visitante (Bloqueado)</option>
                  ) : (
                    <>
                      <option value="PROPRIETARIO">Proprietário (Titular)</option>
                      <option value="INQUILINO">Inquilino (Titular Locação)</option>
                      <option value="DEPENDENTE">Dependente Familiar</option>
                    </>
                  )}
                </select>
              </Campo>
            </div>

            {/* TIPO DE PRESTADOR DE SERVIÇO (DESCRIÇÃO / ESPECIALIDADE) */}
            {(formEdicao.perfis.includes('PRESTADOR_SERVICO') || formEdicao.tipo_vinculo === 'PRESTADOR_SERVICO') && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <Campo
                  rotulo="Descrição do Tipo de Prestador de Serviço"
                  obrigatorio
                  ajuda="Informe a profissão, especialidade ou tipo de trabalho (ex: Eletricista, Encanador, Pintor, Técnico de Internet, Marceneiro, etc.)"
                >
                  <input
                    className={inputCls}
                    value={formEdicao.tipo_servico}
                    onChange={cEdicao('tipo_servico')}
                    required
                    maxLength={100}
                    placeholder="Ex: Eletricista, Encanador, Pintor, Técnico de Internet, Marceneiro..."
                  />
                </Campo>
              </div>
            )}

            {/* SE FOR MORADOR: RESIDE NA UNIDADE (SIM / NÃO) */}
            {formEdicao.perfis.includes('MORADOR') && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reside no Apartamento? <span className="text-red-500">*</span>
                </label>
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {formEdicao.reside
                    ? 'O morador reside no imóvel e usufrui normalmente das áreas e encomendas.'
                    : 'Proprietário não residente com moradia externa.'}
                </p>
              </div>
            )}

            {/* SELEÇÃO MÚLTIPLA DE PAPÉIS NA EDIÇÃO */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Papéis no Condomínio <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formEdicao.perfis.includes('VISITANTE')
                    ? 'Visitante é exclusivo (nenhuma outra opção pode ser marcada simultaneamente)'
                    : formEdicao.perfis.includes('PRESTADOR_SERVICO')
                    ? 'Prestador de Serviço é exclusivo (nenhuma outra opção pode ser marcada simultaneamente)'
                    : 'Marque os papéis que esta pessoa exercerá no condomínio'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
                {OPCOES_PAPEIS.map(op => {
                  const selecionado = formEdicao.perfis.includes(op.tipo);
                  const bloqueado = ehUnicoAdmin && op.tipo === 'SINDICO';
                  const exclusivoAtivo = formEdicao.perfis.includes('VISITANTE')
                    ? 'VISITANTE'
                    : formEdicao.perfis.includes('PRESTADOR_SERVICO')
                    ? 'PRESTADOR_SERVICO'
                    : null;
                  const bloqueadoPorExclusivo = exclusivoAtivo !== null && exclusivoAtivo !== op.tipo;

                  return (
                    <div
                      key={op.tipo}
                      onClick={() => {
                        if (!bloqueado) togglePerfilEdicao(op.tipo);
                      }}
                      className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all select-none ${
                        bloqueado
                          ? 'cursor-not-allowed border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 dark:border-indigo-600 opacity-95'
                          : bloqueadoPorExclusivo
                          ? 'opacity-40 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 hover:border-slate-300 cursor-pointer'
                          : 'cursor-pointer hover:shadow-xs'
                      } ${
                        selecionado
                          ? op.corAtiva
                          : !bloqueadoPorExclusivo
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
                                : bloqueadoPorExclusivo
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
                          {bloqueado && (
                            <span className="rounded bg-amber-200/90 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                              🔒 Obrigatório
                            </span>
                          )}
                          {(op.tipo === 'VISITANTE' || op.tipo === 'PRESTADOR_SERVICO') && (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                              Exclusivo
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {op.descricao}
                        </p>

                        {bloqueadoPorExclusivo && (
                          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            <Icone nome="alert" className="h-3 w-3 shrink-0" />
                            Bloqueado (clique para alternar)
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
        confirmar={confirmarExclusao}
        titulo="Excluir Cadastro Permanentemente"
        carregando={salvandoExclusao}
        mensagem={
          excluindo && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza de que deseja <b className="text-red-600">excluir definitivamente</b> o cadastro de{' '}
                <b className="text-slate-900 dark:text-slate-100">{excluindo.nome}</b> ({excluindo.email})?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-800/60">
                <b className="text-rose-700 dark:text-rose-300">Atenção:</b> Esta ação apagará o cadastro do banco de dados e deve ser utilizada para corrigir cadastros efetuados por erro. Se esta pessoa possuir histórico de reservas, encomendas ou chaves, a exclusão será bloqueada para preservar o registro legal do condomínio.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Excluir Definitivamente"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="trash"
      />
        </>
      )}

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
