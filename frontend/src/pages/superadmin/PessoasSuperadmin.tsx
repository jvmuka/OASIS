import { useEffect, useState, useMemo } from 'react';
import { api, sessaoAtual } from '../../api';
import {
  Botao,
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

interface DependenteItem {
  id_pessoa: number;
  nome: string;
  email: string | null;
  cpf: string;
  data_nascimento: string | null;
  grau_parentesco: string;
  ativo: boolean;
}

interface ResponsavelItem {
  id_pessoa: number;
  nome: string;
  email: string | null;
}

interface UnidadeItem {
  id_unidade: number;
  bloco: string;
  apartamento: string;
  andar?: number;
  tipo_vinculo: string;
  parentesco?: string;
  reside: boolean;
}

interface PerfilItem {
  id_perfil: number;
  tipo: string;
  data_inicio: string;
}

interface PessoaGlobal {
  id_pessoa: number;
  nome: string;
  email: string | null;
  cpf: string;
  celular: string | null;
  data_nascimento: string | null;
  ativo: boolean;
  status_conta: string;
  papel_controle?: string;
  tipo_servico?: string;
  perfis: PerfilItem[];
  unidades: UnidadeItem[];
  responsavel?: ResponsavelItem | null;
  dependentes?: DependenteItem[];
  total_bloqueios_ativos?: number;
  codigo_ativacao?: string;
}

const ITENS_POR_PAGINA = 20;

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

/** Determina explicitamente o papel da pessoa no condomínio */
function obterPapelPessoa(p: PessoaGlobal): {
  papel: string;
  badgeCls: string;
  icone: 'shield' | 'home' | 'key' | 'user' | 'wrench';
} {
  const tipos = (p.perfis || []).map(pf => pf.tipo);
  const temSuperadmin = tipos.includes('SUPERADMIN');
  const temAdministradora = tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR');
  const temMorador = tipos.includes('MORADOR');
  const temPorteiro = tipos.includes('PORTEIRO');

  if (temSuperadmin) {
    return {
      papel: 'Superadmin Soberano',
      badgeCls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-700',
      icone: 'shield',
    };
  }

  if (p.papel_controle === 'PRESTADOR_SERVICO' || (!temAdministradora && !temMorador && !temPorteiro && p.unidades?.some(u => u.tipo_vinculo === 'PRESTADOR_SERVICO'))) {
    return {
      papel: p.tipo_servico ? `Prestador: ${p.tipo_servico}` : 'Prestador de Serviço',
      badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60',
      icone: 'wrench',
    };
  }

  if (p.papel_controle === 'VISITANTE' || (!temAdministradora && !temMorador && !temPorteiro && p.unidades?.some(u => u.tipo_vinculo === 'VISITANTE'))) {
    return {
      papel: 'Visitante',
      badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/60',
      icone: 'user',
    };
  }

  if (temAdministradora && temMorador && temPorteiro) {
    return {
      papel: 'Administradora / Morador / Porteiro',
      badgeCls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700',
      icone: 'shield',
    };
  }
  if (temAdministradora && temMorador) {
    return {
      papel: 'Administradora / Morador',
      badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60',
      icone: 'shield',
    };
  }
  if (temAdministradora && temPorteiro) {
    return {
      papel: 'Administradora / Porteiro',
      badgeCls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
      icone: 'shield',
    };
  }
  if (temAdministradora) {
    return {
      papel: 'Administradora',
      badgeCls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
      icone: 'shield',
    };
  }
  if (temPorteiro && temMorador) {
    return {
      papel: 'Porteiro / Morador',
      badgeCls: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60',
      icone: 'key',
    };
  }
  if (temPorteiro) {
    return {
      papel: 'Porteiro',
      badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
      icone: 'key',
    };
  }
  return {
    papel: 'Morador',
    badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    icone: 'home',
  };
}

export default function PessoasSuperadmin() {
  const [pessoas, setPessoas] = useState<PessoaGlobal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  // Filtros Segmentados (semelhantes a Pessoas & Unidades)
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [buscaNome, setBuscaNome] = useState('');
  const [buscaCpf, setBuscaCpf] = useState('');
  const [buscaApto, setBuscaApto] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState<string>('TODAS');
  const [pagina, setPagina] = useState(1);

  // Menu de opções de linha
  const [menuAcoesAbertoId, setMenuAcoesAbertoId] = useState<number | null>(null);

  // Modais de Ação
  const [pessoaEditando, setPessoaEditando] = useState<PessoaGlobal | null>(null);
  const [formEdicao, setFormEdicao] = useState({
    nome: '',
    email: '',
    celular: '',
    data_nascimento: '',
  });

  const [confirmacaoAdministradora, setConfirmacaoAdministradora] = useState<{
    acao: 'dar' | 'remover';
    pessoa: PessoaGlobal;
  } | null>(null);

  const [confirmacaoStatus, setConfirmacaoStatus] = useState<{
    pessoa: PessoaGlobal;
    novoStatus: 'ATIVO' | 'BLOQUEADO';
  } | null>(null);

  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<PessoaGlobal | null>(null);
  const [processando, setProcessando] = useState(false);

  const sessao = sessaoAtual();
  const idUsuarioLogado = sessao?.pessoa?.id_pessoa;

  // Fecha o menu de ações ao clicar fora
  useEffect(() => {
    if (menuAcoesAbertoId === null) return;
    const fecharMenu = () => setMenuAcoesAbertoId(null);
    window.addEventListener('click', fecharMenu);
    return () => window.removeEventListener('click', fecharMenu);
  }, [menuAcoesAbertoId]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await api.get<PessoaGlobal[]>('/superadmin/pessoas');
      setPessoas(res);
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao carregar lista de usuários.', tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  // Filtragem local avançada e instantânea
  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter(p => {
      // 1. Filtro por Status
      if (filtroStatus === 'ATIVOS' && (!p.ativo || p.status_conta === 'BLOQUEADO')) return false;
      if (filtroStatus === 'INATIVOS' && (p.ativo && p.status_conta !== 'BLOQUEADO')) return false;

      // 2. Filtro por Nome ou Email
      if (buscaNome.trim()) {
        const termo = buscaNome.trim().toLowerCase();
        const nomeMatch = p.nome.toLowerCase().includes(termo);
        const emailMatch = p.email ? p.email.toLowerCase().includes(termo) : false;
        if (!nomeMatch && !emailMatch) return false;
      }

      // 3. Filtro por CPF
      if (buscaCpf.trim()) {
        const cpfLimpoBusca = buscaCpf.replace(/\D/g, '');
        const cpfLimpoPessoa = (p.cpf || '').replace(/\D/g, '');
        if (!cpfLimpoPessoa.includes(cpfLimpoBusca)) return false;
      }

      // 4. Filtro por Apartamento ou Bloco
      if (buscaApto.trim()) {
        const termo = buscaApto.trim().toLowerCase();
        const temApto = (p.unidades || []).some(u => {
          return (
            u.apartamento.toLowerCase().includes(termo) ||
            u.bloco.toLowerCase().includes(termo) ||
            `${u.bloco} ${u.apartamento}`.toLowerCase().includes(termo)
          );
        });
        if (!temApto) return false;
      }

      // 5. Filtro por Função / Papel
      if (filtroFuncao !== 'TODAS') {
        const tiposPerfis = (p.perfis || []).map(pf => pf.tipo);
        const vinculos = (p.unidades || []).map(u => u.tipo_vinculo);

        if (filtroFuncao === 'ADMINISTRADORA') {
          if (!tiposPerfis.includes('SINDICO') && !tiposPerfis.includes('ADMINISTRADOR')) return false;
        } else if (filtroFuncao === 'MORADOR') {
          if (!tiposPerfis.includes('MORADOR')) return false;
        } else if (filtroFuncao === 'PORTEIRO') {
          if (!tiposPerfis.includes('PORTEIRO')) return false;
        } else if (filtroFuncao === 'PROPRIETARIO') {
          if (!vinculos.includes('PROPRIETARIO')) return false;
        } else if (filtroFuncao === 'INQUILINO') {
          if (!vinculos.includes('INQUILINO')) return false;
        } else if (filtroFuncao === 'DEPENDENTE') {
          if (!vinculos.includes('DEPENDENTE')) return false;
        } else if (filtroFuncao === 'VISITANTE') {
          if (p.papel_controle !== 'VISITANTE' && !vinculos.includes('VISITANTE')) return false;
        } else if (filtroFuncao === 'PRESTADOR_SERVICO') {
          if (p.papel_controle !== 'PRESTADOR_SERVICO' && !vinculos.includes('PRESTADOR_SERVICO')) return false;
        }
      }

      return true;
    });
  }, [pessoas, filtroStatus, buscaNome, buscaCpf, buscaApto, filtroFuncao]);

  // Contagens para os pills
  const totalAtivos = useMemo(() => pessoas.filter(p => p.ativo && p.status_conta !== 'BLOQUEADO').length, [pessoas]);
  const totalInativos = useMemo(() => pessoas.filter(p => !p.ativo || p.status_conta === 'BLOQUEADO').length, [pessoas]);
  const totalAdministradoras = useMemo(
    () => pessoas.filter(p => (p.perfis || []).some(pf => pf.tipo === 'SINDICO' || pf.tipo === 'ADMINISTRADOR')).length,
    [pessoas]
  );

  const temFiltroAtivo = filtroStatus !== 'TODOS' || buscaNome || buscaCpf || buscaApto || filtroFuncao !== 'TODAS';

  function limparFiltros() {
    setFiltroStatus('TODOS');
    setBuscaNome('');
    setBuscaCpf('');
    setBuscaApto('');
    setFiltroFuncao('TODAS');
    setPagina(1);
  }

  // Paginação
  const totalItens = pessoasFiltradas.length;
  const pessoasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return pessoasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [pessoasFiltradas, pagina]);

  // Conceder ou Revogar Administração
  async function handleConfirmarAdministradora() {
    if (!confirmacaoAdministradora) return;
    setProcessando(true);
    try {
      if (confirmacaoAdministradora.acao === 'dar') {
        const res = await api.post<{ mensagem: string }>(
          `/superadmin/pessoas/${confirmacaoAdministradora.pessoa.id_pessoa}/dar-administracao`,
          {}
        );
        setMsg({ t: res.mensagem || 'Permissão de Administradora concedida com sucesso.', tipo: 'ok' });
      } else {
        const res = await api.post<{ mensagem: string }>(
          `/superadmin/pessoas/${confirmacaoAdministradora.pessoa.id_pessoa}/remover-administracao`,
          {}
        );
        setMsg({ t: res.mensagem || 'Permissão de Administradora revogada com sucesso.', tipo: 'ok' });
      }
      setConfirmacaoAdministradora(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao alterar permissão de administradora.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Alterar Status (Bloquear / Desbloquear)
  async function handleConfirmarStatus() {
    if (!confirmacaoStatus) return;
    setProcessando(true);
    try {
      const res = await api.patch<{ mensagem: string }>(
        `/superadmin/pessoas/${confirmacaoStatus.pessoa.id_pessoa}/status`,
        { status_conta: confirmacaoStatus.novoStatus }
      );
      setMsg({ t: res.mensagem || 'Status atualizado com sucesso.', tipo: 'ok' });
      setConfirmacaoStatus(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao alterar status da conta.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Exclusão Soberana Sem Restrições
  async function handleConfirmarExclusao() {
    if (!confirmacaoExclusao) return;
    setProcessando(true);
    try {
      const res = await api.delete<{ mensagem: string }>(
        `/superadmin/pessoas/${confirmacaoExclusao.id_pessoa}`
      );
      setMsg({ t: res.mensagem || `Usuário "${confirmacaoExclusao.nome}" excluído soberanamente.`, tipo: 'ok' });
      setConfirmacaoExclusao(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao excluir usuário sem restrições.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Salvar Edição Irrestrita de Dados
  async function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaEditando) return;
    setProcessando(true);
    try {
      const res = await api.put<{ mensagem: string }>(
        `/superadmin/pessoas/${pessoaEditando.id_pessoa}`,
        formEdicao
      );
      setMsg({ t: res.mensagem || 'Dados atualizados com sucesso.', tipo: 'ok' });
      setPessoaEditando(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao editar dados.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Titulo>Pessoas & Administradoras</Titulo>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-xs font-bold ring-1 ring-purple-600/20">
              <Icone nome="shield" className="w-3.5 h-3.5" />
              Superadmin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Painel soberano de administração de usuários, atribuição de administradoras e exclusão irrestrita sem bloqueios de histórico.
          </p>
        </div>
      </div>

      {msg.t && <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />}

      {/* Cartão Principal com Filtros Integrados */}
      <Cartao>
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Icone nome="users" className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Usuários do Sistema ({pessoas.length})
                </h3>

                {/* Pills de Filtragem Rápida por Status */}
                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setFiltroStatus('TODOS'); setPagina(1); }}
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
                    onClick={() => { setFiltroStatus('ATIVOS'); setPagina(1); }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      filtroStatus === 'ATIVOS'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Ativos ({totalAtivos})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroStatus('INATIVOS'); setPagina(1); }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      filtroStatus === 'INATIVOS'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Inativos / Bloqueados ({totalInativos})
                  </button>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 text-[11px] font-bold">
                  <Icone nome="shield" className="w-3 h-3" />
                  {totalAdministradoras} Administradora{totalAdministradoras === 1 ? '' : 's'}
                </span>

                {temFiltroAtivo && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Filtrado: {pessoasFiltradas.length} de {pessoas.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Painel de Filtros Segmentados */}
          <div className="mt-1 rounded-xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* 1. Nome ou E-mail */}
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400">
                  <Icone nome="search" className="h-3.5 w-3.5" />
                </span>
                <input
                  className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                  placeholder="Filtrar por nome ou e-mail..."
                  value={buscaNome}
                  onChange={e => { setBuscaNome(e.target.value); setPagina(1); }}
                />
                {buscaNome && (
                  <button
                    type="button"
                    onClick={() => { setBuscaNome(''); setPagina(1); }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Icone nome="x" className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* 2. CPF */}
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400">
                  <Icone nome="shield" className="h-3.5 w-3.5" />
                </span>
                <input
                  className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                  placeholder="Filtrar por CPF..."
                  value={buscaCpf}
                  onChange={e => { setBuscaCpf(e.target.value); setPagina(1); }}
                />
                {buscaCpf && (
                  <button
                    type="button"
                    onClick={() => { setBuscaCpf(''); setPagina(1); }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Icone nome="x" className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* 3. Apartamento / Bloco */}
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400">
                  <Icone nome="building" className="h-3.5 w-3.5" />
                </span>
                <input
                  className={`${inputCls} pl-8 pr-7 text-xs py-1.5`}
                  placeholder="Apto ou Bloco (ex: 61, A)..."
                  value={buscaApto}
                  onChange={e => { setBuscaApto(e.target.value); setPagina(1); }}
                />
                {buscaApto && (
                  <button
                    type="button"
                    onClick={() => { setBuscaApto(''); setPagina(1); }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                  onChange={e => { setFiltroFuncao(e.target.value); setPagina(1); }}
                >
                  <option value="TODAS">Todos os papéis e funções</option>
                  <option value="ADMINISTRADORA">Administradoras</option>
                  <option value="MORADOR">Moradores em geral</option>
                  <option value="PROPRIETARIO">Proprietários (Titulares)</option>
                  <option value="INQUILINO">Inquilinos (Titulares)</option>
                  <option value="DEPENDENTE">Dependentes da Família</option>
                  <option value="PORTEIRO">Porteiros / Funcionários</option>
                  <option value="VISITANTE">Visitantes</option>
                  <option value="PRESTADOR_SERVICO">Prestadores de Serviço</option>
                </select>
              </div>

              {/* 5. Status */}
              <div className="relative">
                <select
                  className={`${inputCls} text-xs py-1.5 font-medium`}
                  value={filtroStatus}
                  onChange={e => { setFiltroStatus(e.target.value as any); setPagina(1); }}
                >
                  <option value="TODOS">Status: Todos</option>
                  <option value="ATIVOS">Status: Apenas Ativos</option>
                  <option value="INATIVOS">Status: Apenas Inativos</option>
                </select>
              </div>
            </div>

            {temFiltroAtivo && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Mostrando <b>{pessoasFiltradas.length}</b> de <b>{pessoas.length}</b> usuários cadastrados
                </span>
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <Icone nome="x" className="h-3 w-3" />
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Pessoas */}
        {carregando ? (
          <div className="py-16 text-center text-slate-400">
            <Icone nome="clock" className="w-8 h-8 mx-auto mb-2 animate-spin text-purple-500" />
            <p className="text-sm">Carregando usuários do condomínio...</p>
          </div>
        ) : pessoasFiltradas.length === 0 ? (
          <EmptyState
            icone="users"
            titulo="Nenhum usuário encontrado"
            descricao={
              temFiltroAtivo
                ? 'Tente remover ou ajustar os filtros de nome, CPF, apartamento ou papel para expandir a busca.'
                : 'Nenhum usuário cadastrado no sistema.'
            }
            acao={
              temFiltroAtivo ? (
                <Botao variante="claro" tamanho="sm" onClick={limparFiltros}>
                  Limpar Filtros
                </Botao>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto min-h-[350px] pb-16">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  <th className="py-2.5 px-3">Nome / Contato</th>
                  <th className="py-2.5 px-3">Apartamento / Bloco</th>
                  <th className="py-2.5 px-3">Vínculo & Papel</th>
                  <th className="py-2.5 px-3">Dependentes</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Governança Soberana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pessoasPaginadas.map(p => {
                  const uAtiva = p.unidades && p.unidades[0];
                  const isDependente = uAtiva && uAtiva.tipo_vinculo === 'DEPENDENTE';
                  const isTitular = uAtiva && (uAtiva.tipo_vinculo === 'PROPRIETARIO' || uAtiva.tipo_vinculo === 'INQUILINO');
                  const papelInfo = obterPapelPessoa(p);
                  const ehSindico = p.perfis.some(pf => pf.tipo === 'SINDICO' || pf.tipo === 'ADMINISTRADOR');
                  const ehSuperadmin = p.perfis.some(pf => pf.tipo === 'SUPERADMIN');
                  const estaBloqueado = p.status_conta === 'BLOQUEADO' || !p.ativo;
                  const ehProprioUsuario = p.id_pessoa === idUsuarioLogado;

                  return (
                    <tr
                      key={p.id_pessoa}
                      className={`transition-colors ${
                        !p.ativo
                          ? 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 opacity-80'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* 1. Nome / Contato */}
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
                              {ehSuperadmin && (
                                <span className="rounded-md bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 px-1.5 py-0.2 text-[10px] font-extrabold text-purple-700 dark:text-purple-300">
                                  SUPERADMIN
                                </span>
                              )}
                              {p.tipo_servico && (
                                <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  {p.tipo_servico}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400">
                              {p.email ? `${p.email} • ` : ''}CPF: {mascararCPF(p.cpf)}
                              {p.celular ? ` • ${mascararCelular(p.celular)}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Apartamento / Bloco */}
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

                      {/* 3. Vínculo & Papel */}
                      <td className="py-3 px-3 text-xs">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Papel explícito */}
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
                                    uAtiva.tipo_vinculo === 'PROPRIETARIO'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                      : uAtiva.tipo_vinculo === 'INQUILINO'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : uAtiva.tipo_vinculo === 'VISITANTE'
                                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                                      : uAtiva.tipo_vinculo === 'PRESTADOR_SERVICO'
                                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                      : 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  }`}
                                >
                                  {uAtiva.tipo_vinculo}
                                  {uAtiva.parentesco ? ` (${formatarParentesco(uAtiva.parentesco)})` : ''}
                                </span>

                                {uAtiva.tipo_vinculo !== 'VISITANTE' && uAtiva.tipo_vinculo !== 'PRESTADOR_SERVICO' && (
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                      uAtiva.reside !== false
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}
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

                      {/* 4. Dependentes */}
                      <td className="py-3 px-3 text-xs">
                        {p.dependentes && p.dependentes.length > 0 ? (
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-[11px] text-navy dark:text-sky-400">
                            {p.dependentes.length} dependente(s)
                          </span>
                        ) : isTitular ? (
                          <span className="text-slate-400 text-[11px]">Nenhum</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge tipo={estaBloqueado ? 'perigo' : 'sucesso'}>
                            {estaBloqueado ? 'Bloqueado / Inativo' : 'Ativo'}
                          </Badge>
                          {p.total_bloqueios_ativos && p.total_bloqueios_ativos > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-red-100 text-red-700 dark:bg-rose-950/60 dark:text-rose-300 border border-red-200 dark:border-rose-900/60 px-1.5 py-0.5 text-[10px] font-bold"
                              title="Usuário com restrição ativa para áreas comuns"
                            >
                              🚫 {p.total_bloqueios_ativos} Penalidade(s)
                            </span>
                          ) : null}
                          {p.codigo_ativacao && (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400"
                              title="Código de 1º Acesso"
                            >
                              <Icone nome="key" className="h-3 w-3" />
                              {p.codigo_ativacao}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Governança Soberana */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Botão de Dar / Remover Administração */}
                          {!ehSuperadmin && (
                            ehSindico ? (
                              <button
                                type="button"
                                onClick={() => setConfirmacaoAdministradora({ acao: 'remover', pessoa: p })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
                                title="Revogar acesso de administradora"
                              >
                                <Icone nome="shield" className="w-3.5 h-3.5 text-amber-600" />
                                <span>Remover Adm.</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmacaoAdministradora({ acao: 'dar', pessoa: p })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 transition-colors cursor-pointer"
                                title="Conceder acesso de administradora"
                              >
                                <Icone nome="shield" className="w-3.5 h-3.5 text-purple-600" />
                                <span>Dar Administração</span>
                              </button>
                            )
                          )}

                          {/* Menu Dropdown de Opções */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setMenuAcoesAbertoId(menuAcoesAbertoId === p.id_pessoa ? null : p.id_pessoa);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
                              title="Mais opções soberanas"
                            >
                              <span>Opções</span>
                              <Icone nome="chevronDown" className="h-3 w-3 opacity-60" />
                            </button>

                            {menuAcoesAbertoId === p.id_pessoa && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-40 animate-scale-in"
                              >
                                {/* Editar Dados */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuAcoesAbertoId(null);
                                    setPessoaEditando(p);
                                    setFormEdicao({
                                      nome: p.nome,
                                      email: p.email || '',
                                      celular: p.celular || '',
                                      data_nascimento: p.data_nascimento ? p.data_nascimento.substring(0, 10) : '',
                                    });
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 text-left cursor-pointer"
                                >
                                  <Icone nome="edit" className="h-3.5 w-3.5 shrink-0" />
                                  Editar Cadastro
                                </button>

                                {/* Bloquear / Desbloquear */}
                                {!ehSuperadmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuAcoesAbertoId(null);
                                      setConfirmacaoStatus({
                                        pessoa: p,
                                        novoStatus: estaBloqueado ? 'ATIVO' : 'BLOQUEADO',
                                      });
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left cursor-pointer ${
                                      estaBloqueado
                                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60'
                                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50/60'
                                    }`}
                                  >
                                    <Icone nome={estaBloqueado ? 'check' : 'alert'} className="h-3.5 w-3.5 shrink-0" />
                                    {estaBloqueado ? 'Desbloquear Acesso' : 'Bloquear Acesso'}
                                  </button>
                                )}

                                <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />

                                {/* EXCLUSÃO IRRESTRITA (SUPERADMIN) */}
                                {!ehProprioUsuario ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuAcoesAbertoId(null);
                                      setConfirmacaoExclusao(p);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-left cursor-pointer"
                                    title="Excluir usuário e histórico sem bloqueios ou restrições"
                                  >
                                    <Icone nome="trash" className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                                    <span>Excluir (Sem Restrições)</span>
                                  </button>
                                ) : (
                                  <div className="px-3.5 py-1.5 text-[11px] text-slate-400 italic">
                                    Sessão ativa conectada
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalItens > ITENS_POR_PAGINA && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Paginacao
              paginaAtual={pagina}
              totalItens={totalItens}
              itensPorPagina={ITENS_POR_PAGINA}
              aoMudarPagina={setPagina}
            />
          </div>
        )}
      </Cartao>

      {/* Modal de Edição Soberana */}
      <Modal
        aberto={pessoaEditando !== null}
        fechar={() => setPessoaEditando(null)}
        titulo={`Edição Soberana: ${pessoaEditando?.nome || ''}`}
      >
        <form onSubmit={handleSalvarEdicao} className="space-y-4 text-sm">
          <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/50">
            🛡️ Como Superadmin, você possui permissão soberana para retificar dados cadastrais, e-mails de acesso e contatos.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={formEdicao.nome}
              onChange={e => setFormEdicao({ ...formEdicao, nome: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail de Login
              </label>
              <input
                type="email"
                value={formEdicao.email}
                onChange={e => setFormEdicao({ ...formEdicao, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Celular / WhatsApp
              </label>
              <input
                type="text"
                placeholder="(42) 99999-9999"
                value={formEdicao.celular}
                onChange={e => setFormEdicao({ ...formEdicao, celular: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Data de Nascimento
            </label>
            <input
              type="date"
              value={formEdicao.data_nascimento}
              onChange={e => setFormEdicao({ ...formEdicao, data_nascimento: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" type="button" onClick={() => setPessoaEditando(null)}>
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" disabled={processando}>
              {processando ? 'Salvando...' : 'Salvar Alterações'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Administradora (Dar / Remover) */}
      <ModalConfirmacao
        aberto={confirmacaoAdministradora !== null}
        titulo={
          confirmacaoAdministradora?.acao === 'dar'
            ? `Conceder Acesso de Administradora para ${confirmacaoAdministradora?.pessoa.nome}?`
            : `Revogar Acesso de Administradora de ${confirmacaoAdministradora?.pessoa.nome}?`
        }
        mensagem={
          confirmacaoAdministradora?.acao === 'dar'
            ? `Esta pessoa passará a ter acesso total de Administradora no condomínio (gestão de pessoas, aprovações, reservas, mural de avisos e áreas comuns).`
            : `Esta pessoa deixará de ter permissões de Administradora, mantendo apenas seus perfis de morador se possuir.`
        }
        confirmar={handleConfirmarAdministradora}
        fechar={() => setConfirmacaoAdministradora(null)}
        carregando={processando}
      />

      {/* Confirmação de Status (Bloquear / Desbloquear) */}
      <ModalConfirmacao
        aberto={confirmacaoStatus !== null}
        titulo={
          confirmacaoStatus?.novoStatus === 'BLOQUEADO'
            ? `Bloquear conta de ${confirmacaoStatus?.pessoa.nome}?`
            : `Desbloquear conta de ${confirmacaoStatus?.pessoa.nome}?`
        }
        mensagem={
          confirmacaoStatus?.novoStatus === 'BLOQUEADO'
            ? `O usuário não conseguirá fazer login nem realizar reservas no sistema enquanto a conta estiver bloqueada.`
            : `O acesso do usuário ao sistema será restabelecido imediatamente.`
        }
        confirmar={handleConfirmarStatus}
        fechar={() => setConfirmacaoStatus(null)}
        carregando={processando}
      />

      {/* Confirmação de EXCLUSÃO SOBERANA SEM RESTRIÇÕES */}
      <ModalConfirmacao
        aberto={confirmacaoExclusao !== null}
        titulo={`Excluir ${confirmacaoExclusao?.nome} (Sem Restrições)?`}
        mensagem={`Atenção Soberana: Como Superadministrador, você possui permissão para excluir este usuário sem nenhuma restrição ou bloqueio de histórico. Todas as pendências, reservas, encomendas, vínculos com apartamentos e códigos de acesso vinculados serão desfeitos permanentemente. Esta ação não poderá ser desfeita.`}
        confirmar={handleConfirmarExclusao}
        fechar={() => setConfirmacaoExclusao(null)}
        carregando={processando}
        textoBotaoConfirmar="Sim, Excluir Definitivamente"
        variante="perigo"
      />
    </div>
  );
}
