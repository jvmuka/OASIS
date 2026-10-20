import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import {
  Botao,
  Cartao,
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
import { ModalAtividadePessoa, PessoaEntradaAtividade } from '../../components/BuscaAtividadePessoa';
import ModalPerfilUsuario from '../../components/ModalPerfilUsuario';
import { formatarData, formatarHora } from '../../utils/data';

interface VagaGaragem {
  id_vaga: number;
  id_unidade: number;
  identificacao: string;
  pavimento: 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2';
  tipo_vaga: 'SIMPLES' | 'DUPLA';
  coberta: boolean;
  metragem_m2: number | string;
  numero_apartamento?: string;
  bloco?: string;
}

export interface MoradorVinculado {
  id_pessoa_unidade: number;
  id_unidade: number;
  id_pessoa: number;
  tipo_vinculo: 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE' | 'VISITANTE' | 'PRESTADOR_SERVICO';
  grau_parentesco: string | null;
  reside: boolean;
  data_inicio_ocupacao: string;
  status_aprovacao: string;
  nome: string;
  cpf: string;
  email: string | null;
  celular: string | null;
  status_conta: string;
  ativo: boolean;
  id_responsavel: number | null;
  responsavel_nome: string | null;
}

interface Unidade {
  id_unidade: number;
  id_bloco: number;
  bloco: string;
  numero_apartamento: string;
  andar: number;
  numero_vagas: number;
  total_moradores: number;
  proprietario: string | null;
  inquilino: string | null;
  vagas: VagaGaragem[];
  moradores?: MoradorVinculado[];
}

interface Bloco {
  id_bloco: number;
  nome: string;
  descricao: string | null;
  total_unidades: number;
  total_vagas_atribuidas: number;
  andares: number[];
  unidades: Unidade[];
}

interface EstruturaResponse {
  blocos: Bloco[];
  resumo: {
    total_blocos: number;
    total_unidades: number;
    total_vagas: number;
    metragem_total_garagens: number;
  };
}

export interface EstruturaFisicaProps {
  somenteLeitura?: boolean;
  aoEditarPessoa?: (pessoa: any) => void;
  aoAdicionarDependente?: (titular: any, idUnidade: number) => void;
  aoBloquear?: (pessoa: any) => void;
  aoInativar?: (pessoa: any) => void;
  aoReativar?: (pessoa: any) => void;
  aoExcluir?: (pessoa: any) => void;
}

export default function EstruturaFisica({
  somenteLeitura = false,
  aoEditarPessoa,
  aoAdicionarDependente,
  aoBloquear,
  aoInativar,
  aoReativar,
  aoExcluir,
}: EstruturaFisicaProps = {}) {
  const navigate = useNavigate();
  const [dados, setDados] = useState<EstruturaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [blocoAtivoId, setBlocoAtivoId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  // Modal de Moradores Vinculados ao Apartamento e Abas
  const [unidadeDetalhesMoradores, setUnidadeDetalhesMoradores] = useState<Unidade | null>(null);
  const [abaUnidadeDetalhes, setAbaUnidadeDetalhes] = useState<'moradores' | 'atividades'>('moradores');
  const [atividadesUnidade, setAtividadesUnidade] = useState<{
    unidade: any;
    atividade_agora: any[];
    proximas_reservas: any[];
    historico_reservas: any[];
    total_reservas: number;
  } | null>(null);
  const [carregandoAtividadesUnidade, setCarregandoAtividadesUnidade] = useState(false);

  // Modal de Perfil Completo do Usuário (igual ao módulo de Pessoas)
  const [modalPerfilUsuarioAberto, setModalPerfilUsuarioAberto] = useState(false);
  const [perfilUsuarioSelecionado, setPerfilUsuarioSelecionado] = useState<any | null>(null);
  const [perfilCarregando, setPerfilCarregando] = useState(false);

  // Modal de Atividades e Reservas da Pessoa
  const [pessoaAtividadeModal, setPessoaAtividadeModal] = useState<PessoaEntradaAtividade | null>(null);

  // Modais
  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [modalBlocoAberto, setModalBlocoAberto] = useState(false);
  const [modalUnidadeAberto, setModalUnidadeAberto] = useState(false);
  const [modalVagaAberto, setModalVagaAberto] = useState(false);
  const [modalAndarAberto, setModalAndarAberto] = useState(false);
  const [modalMudarAndarAberto, setModalMudarAndarAberto] = useState(false);

  // Estados de edição / exclusão
  const [blocoEditando, setBlocoEditando] = useState<Bloco | null>(null);
  const [blocoAlvoAndar, setBlocoAlvoAndar] = useState<Bloco | null>(null);
  const [andarRenomeando, setAndarRenomeando] = useState<{ id_bloco: number; andar_atual: number; novo_andar: number } | null>(null);
  const [abaEdicaoBloco, setAbaEdicaoBloco] = useState<'dados' | 'andares'>('dados');
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null);
  const [vagaEditando, setVagaEditando] = useState<VagaGaragem | null>(null);
  const [unidadeAlvoVaga, setUnidadeAlvoVaga] = useState<Unidade | null>(null);

  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{
    tipo: 'bloco' | 'unidade' | 'vaga';
    id: number;
    titulo: string;
    mensagem: string;
  } | null>(null);

  const [processando, setProcessando] = useState(false);

  // Formulário do Gerador em Lote
  const [formLote, setFormLote] = useState({
    nome_bloco: '',
    descricao: '',
    total_andares: 4,
    incluir_terreo: false,
    aptos_por_andar: 4,
    vagas_por_apto: 1,
    metragem_padrao_vaga: 12.5,
    pavimento_padrao_vaga: 'SUBSOLO_1' as 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2',
    tipo_padrao_vaga: 'SIMPLES' as 'SIMPLES' | 'DUPLA',
    coberta_padrao_vaga: true,
  });

  // Formulário de Novo Andar Completo (4 Apartamentos)
  const [formNovoAndar, setFormNovoAndar] = useState({
    andar: 1,
    aptos_por_andar: 4,
    vagas_por_apto: 1,
    metragem_vaga: 12.0,
    coberta_vaga: true,
  });

  // Formulário de Bloco Avulso
  const [formBloco, setFormBloco] = useState({ nome: '', descricao: '' });

  // Formulário de Unidade Avulsa
  const [formUnidade, setFormUnidade] = useState({
    id_bloco: 0,
    numero_apartamento: '',
    andar: 1,
    numero_vagas: 1,
  });

  // Formulário de Vaga
  const [formVaga, setFormVaga] = useState({
    id_unidade: 0,
    identificacao: '',
    pavimento: 'SUBSOLO_1' as 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2',
    tipo_vaga: 'SIMPLES' as 'SIMPLES' | 'DUPLA',
    coberta: true,
    metragem_m2: 12.5,
  });

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await api.get<EstruturaResponse>('/superadmin/estrutura');
      setDados(res);
      if (res.blocos.length > 0 && (!blocoAtivoId || !res.blocos.some(b => b.id_bloco === blocoAtivoId))) {
        setBlocoAtivoId(res.blocos[0].id_bloco);
      }
      setUnidadeDetalhesMoradores(prev => {
        if (!prev) return null;
        for (const b of res.blocos) {
          const uNova = b.unidades.find(u => u.id_unidade === prev.id_unidade);
          if (uNova) return uNova;
        }
        return prev;
      });
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao carregar estrutura do condomínio.', tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const blocoSelecionado = useMemo(() => {
    if (!dados || !dados.blocos.length) return null;
    return dados.blocos.find(b => b.id_bloco === blocoAtivoId) || dados.blocos[0];
  }, [dados, blocoAtivoId]);

  // Cálculos prévios do Gerador em Lote
  const calculoPreviaLote = useMemo(() => {
    const andares = Number(formLote.total_andares || 0) + (formLote.incluir_terreo ? 1 : 0);
    const aptos = andares * Number(formLote.aptos_por_andar || 0);
    const vagas = aptos * Number(formLote.vagas_por_apto || 0);
    const areaTotal = vagas * Number(formLote.metragem_padrao_vaga || 0);
    return { andares, aptos, vagas, areaTotal };
  }, [formLote]);

  // Submissão do Gerador em Lote
  async function handleGerarLote(e: React.FormEvent) {
    e.preventDefault();
    setProcessando(true);
    try {
      const res = await api.post<{ sucesso: boolean; mensagem: string; id_bloco: number }>(
        '/superadmin/blocos/lote',
        formLote
      );
      setMsg({ t: res.mensagem, tipo: 'ok' });
      setModalLoteAberto(false);
      await carregar();
      if (res.id_bloco) setBlocoAtivoId(res.id_bloco);
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao gerar bloco em lote.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Criar / Editar Bloco
  async function handleSalvarBloco(e: React.FormEvent) {
    e.preventDefault();
    setProcessando(true);
    try {
      if (blocoEditando) {
        await api.put(`/superadmin/blocos/${blocoEditando.id_bloco}`, formBloco);
        setMsg({ t: `Bloco "${formBloco.nome}" atualizado com sucesso.`, tipo: 'ok' });
      } else {
        const res = await api.post<Bloco>('/superadmin/blocos', formBloco);
        setMsg({ t: `Bloco "${res.nome}" criado com sucesso.`, tipo: 'ok' });
        setBlocoAtivoId(res.id_bloco);
      }
      setModalBlocoAberto(false);
      setBlocoEditando(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao salvar bloco.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Adicionar Andar Completo (4 apartamentos com vagas) a um bloco
  async function handleAdicionarAndar(e: React.FormEvent) {
    e.preventDefault();
    if (!blocoAlvoAndar) return;
    setProcessando(true);
    try {
      const res = await api.post<{ sucesso: boolean; mensagem: string }>(
        `/superadmin/blocos/${blocoAlvoAndar.id_bloco}/andar`,
        formNovoAndar
      );
      setMsg({ t: res.mensagem, tipo: 'ok' });
      setModalAndarAberto(false);
      setBlocoAlvoAndar(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao adicionar andar.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Sincronizar e organizar andares de um bloco pela regra de 4 apartamentos por andar
  async function handleSincronizarAndares(idBloco: number) {
    setProcessando(true);
    try {
      const res = await api.post<{ sucesso: boolean; mensagem: string }>(
        `/superadmin/blocos/${idBloco}/sincronizar-andares`
      );
      setMsg({ t: res.mensagem, tipo: 'ok' });
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao sincronizar andares.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Renomear / Mudar Andar de um conjunto de apartamentos
  async function handleRenomearAndar(e: React.FormEvent) {
    e.preventDefault();
    if (!andarRenomeando) return;
    setProcessando(true);
    try {
      const res = await api.put<{ sucesso: boolean; mensagem: string }>(
        `/superadmin/blocos/${andarRenomeando.id_bloco}/andares/${andarRenomeando.andar_atual}`,
        { novo_andar: andarRenomeando.novo_andar }
      );
      setMsg({ t: res.mensagem, tipo: 'ok' });
      setModalMudarAndarAberto(false);
      setAndarRenomeando(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao mudar andar.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Criar / Editar Unidade
  async function handleSalvarUnidade(e: React.FormEvent) {
    e.preventDefault();
    setProcessando(true);
    try {
      if (unidadeEditando) {
        await api.put(`/superadmin/unidades/${unidadeEditando.id_unidade}`, formUnidade);
        setMsg({ t: `Apartamento "${formUnidade.numero_apartamento}" atualizado com sucesso.`, tipo: 'ok' });
      } else {
        await api.post('/superadmin/unidades', formUnidade);
        setMsg({ t: `Apartamento "${formUnidade.numero_apartamento}" adicionado com sucesso.`, tipo: 'ok' });
      }
      setModalUnidadeAberto(false);
      setUnidadeEditando(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao salvar apartamento.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Criar / Editar Vaga
  async function handleSalvarVaga(e: React.FormEvent) {
    e.preventDefault();
    setProcessando(true);
    try {
      if (vagaEditando) {
        await api.put(`/superadmin/vagas/${vagaEditando.id_vaga}`, formVaga);
        setMsg({ t: `Vaga "${formVaga.identificacao}" atualizada com sucesso.`, tipo: 'ok' });
      } else {
        await api.post('/superadmin/vagas', formVaga);
        setMsg({ t: `Vaga "${formVaga.identificacao}" vinculada com sucesso.`, tipo: 'ok' });
      }
      setModalVagaAberto(false);
      setVagaEditando(null);
      setUnidadeAlvoVaga(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao salvar vaga.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  // Confirmação de Exclusão
  async function handleConfirmarExclusao() {
    if (!confirmacaoExclusao) return;
    setProcessando(true);
    try {
      if (confirmacaoExclusao.tipo === 'bloco') {
        const res = await api.delete<{ mensagem: string }>(`/superadmin/blocos/${confirmacaoExclusao.id}`);
        setMsg({ t: res.mensagem, tipo: 'ok' });
        setBlocoAtivoId(null);
      } else if (confirmacaoExclusao.tipo === 'unidade') {
        const res = await api.delete<{ mensagem: string }>(`/superadmin/unidades/${confirmacaoExclusao.id}`);
        setMsg({ t: res.mensagem, tipo: 'ok' });
      } else if (confirmacaoExclusao.tipo === 'vaga') {
        const res = await api.delete<{ mensagem: string }>(`/superadmin/vagas/${confirmacaoExclusao.id}`);
        setMsg({ t: res.mensagem, tipo: 'ok' });
      }
      setConfirmacaoExclusao(null);
      await carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao excluir item.', tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  function formatarPavimento(pav: string) {
    switch (pav) {
      case 'TERREO':
        return 'Térreo';
      case 'SUBSOLO_1':
        return '1º Subsolo';
      case 'SUBSOLO_2':
        return '2º Subsolo';
      default:
        return pav;
    }
  }

  function formatarNomeAndar(andar: number) {
    if (andar === 0) return 'Térreo';
    return `${andar}º Andar`;
  }

  function formatarCpf(cpf: string) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function formatarCelular(cel: string | null) {
    if (!cel) return '-';
    const c = cel.replace(/\D/g, '');
    if (c.length === 11) return c.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (c.length === 10) return c.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return cel;
  }

  function formatarParentesco(p: string | null) {
    switch (p) {
      case 'CONJUGE': return 'Cônjuge';
      case 'FILHO': return 'Filho(a)';
      case 'PAI_MAE': return 'Pai/Mãe';
      case 'OUTRO': return 'Outro';
      default: return p || 'Não especificado';
    }
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

  function obterPapelUsuario(p: any): {
    papel: string;
    badgeCls: string;
  } {
    const tipos = (p.perfis || []).map((pf: any) => (typeof pf === 'string' ? pf : pf.tipo));
    const temSindico = tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR');
    const temMorador = tipos.includes('MORADOR');
    const temPorteiro = tipos.includes('PORTEIRO');

    if (p.papel_controle === 'PRESTADOR_SERVICO' || p.tipo_servico) {
      return {
        papel: p.tipo_servico ? `Prestador: ${p.tipo_servico}` : 'Prestador de Serviço',
        badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60',
      };
    }
    if (p.papel_controle === 'VISITANTE') {
      return {
        papel: 'Visitante',
        badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/60',
      };
    }
    if (temSindico && temMorador) {
      return {
        papel: 'Administrador / Morador',
        badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60',
      };
    }
    if (temSindico) {
      return {
        papel: 'Administrador',
        badgeCls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
      };
    }
    if (temPorteiro) {
      return {
        papel: 'Porteiro',
        badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
      };
    }
    return {
      papel: 'Morador',
      badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
    };
  }

  async function abrirPerfilUsuario(idPessoa: number) {
    setPerfilCarregando(true);
    try {
      const detalhe = await api.get<any>(`/cadastros/pessoas/${idPessoa}/detalhes`);
      setPerfilUsuarioSelecionado(detalhe);
      setModalPerfilUsuarioAberto(true);
    } catch (err: any) {
      setMsg({ t: err.message || 'Erro ao carregar detalhes do perfil do usuário.', tipo: 'erro' });
    } finally {
      setPerfilCarregando(false);
    }
  }

  async function carregarAtividadesUnidade(idUnidade: number) {
    setCarregandoAtividadesUnidade(true);
    try {
      const res = await api.get<any>(`/superadmin/unidades/${idUnidade}/atividades-reservas`);
      setAtividadesUnidade(res);
    } catch (err: any) {
      console.error('Erro ao buscar atividades e reservas da unidade:', err);
    } finally {
      setCarregandoAtividadesUnidade(false);
    }
  }

  function abrirModalUnidade(u: Unidade) {
    setUnidadeDetalhesMoradores(u);
    setAbaUnidadeDetalhes('moradores');
    setAtividadesUnidade(null);
    carregarAtividadesUnidade(u.id_unidade);
  }

  function renderCardMorador(m: MoradorVinculado, cardStyle: string) {
    const celLimpo = m.celular ? m.celular.replace(/\D/g, '') : null;
    return (
      <div
        key={m.id_pessoa_unidade}
        className={`rounded-xl border p-3.5 transition-all text-xs ${cardStyle}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0">
              {m.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                {m.nome}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="font-semibold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {m.tipo_vinculo}
                </span>

                {m.tipo_vinculo === 'DEPENDENTE' && m.grau_parentesco && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-medium">
                    {formatarParentesco(m.grau_parentesco)}
                  </span>
                )}

                {m.reside ? (
                  <Badge tipo="sucesso">Reside no Imóvel</Badge>
                ) : (
                  <Badge tipo="neutro">Não reside</Badge>
                )}

                {!m.ativo && (
                  <Badge tipo="perigo">Inativo</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Ações do Morador: Ver Perfil, Atividades e WhatsApp alinhados à direita da caixa */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => abrirPerfilUsuario(m.id_pessoa)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Ver Perfil Completo do Usuário"
            >
              <Icone nome="user" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Ver Perfil
            </button>

            <button
              type="button"
              onClick={() =>
                setPessoaAtividadeModal({
                  id_pessoa: m.id_pessoa,
                  nome: m.nome,
                  cpf: m.cpf,
                  celular: m.celular,
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-50 dark:bg-slate-800 border border-navy-100 dark:border-slate-700 text-navy dark:text-sky-300 hover:bg-navy-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Ver Atividades e Reservas Deste Morador"
            >
              <Icone nome="calendar" className="w-3.5 h-3.5 text-navy dark:text-sky-400" />
              Atividades
            </button>

            {celLimpo && (
              <a
                href={`https://wa.me/55${celLimpo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 w-fit shrink-0"
                title="Conversar no WhatsApp"
              >
                <Icone nome="megaphone" className="w-3 h-3 text-emerald-500" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Detalhes de contato e vínculo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-slate-600 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">CPF:</span>{' '}
            <span className="font-mono">{formatarCpf(m.cpf)}</span>
          </div>

          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Celular:</span>{' '}
            <span>{formatarCelular(m.celular)}</span>
          </div>

          <div className="truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">E-mail:</span>{' '}
            <span title={m.email || 'Não informado'}>{m.email || 'Não informado'}</span>
          </div>

          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Início Ocupação:</span>{' '}
            <span>{m.data_inicio_ocupacao ? new Date(m.data_inicio_ocupacao).toLocaleDateString('pt-BR') : '-'}</span>
          </div>

          {m.tipo_vinculo === 'DEPENDENTE' && (
            <div className="sm:col-span-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Responsável Titular:</span>{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{m.responsavel_nome || 'Morador Titular'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Titulo>Gestão Estrutural & Vagas</Titulo>
            {!somenteLeitura ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-xs font-bold ring-1 ring-purple-600/20">
                <Icone nome="shield" className="w-3.5 h-3.5" />
                Superadmin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 text-xs font-bold ring-1 ring-purple-500/20">
                <Icone nome="eye" className="w-3.5 h-3.5" />
                Modo Visualização
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {somenteLeitura
              ? 'Visualização da planta física, andares, apartamentos, garagens e moradores vinculados.'
              : 'Configure blocos, andares, apartamentos e vagas de garagem com metragem útil (m²).'}
          </p>
        </div>

        {!somenteLeitura && (
          <div className="flex items-center gap-2 flex-wrap">
            <Botao
              variante="primario"
              onClick={() => {
                setFormLote({
                  nome_bloco: '',
                  descricao: '',
                  total_andares: 4,
                  incluir_terreo: false,
                  aptos_por_andar: 4,
                  vagas_por_apto: 1,
                  metragem_padrao_vaga: 12.5,
                  pavimento_padrao_vaga: 'SUBSOLO_1',
                  tipo_padrao_vaga: 'SIMPLES',
                  coberta_padrao_vaga: true,
                });
                setModalLoteAberto(true);
              }}
              className="!bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-700 hover:!to-indigo-700 !text-white shadow-md shadow-purple-500/20"
            >
              <Icone nome="sparkles" className="w-4 h-4 mr-1.5" />
              Gerador Estrutural em Lote
            </Botao>

            <Botao
              variante="secundario"
              onClick={() => {
                setBlocoEditando(null);
                setFormBloco({ nome: '', descricao: '' });
                setModalBlocoAberto(true);
              }}
            >
              <Icone nome="plus" className="w-4 h-4 mr-1" />
              Novo Bloco
            </Botao>

            <Botao
              variante="secundario"
              onClick={() => {
                if (!blocoSelecionado) {
                  setMsg({ t: 'Cadastre um bloco antes de adicionar apartamentos.', tipo: 'erro' });
                  return;
                }
                setUnidadeEditando(null);
                setFormUnidade({
                  id_bloco: blocoSelecionado.id_bloco,
                  numero_apartamento: '',
                  andar: 1,
                  numero_vagas: 1,
                });
                setModalUnidadeAberto(true);
              }}
            >
              <Icone nome="plus" className="w-4 h-4 mr-1" />
              Novo Apartamento
            </Botao>
          </div>
        )}
      </div>

      {msg.t && <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />}

      {/* Cards de Métricas / Resumo */}
      {dados && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <Icone nome="building" className="w-4 h-4 text-purple-500" />
              Total de Blocos
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {dados.resumo.total_blocos}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <Icone nome="layers" className="w-4 h-4 text-indigo-500" />
              Total de Unidades
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {dados.resumo.total_unidades}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <Icone nome="car" className="w-4 h-4 text-sky-500" />
              Vagas de Garagem
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {dados.resumo.total_vagas}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <Icone nome="sparkles" className="w-4 h-4 text-emerald-500" />
              Área Total Garagens
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {Number(dados.resumo.metragem_total_garagens || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-normal text-slate-500">m²</span>
            </p>
          </div>
        </div>
      )}

      {/* Navegação entre Blocos (Abas) */}
      {dados && dados.blocos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {dados.blocos.map(b => {
              const ativo = blocoSelecionado?.id_bloco === b.id_bloco;
              return (
                <button
                  key={b.id_bloco}
                  onClick={() => setBlocoAtivoId(b.id_bloco)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                    ativo
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25 ring-2 ring-purple-600/30'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icone nome="building" className="w-4 h-4" />
                  <span>{b.nome}</span>
                  <span
                    className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      ativo
                        ? 'bg-purple-700/80 text-purple-100'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {b.total_unidades} aptos
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detalhes do Bloco Selecionado */}
          {blocoSelecionado && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{blocoSelecionado.nome}</span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({blocoSelecionado.total_unidades} apartamentos cadastrados)
                    </span>
                  </h3>
                  {blocoSelecionado.descricao && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {blocoSelecionado.descricao}
                    </p>
                  )}
                </div>

                {!somenteLeitura && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Botao
                      variante="primario"
                      tamanho="sm"
                      onClick={() => {
                        setUnidadeEditando(null);
                        setFormUnidade({
                          id_bloco: blocoSelecionado.id_bloco,
                          numero_apartamento: '',
                          andar: 1,
                          numero_vagas: 1,
                        });
                        setModalUnidadeAberto(true);
                      }}
                    >
                      <Icone nome="plus" className="w-3.5 h-3.5 mr-1" />
                      Novo Apartamento
                    </Botao>

                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => {
                        const maxAndar = blocoSelecionado.unidades.length > 0
                          ? Math.max(...blocoSelecionado.unidades.map(u => u.andar))
                          : 0;
                        setBlocoAlvoAndar(blocoSelecionado);
                        setFormNovoAndar({
                          andar: maxAndar + 1,
                          aptos_por_andar: 4,
                          vagas_por_apto: 1,
                          metragem_vaga: 12.0,
                          coberta_vaga: true,
                        });
                        setModalAndarAberto(true);
                      }}
                      className="hover:!text-purple-600 hover:!border-purple-300"
                    >
                      <Icone nome="layers" className="w-3.5 h-3.5 mr-1" />
                      Novo Andar
                    </Botao>

                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => handleSincronizarAndares(blocoSelecionado.id_bloco)}
                      title="Organiza todos os apartamentos em andares de 4 unidades cada pela numeração"
                    >
                      <Icone nome="filter" className="w-3.5 h-3.5 mr-1" />
                      Organizar Andares
                    </Botao>

                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => {
                        setBlocoEditando(blocoSelecionado);
                        setAbaEdicaoBloco('dados');
                        setFormBloco({
                          nome: blocoSelecionado.nome,
                          descricao: blocoSelecionado.descricao || '',
                        });
                        setModalBlocoAberto(true);
                      }}
                    >
                      <Icone nome="edit" className="w-3.5 h-3.5 mr-1" />
                      Editar Bloco
                    </Botao>

                    <Botao
                      variante="perigo"
                      tamanho="sm"
                      onClick={() => {
                        setConfirmacaoExclusao({
                          tipo: 'bloco',
                          id: blocoSelecionado.id_bloco,
                          titulo: `Excluir ${blocoSelecionado.nome}?`,
                          mensagem: `Esta ação só será permitida se o bloco não contiver apartamentos cadastrados. Deseja prosseguir?`,
                        });
                      }}
                    >
                      <Icone nome="trash" className="w-3.5 h-3.5 mr-1" />
                      Excluir
                    </Botao>
                  </div>
                )}
              </div>

              {/* Lista de Andares e Apartamentos */}
              {blocoSelecionado.unidades.length === 0 ? (
                <EmptyState
                  icone="building"
                  titulo="Nenhum apartamento neste bloco"
                  descricao="Você pode gerar apartamentos em lote pelo assistente ou adicionar unidades avulsas."
                  acao={
                    !somenteLeitura ? (
                      <Botao
                        variante="primario"
                        onClick={() => {
                          setUnidadeEditando(null);
                          setFormUnidade({
                            id_bloco: blocoSelecionado.id_bloco,
                            numero_apartamento: '',
                            andar: 1,
                            numero_vagas: 1,
                          });
                          setModalUnidadeAberto(true);
                        }}
                      >
                        Adicionar Apartamento
                      </Botao>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-6">
                  {/* Agrupa as unidades do bloco por andar */}
                  {Array.from(new Set(blocoSelecionado.unidades.map(u => u.andar)))
                    .sort((a, b) => b - a) // Mostra andares superiores no topo
                    .map(andar => {
                      const aptosAndar = blocoSelecionado.unidades.filter(u => u.andar === andar);
                      return (
                        <div key={andar} className="space-y-3">
                          <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Icone nome="layers" className="w-3.5 h-3.5 text-purple-500" />
                              <span>{formatarNomeAndar(andar)}</span>
                              <span className="text-[11px] font-normal text-slate-400">
                                ({aptosAndar.length} {aptosAndar.length === 1 ? 'apartamento' : 'apartamentos'})
                              </span>
                            </div>

                            {!somenteLeitura && (
                              <div className="flex items-center gap-3 normal-case font-normal">
                                <button
                                  onClick={() => {
                                    setUnidadeEditando(null);
                                    const proxNum = `${andar}${aptosAndar.length + 1}`;
                                    setFormUnidade({
                                      id_bloco: blocoSelecionado.id_bloco,
                                      numero_apartamento: proxNum,
                                      andar: andar,
                                      numero_vagas: 1,
                                    });
                                    setModalUnidadeAberto(true);
                                  }}
                                  className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Icone nome="plus" className="w-3 h-3" />
                                  Apto no {formatarNomeAndar(andar)}
                                </button>

                                <button
                                  onClick={() => {
                                    setAndarRenomeando({
                                      id_bloco: blocoSelecionado.id_bloco,
                                      andar_atual: andar,
                                      novo_andar: andar,
                                    });
                                    setModalMudarAndarAberto(true);
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Mudar o número do andar para todos os apartamentos deste andar"
                                >
                                  <Icone nome="edit" className="w-3 h-3" />
                                  Mudar Andar
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {aptosAndar.map(u => (
                              <div
                                key={u.id_unidade}
                                className="rounded-xl border border-slate-200/90 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60 p-4 transition-all hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-xs"
                              >
                                {/* Header do Card do Apto - Clicável para abrir os detalhes de moradores */}
                                <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                                  <div
                                    onClick={() => abrirModalUnidade(u)}
                                    className="cursor-pointer group flex-1 select-none transition-colors rounded-lg -m-1 p-1 hover:bg-purple-50/70 dark:hover:bg-purple-950/30"
                                    title="Clique no apartamento para ver os perfis e moradores vinculados"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-1.5">
                                        Apto {u.numero_apartamento}
                                        <Icone nome="users" className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 opacity-60 group-hover:opacity-100 transition-all" />
                                      </span>
                                      {u.total_moradores > 0 ? (
                                        <Badge tipo="sucesso">
                                          {u.total_moradores} {u.total_moradores === 1 ? 'morador' : 'moradores'}
                                        </Badge>
                                      ) : (
                                        <Badge tipo="neutro">Vago</Badge>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                      {u.proprietario ? (
                                        <p className="truncate group-hover:text-slate-700 dark:group-hover:text-slate-200">
                                          <span className="font-semibold text-slate-700 dark:text-slate-300">Prop:</span> {u.proprietario}
                                        </p>
                                      ) : u.inquilino ? (
                                        <p className="truncate group-hover:text-slate-700 dark:group-hover:text-slate-200">
                                          <span className="font-semibold text-slate-700 dark:text-slate-300">Inq:</span> {u.inquilino}
                                        </p>
                                      ) : (
                                        <p className="italic text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                          Sem moradores vinculados (Clique para detalhes)
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Ações do Apto */}
                                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => abrirModalUnidade(u)}
                                      title="Ver Perfis e Moradores Vinculados"
                                      className="p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                                    >
                                      <Icone nome="users" className="w-3.5 h-3.5" />
                                    </button>

                                    {!somenteLeitura && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setUnidadeEditando(u);
                                            setFormUnidade({
                                              id_bloco: u.id_bloco,
                                              numero_apartamento: u.numero_apartamento,
                                              andar: u.andar,
                                              numero_vagas: u.numero_vagas,
                                            });
                                            setModalUnidadeAberto(true);
                                          }}
                                          title="Editar Apartamento"
                                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                          <Icone nome="edit" className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          onClick={() => {
                                            setConfirmacaoExclusao({
                                              tipo: 'unidade',
                                              id: u.id_unidade,
                                              titulo: `Excluir Apartamento ${u.numero_apartamento}?`,
                                              mensagem: `Esta ação só será permitida se o apartamento não possuir histórico de moradores ou encomendas. Vagas vinculadas serão removidas.`,
                                            });
                                          }}
                                          title="Excluir Apartamento"
                                          className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                        >
                                          <Icone nome="trash" className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Seção de Vagas de Garagem do Apartamento */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <Icone nome="car" className="w-3.5 h-3.5 text-sky-500" />
                                      Vagas de Carro ({u.vagas.length})
                                    </span>

                                    {!somenteLeitura && (
                                      <button
                                        onClick={() => {
                                          setUnidadeAlvoVaga(u);
                                          setVagaEditando(null);
                                          setFormVaga({
                                            id_unidade: u.id_unidade,
                                            identificacao: `G-${u.numero_apartamento}`,
                                            pavimento: 'SUBSOLO_1',
                                            tipo_vaga: 'SIMPLES',
                                            coberta: true,
                                            metragem_m2: 12.5,
                                          });
                                          setModalVagaAberto(true);
                                        }}
                                        className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 text-[10px] font-semibold cursor-pointer"
                                      >
                                        <Icone nome="plus" className="w-3 h-3" />
                                        Adicionar Vaga
                                      </button>
                                    )}
                                  </div>

                                  {u.vagas.length === 0 ? (
                                    <p className="text-[11px] text-slate-400 italic bg-white/70 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                                      Nenhuma vaga vinculada a este apartamento.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {u.vagas.map(v => (
                                        <div
                                          key={v.id_vaga}
                                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                                {v.identificacao}
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800/60">
                                                {Number(v.metragem_m2 || 0).toFixed(2)} m²
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">
                                                {v.coberta ? 'Coberta' : 'Descoberta'}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                              {formatarPavimento(v.pavimento)} • Vaga {v.tipo_vaga === 'DUPLA' ? 'Dupla' : 'Simples'}
                                            </p>
                                          </div>

                                          {!somenteLeitura && (
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                onClick={() => {
                                                  setVagaEditando(v);
                                                  setUnidadeAlvoVaga(u);
                                                  setFormVaga({
                                                    id_unidade: v.id_unidade,
                                                    identificacao: v.identificacao,
                                                    pavimento: v.pavimento,
                                                    tipo_vaga: v.tipo_vaga,
                                                    coberta: v.coberta,
                                                    metragem_m2: Number(v.metragem_m2 || 12.0),
                                                  });
                                                  setModalVagaAberto(true);
                                                }}
                                                title="Editar Vaga"
                                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                              >
                                                <Icone nome="edit" className="w-3 h-3" />
                                              </button>

                                              <button
                                                onClick={() => {
                                                  setConfirmacaoExclusao({
                                                    tipo: 'vaga',
                                                    id: v.id_vaga,
                                                    titulo: `Excluir Vaga ${v.identificacao}?`,
                                                    mensagem: `Esta ação removerá a vaga de garagem do apartamento ${u.numero_apartamento}.`,
                                                  });
                                                }}
                                                title="Excluir Vaga"
                                                className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                              >
                                                <Icone nome="trash" className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GERADOR ESTRUTURAL EM LOTE (PRO MAX)                             */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalLoteAberto}
        fechar={() => setModalLoteAberto(false)}
        titulo="⚡ Gerador Estrutural em Lote de Blocos e Apartamentos"
      >
        <form onSubmit={handleGerarLote} className="space-y-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie um bloco completo com andares, apartamentos e vagas com metragem calculada automaticamente em uma única operação segura.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Bloco *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Bloco D, Torre Sul"
                value={formLote.nome_bloco}
                onChange={e => setFormLote({ ...formLote, nome_bloco: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descrição Opcional
              </label>
              <input
                type="text"
                placeholder="Ex: Prédio Residencial"
                value={formLote.descricao}
                onChange={e => setFormLote({ ...formLote, descricao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
              <Icone nome="layers" className="w-3.5 h-3.5" />
              Configuração de Andares e Apartamentos
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total de Andares (1 a 50) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={formLote.total_andares}
                  onChange={e => setFormLote({ ...formLote, total_andares: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Apartamentos por Andar *
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={formLote.aptos_por_andar}
                  onChange={e => setFormLote({ ...formLote, aptos_por_andar: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formLote.incluir_terreo}
                    onChange={e => setFormLote({ ...formLote, incluir_terreo: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Incluir Térreo Residencial
                </label>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
              <Icone nome="car" className="w-3.5 h-3.5" />
              Configuração das Vagas de Garagem por Apartamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vagas por Apartamento
                </label>
                <select
                  value={formLote.vagas_por_apto}
                  onChange={e => setFormLote({ ...formLote, vagas_por_apto: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value={0}>Sem vagas automáticas</option>
                  <option value={1}>1 Vaga por Apto</option>
                  <option value={2}>2 Vagas por Apto</option>
                  <option value={3}>3 Vagas por Apto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Metragem de Cada Vaga (m²) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  value={formLote.metragem_padrao_vaga}
                  onChange={e => setFormLote({ ...formLote, metragem_padrao_vaga: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-purple-700 dark:text-purple-300 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pavimento Padrão
                </label>
                <select
                  value={formLote.pavimento_padrao_vaga}
                  onChange={e => setFormLote({ ...formLote, pavimento_padrao_vaga: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="SUBSOLO_1">1º Subsolo</option>
                  <option value="SUBSOLO_2">2º Subsolo</option>
                  <option value="TERREO">Térreo</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formLote.coberta_padrao_vaga}
                    onChange={e => setFormLote({ ...formLote, coberta_padrao_vaga: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Vagas Cobertas
                </label>
              </div>
            </div>
          </div>

          {/* Prévia do Resultado */}
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800/70 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="font-semibold">Prévia da Geração:</span>
            <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">
              {calculoPreviaLote.andares} andares • {calculoPreviaLote.aptos} aptos • {calculoPreviaLote.vagas} vagas ({calculoPreviaLote.areaTotal.toFixed(1)} m²)
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" type="button" onClick={() => setModalLoteAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              type="submit"
              disabled={processando}
              className="!bg-gradient-to-r !from-purple-600 !to-indigo-600 !text-white"
            >
              {processando ? 'Gerando...' : 'Confirmar e Gerar Bloco'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 2: CRIAR / EDITAR BLOCO COM GESTÃO DE ANDARES E UNIDADES             */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalBlocoAberto}
        fechar={() => {
          setModalBlocoAberto(false);
          setBlocoEditando(null);
        }}
        titulo={blocoEditando ? `Gerenciar ${blocoEditando.nome}` : 'Novo Bloco'}
      >
        {blocoEditando && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => setAbaEdicaoBloco('dados')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                abaEdicaoBloco === 'dados'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Identificação do Bloco
            </button>
            <button
              type="button"
              onClick={() => setAbaEdicaoBloco('andares')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                abaEdicaoBloco === 'andares'
                  ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icone nome="layers" className="w-3.5 h-3.5" />
              Andares & Apartamentos ({blocoEditando.total_unidades})
            </button>
          </div>
        )}

        {(!blocoEditando || abaEdicaoBloco === 'dados') && (
          <form onSubmit={handleSalvarBloco} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Bloco *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Bloco A, Torre B"
                value={formBloco.nome}
                onChange={e => setFormBloco({ ...formBloco, nome: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descrição
              </label>
              <input
                type="text"
                placeholder="Ex: Edifício Residencial com 4 aptos por andar"
                value={formBloco.descricao}
                onChange={e => setFormBloco({ ...formBloco, descricao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="secundario" type="button" onClick={() => setModalBlocoAberto(false)}>
                Cancelar
              </Botao>
              <Botao variante="primario" type="submit" disabled={processando}>
                {processando ? 'Salvando...' : 'Salvar Bloco'}
              </Botao>
            </div>
          </form>
        )}

        {blocoEditando && abaEdicaoBloco === 'andares' && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 dark:border-purple-900/50 dark:bg-purple-950/30">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200 mb-1">
                <span>Estrutura do Bloco</span>
                <span>{blocoEditando.total_unidades} apartamentos</span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Padrão do condomínio: <strong>4 apartamentos por andar</strong>, onde o prefixo numérico identifica o andar (ex: apto 51..54 = 5º andar; 101..104 = 10º andar).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Botao
                variante="primario"
                className="w-full justify-center !bg-purple-600 hover:!bg-purple-700 text-white"
                onClick={() => {
                  const maxAndar = blocoEditando.unidades.length > 0
                    ? Math.max(...blocoEditando.unidades.map(u => u.andar))
                    : 0;
                  setBlocoAlvoAndar(blocoEditando);
                  setFormNovoAndar({
                    andar: maxAndar + 1,
                    aptos_por_andar: 4,
                    vagas_por_apto: 1,
                    metragem_vaga: 12.0,
                    coberta_vaga: true,
                  });
                  setModalBlocoAberto(false);
                  setModalAndarAberto(true);
                }}
              >
                <Icone nome="layers" className="w-4 h-4 mr-1.5" />
                Adicionar Novo Andar com 4 Apartamentos
              </Botao>

              <Botao
                variante="secundario"
                className="w-full justify-center"
                onClick={() => {
                  setUnidadeEditando(null);
                  setFormUnidade({
                    id_bloco: blocoEditando.id_bloco,
                    numero_apartamento: '',
                    andar: 1,
                    numero_vagas: 1,
                  });
                  setModalBlocoAberto(false);
                  setModalUnidadeAberto(true);
                }}
              >
                <Icone nome="plus" className="w-4 h-4 mr-1.5" />
                Adicionar Apartamento Avulso neste Bloco
              </Botao>

              <Botao
                variante="secundario"
                className="w-full justify-center"
                onClick={async () => {
                  await handleSincronizarAndares(blocoEditando.id_bloco);
                  setModalBlocoAberto(false);
                }}
              >
                <Icone nome="filter" className="w-4 h-4 mr-1.5" />
                Sincronizar e Organizar Andares pela Numeração
              </Botao>
            </div>

            <div className="flex justify-end pt-2">
              <Botao variante="secundario" type="button" onClick={() => setModalBlocoAberto(false)}>
                Fechar
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CRIAR / EDITAR APARTAMENTO                                       */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalUnidadeAberto}
        fechar={() => {
          setModalUnidadeAberto(false);
          setUnidadeEditando(null);
        }}
        titulo={unidadeEditando ? `Editar Apartamento ${unidadeEditando.numero_apartamento}` : 'Novo Apartamento'}
      >
        <form onSubmit={handleSalvarUnidade} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bloco *
            </label>
            <select
              value={formUnidade.id_bloco}
              onChange={e => setFormUnidade({ ...formUnidade, id_bloco: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {dados?.blocos.map(b => (
                <option key={b.id_bloco} value={b.id_bloco}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número do Apartamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 51, 101, 241"
                value={formUnidade.numero_apartamento}
                onChange={e => {
                  const num = e.target.value;
                  let novoAndar = formUnidade.andar;
                  if (/^\d{2,}$/.test(num.trim()) && !unidadeEditando) {
                    novoAndar = Math.floor(parseInt(num.trim(), 10) / 10);
                  }
                  setFormUnidade({ ...formUnidade, numero_apartamento: num, andar: novoAndar });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {/^\d{2,}$/.test(formUnidade.numero_apartamento) && (
                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1 font-medium">
                  <Icone nome="layers" className="w-3 h-3" />
                  Andar detectado: {Math.floor(parseInt(formUnidade.numero_apartamento, 10) / 10)}º Andar
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Andar (0 = Térreo) *
              </label>
              <input
                type="number"
                min={0}
                max={50}
                required
                value={formUnidade.andar}
                onChange={e => setFormUnidade({ ...formUnidade, andar: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" type="button" onClick={() => setModalUnidadeAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" disabled={processando}>
              {processando ? 'Salvando...' : 'Salvar Apartamento'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: NOVO ANDAR COM APARTAMENTOS E VAGAS                              */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalAndarAberto}
        fechar={() => {
          setModalAndarAberto(false);
          setBlocoAlvoAndar(null);
        }}
        titulo={`Novo Andar no ${blocoAlvoAndar?.nome || 'Bloco'}`}
      >
        <form onSubmit={handleAdicionarAndar} className="space-y-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gera automaticamente os apartamentos e vagas para o novo andar do bloco, aplicando a regra de numeração do condomínio.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Número do Andar *
              </label>
              <input
                type="number"
                min={0}
                max={60}
                required
                value={formNovoAndar.andar}
                onChange={e => setFormNovoAndar({ ...formNovoAndar, andar: Number(e.target.value) })}
                className="w-full rounded-lg border border-purple-300 dark:border-purple-800 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Apartamentos por Andar
              </label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={formNovoAndar.aptos_por_andar}
                onChange={e => setFormNovoAndar({ ...formNovoAndar, aptos_por_andar: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vagas por Apartamento
              </label>
              <input
                type="number"
                min={0}
                max={5}
                required
                value={formNovoAndar.vagas_por_apto}
                onChange={e => setFormNovoAndar({ ...formNovoAndar, vagas_por_apto: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Metragem de Cada Vaga (m²)
              </label>
              <input
                type="number"
                step="0.1"
                min={1}
                required
                value={formNovoAndar.metragem_vaga}
                onChange={e => setFormNovoAndar({ ...formNovoAndar, metragem_vaga: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-3 text-xs text-purple-900 dark:text-purple-200">
            <span className="font-bold">Prévia dos Apartamentos a Serem Criados:</span>
            <p className="mt-1 font-mono font-semibold">
              {Array.from({ length: formNovoAndar.aptos_por_andar }, (_, i) =>
                formNovoAndar.andar === 0 ? `T-0${i + 1}` : `${formNovoAndar.andar}${i + 1}`
              ).join(', ')}
            </p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1">
              Total: {formNovoAndar.aptos_por_andar} apartamentos no {formatarNomeAndar(formNovoAndar.andar)} com {formNovoAndar.aptos_por_andar * formNovoAndar.vagas_por_apto} vaga(s) de {formNovoAndar.metragem_vaga} m² cada.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao
              variante="secundario"
              type="button"
              onClick={() => {
                setModalAndarAberto(false);
                setBlocoAlvoAndar(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" disabled={processando} className="!bg-purple-600 hover:!bg-purple-700 text-white">
              {processando ? 'Gerando Andar...' : `Gerar ${formatarNomeAndar(formNovoAndar.andar)}`}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: MUDAR NÚMERO DO ANDAR                                            */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalMudarAndarAberto}
        fechar={() => {
          setModalMudarAndarAberto(false);
          setAndarRenomeando(null);
        }}
        titulo={`Mudar ${formatarNomeAndar(andarRenomeando?.andar_atual || 0)}`}
      >
        <form onSubmit={handleRenomearAndar} className="space-y-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Altera o número do andar para todas as unidades atualmente alocadas no <strong>{formatarNomeAndar(andarRenomeando?.andar_atual || 0)}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Novo Número do Andar (0 = Térreo) *
            </label>
            <input
              type="number"
              min={0}
              max={60}
              required
              value={andarRenomeando?.novo_andar || 0}
              onChange={e =>
                setAndarRenomeando(prev => prev ? { ...prev, novo_andar: Number(e.target.value) } : null)
              }
              className="w-full rounded-lg border border-purple-300 dark:border-purple-800 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao
              variante="secundario"
              type="button"
              onClick={() => {
                setModalMudarAndarAberto(false);
                setAndarRenomeando(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" disabled={processando}>
              {processando ? 'Salvando...' : 'Salvar Novo Andar'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: VAGA DE GARAGEM COM METRAGEM                                     */}
      {/* ========================================================================= */}
      <Modal
        aberto={modalVagaAberto}
        fechar={() => {
          setModalVagaAberto(false);
          setVagaEditando(null);
          setUnidadeAlvoVaga(null);
        }}
        titulo={
          vagaEditando
            ? `Editar Vaga ${vagaEditando.identificacao}`
            : `Adicionar Vaga ao Apto ${unidadeAlvoVaga?.numero_apartamento || ''}`
        }
      >
        <form onSubmit={handleSalvarVaga} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Identificação da Vaga *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: G-101, V-04"
                value={formVaga.identificacao}
                onChange={e => setFormVaga({ ...formVaga, identificacao: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                Metragem Útil (m²) *
              </label>
              <input
                type="number"
                step="0.05"
                min="1"
                required
                value={formVaga.metragem_m2}
                onChange={e => setFormVaga({ ...formVaga, metragem_m2: Number(e.target.value) })}
                className="w-full rounded-lg border border-purple-300 dark:border-purple-800 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pavimento
              </label>
              <select
                value={formVaga.pavimento}
                onChange={e => setFormVaga({ ...formVaga, pavimento: e.target.value as any })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="TERREO">Térreo</option>
                <option value="SUBSOLO_1">1º Subsolo</option>
                <option value="SUBSOLO_2">2º Subsolo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo da Vaga
              </label>
              <select
                value={formVaga.tipo_vaga}
                onChange={e => setFormVaga({ ...formVaga, tipo_vaga: e.target.value as any })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="SIMPLES">Simples (1 veículo)</option>
                <option value="DUPLA">Dupla (2 veículos gaveta)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formVaga.coberta}
                onChange={e => setFormVaga({ ...formVaga, coberta: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
              Vaga Coberta
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Botao
              variante="secundario"
              type="button"
              onClick={() => {
                setModalVagaAberto(false);
                setVagaEditando(null);
                setUnidadeAlvoVaga(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" disabled={processando}>
              {processando ? 'Salvando...' : 'Salvar Vaga'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DETALHES, MORADORES E ATIVIDADES DO APARTAMENTO                    */}
      {/* ========================================================================= */}
      <Modal
        aberto={unidadeDetalhesMoradores !== null}
        fechar={() => setUnidadeDetalhesMoradores(null)}
        titulo={`Apartamento ${unidadeDetalhesMoradores?.numero_apartamento} • ${blocoSelecionado?.nome || 'Bloco'}`}
        largura="max-w-2xl"
        rodape={
          <div className="flex items-center justify-between w-full">
            <Botao
              variante="secundario"
              tamanho="sm"
              onClick={() => {
                setUnidadeDetalhesMoradores(null);
                navigate(somenteLeitura ? '/sindico/pessoas' : '/superadmin/pessoas');
              }}
            >
              <Icone nome="user" className="w-3.5 h-3.5 mr-1.5" />
              Gestão de Pessoas
            </Botao>
            <Botao
              variante="primario"
              tamanho="sm"
              onClick={() => setUnidadeDetalhesMoradores(null)}
            >
              Fechar
            </Botao>
          </div>
        }
      >
        {unidadeDetalhesMoradores && (
          <div className="space-y-4">
            {/* Cabeçalho informativo do apartamento */}
            <div className="rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                  {unidadeDetalhesMoradores.numero_apartamento}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Apto {unidadeDetalhesMoradores.numero_apartamento} - {formatarNomeAndar(unidadeDetalhesMoradores.andar)}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Bloco {blocoSelecionado?.nome} • {unidadeDetalhesMoradores.vagas.length} vaga(s) de garagem
                  </p>
                </div>
              </div>

              <div>
                {unidadeDetalhesMoradores.moradores && unidadeDetalhesMoradores.moradores.length > 0 ? (
                  <Badge tipo="sucesso">
                    {unidadeDetalhesMoradores.moradores.length} {unidadeDetalhesMoradores.moradores.length === 1 ? 'perfil vinculado' : 'perfis vinculados'}
                  </Badge>
                ) : (
                  <Badge tipo="neutro">Apartamento Vago</Badge>
                )}
              </div>
            </div>

            {/* Vagas do Apartamento (se houver) */}
            {unidadeDetalhesMoradores.vagas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400 px-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Icone nome="car" className="w-3.5 h-3.5 text-sky-500" /> Vagas:
                </span>
                {unidadeDetalhesMoradores.vagas.map(v => (
                  <span
                    key={v.id_vaga}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                  >
                    Vaga {v.identificacao} ({v.metragem_m2} m² • {formatarPavimento(v.pavimento)})
                  </span>
                ))}
              </div>
            )}

            {/* Navegação por Abas: Moradores vs Reservas do Apartamento Inteiro */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setAbaUnidadeDetalhes('moradores')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  abaUnidadeDetalhes === 'moradores'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icone nome="users" className="w-3.5 h-3.5" />
                <span>Moradores & Perfis</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-800 text-[10px] font-bold">
                  {unidadeDetalhesMoradores.moradores?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAbaUnidadeDetalhes('atividades');
                  if (!atividadesUnidade) {
                    carregarAtividadesUnidade(unidadeDetalhesMoradores.id_unidade);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  abaUnidadeDetalhes === 'atividades'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icone nome="calendar" className="w-3.5 h-3.5" />
                <span>Atividades & Reservas do Apto</span>
                {atividadesUnidade && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-800 text-[10px] font-bold">
                    {atividadesUnidade.total_reservas}
                  </span>
                )}
              </button>
            </div>

            {/* ABA 1: Perfis e Moradores */}
            {abaUnidadeDetalhes === 'moradores' && (
              <>
                {(!unidadeDetalhesMoradores.moradores || unidadeDetalhesMoradores.moradores.length === 0) ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Icone nome="users" className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhum morador vinculado
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Este apartamento está registrado como <strong>Vago</strong>. Não há proprietário, inquilino ou dependentes com ocupação ativa nesta unidade.
                    </p>
                    <div className="mt-4">
                      <Botao
                        variante="secundario"
                        tamanho="sm"
                        onClick={() => {
                          setUnidadeDetalhesMoradores(null);
                          navigate(somenteLeitura ? '/sindico/pessoas' : '/superadmin/pessoas');
                        }}
                      >
                        <Icone nome="plus" className="w-3.5 h-3.5 mr-1" />
                        Cadastrar/Vincular Morador
                      </Botao>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {/* 1. Proprietário(s) */}
                    {(() => {
                      const props = unidadeDetalhesMoradores.moradores!.filter(m => m.tipo_vinculo === 'PROPRIETARIO');
                      if (props.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 pt-1">
                            <Icone nome="shield" className="w-3.5 h-3.5" />
                            <span>Proprietário(s)</span>
                          </div>
                          {props.map(m => renderCardMorador(m, 'border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20'))}
                        </div>
                      );
                    })()}

                    {/* 2. Inquilino(s) */}
                    {(() => {
                      const inqs = unidadeDetalhesMoradores.moradores!.filter(m => m.tipo_vinculo === 'INQUILINO');
                      if (inqs.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 pt-1">
                            <Icone nome="home" className="w-3.5 h-3.5" />
                            <span>Inquilino(s)</span>
                          </div>
                          {inqs.map(m => renderCardMorador(m, 'border-blue-200/80 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20'))}
                        </div>
                      );
                    })()}

                    {/* 3. Dependentes */}
                    {(() => {
                      const deps = unidadeDetalhesMoradores.moradores!.filter(m => m.tipo_vinculo === 'DEPENDENTE');
                      if (deps.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 pt-1">
                            <Icone nome="users" className="w-3.5 h-3.5" />
                            <span>Dependentes</span>
                          </div>
                          {deps.map(m => renderCardMorador(m, 'border-purple-200/80 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/20'))}
                        </div>
                      );
                    })()}

                    {/* 4. Outros Vínculos (Visitantes / Prestadores) */}
                    {(() => {
                      const outros = unidadeDetalhesMoradores.moradores!.filter(
                        m => !['PROPRIETARIO', 'INQUILINO', 'DEPENDENTE'].includes(m.tipo_vinculo)
                      );
                      if (outros.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 pt-1">
                            <Icone nome="user" className="w-3.5 h-3.5" />
                            <span>Outros Vínculos</span>
                          </div>
                          {outros.map(m => renderCardMorador(m, 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40'))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {/* ABA 2: Atividades & Reservas do Apartamento Inteiro */}
            {abaUnidadeDetalhes === 'atividades' && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {carregandoAtividadesUnidade ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Carregando atividades e histórico de reservas do apartamento...
                  </div>
                ) : !atividadesUnidade || atividadesUnidade.total_reservas === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                      <Icone nome="calendar" className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhuma reserva ou atividade registrada
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Os moradores deste apartamento ainda não realizaram reservas de áreas comuns (churrasqueiras, salão de festas, etc.).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 1. Atividade ativa acontecendo neste momento */}
                    {atividadesUnidade.atividade_agora && atividadesUnidade.atividade_agora.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Em Uso Ativo Agora</span>
                        </div>
                        {atividadesUnidade.atividade_agora.map((r: any) => (
                          <div
                            key={r.id_reserva}
                            className="rounded-xl border border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {r.area}
                                </span>
                                <Badge tipo="sucesso">Em Andamento</Badge>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 mt-1">
                                <strong>Horário:</strong> {formatarHora(r.data_hora_inicio)} às {formatarHora(r.data_hora_fim)} • {r.numero_pessoas} pessoas
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                                Reservado por: <strong>{r.morador_nome}</strong> ({r.tipo_vinculo})
                              </p>
                            </div>
                            <Botao
                              variante="claro"
                              tamanho="sm"
                              onClick={() => abrirPerfilUsuario(r.id_pessoa)}
                            >
                              Ver Perfil
                            </Botao>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 2. Próximas reservas agendadas */}
                    {atividadesUnidade.proximas_reservas && atividadesUnidade.proximas_reservas.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 pt-1">
                          <Icone nome="calendar" className="w-3.5 h-3.5" />
                          <span>Próximas Reservas Agendadas ({atividadesUnidade.proximas_reservas.length})</span>
                        </div>
                        <div className="space-y-2">
                          {atividadesUnidade.proximas_reservas.map((r: any) => (
                            <div
                              key={r.id_reserva}
                              className="rounded-xl border border-sky-200/80 bg-sky-50/40 dark:border-sky-900/40 dark:bg-sky-950/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                    {r.area}
                                  </span>
                                  <Badge tipo="info">Agendada</Badge>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                  <strong>Data:</strong> {formatarData(r.data_hora_inicio)} • {formatarHora(r.data_hora_inicio)} às {formatarHora(r.data_hora_fim)} • {r.numero_pessoas} pessoa(s)
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                                  Morador responsável: <strong>{r.morador_nome}</strong> ({r.tipo_vinculo})
                                </p>
                              </div>
                              <Botao
                                variante="claro"
                                tamanho="sm"
                                onClick={() => abrirPerfilUsuario(r.id_pessoa)}
                              >
                                Ver Morador
                              </Botao>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Histórico recente de reservas */}
                    {atividadesUnidade.historico_reservas && atividadesUnidade.historico_reservas.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 pt-1">
                          <Icone nome="clock" className="w-3.5 h-3.5" />
                          <span>Histórico Recente de Reservas ({atividadesUnidade.historico_reservas.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {atividadesUnidade.historico_reservas.map((r: any) => (
                            <div
                              key={r.id_reserva}
                              className="rounded-lg border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 p-2.5 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {r.area}
                                  </span>
                                  <Badge tipo={r.status === 'CANCELADA' ? 'perigo' : 'neutro'}>
                                    {r.status === 'CANCELADA' ? 'Cancelada' : 'Concluída'}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {formatarData(r.data_hora_inicio)} • {formatarHora(r.data_hora_inicio)} - {formatarHora(r.data_hora_fim)} · Reservado por {r.morador_nome}
                                </p>
                                {r.motivo_cancelamento && (
                                  <p className="text-[10px] text-red-500 italic mt-0.5">
                                    Cancelamento: {r.motivo_cancelamento}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => abrirPerfilUsuario(r.id_pessoa)}
                                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0 cursor-pointer"
                              >
                                Ver ➔
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PERFIL DO USUÁRIO & ÁRVORE FAMILIAR (COMPONENTE COMPARTILHADO)     */}
      {/* ========================================================================= */}
      <ModalPerfilUsuario
        aberto={modalPerfilUsuarioAberto}
        fechar={() => setModalPerfilUsuarioAberto(false)}
        pessoa={perfilUsuarioSelecionado}
        carregando={perfilCarregando}
        aoEditar={(p) => {
          if (aoEditarPessoa) {
            aoEditarPessoa(p);
          } else {
            navigate('/superadmin/pessoas');
          }
        }}
        aoVerAtividades={(p) => setPessoaAtividadeModal(p)}
        aoAdicionarDependente={(titular, idUnidade) => {
          if (aoAdicionarDependente) {
            aoAdicionarDependente(titular, idUnidade);
          } else {
            navigate('/superadmin/pessoas');
          }
        }}
        aoNavegarParaPessoa={(id) => abrirPerfilUsuario(id)}
        aoBloquear={aoBloquear}
        aoInativar={aoInativar}
        aoReativar={aoReativar}
        aoExcluir={aoExcluir}
        somenteLeitura={somenteLeitura}
      />

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DE ATIVIDADE E RESERVAS DA PESSOA                         */}
      {/* ========================================================================= */}
      {pessoaAtividadeModal && (
        <ModalAtividadePessoa
          pessoa={pessoaAtividadeModal}
          fechar={() => setPessoaAtividadeModal(null)}
        />
      )}

      {/* Confirmação de Exclusão */}
      <ModalConfirmacao
        aberto={confirmacaoExclusao !== null}
        titulo={confirmacaoExclusao?.titulo || 'Confirmar Exclusão'}
        mensagem={confirmacaoExclusao?.mensagem || ''}
        confirmar={handleConfirmarExclusao}
        fechar={() => setConfirmacaoExclusao(null)}
        carregando={processando}
      />
    </div>
  );
}
