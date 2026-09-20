import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal } from '../../components/ui';

type Area = {
  id_area_comum: number;
  nome: string;
  descricao?: string;
  capacidade: number;
  ativo: boolean;
  requer_reserva?: boolean;
  status_livre?: 'LIVRE' | 'EM_USO';
  status_livre_atualizado_em?: string;
  status_livre_observacao?: string;
  status_livre_porteiro?: string;
  imagem_url?: string | null;
  horarios?: { dia_semana: string; hora_inicio: string; hora_fim: string }[];
};

export function formatarDiasSemana(horarios?: { dia_semana: string }[]): string {
  if (!horarios || horarios.length === 0) return 'Todos os dias';
  const diasAtivos = new Set(horarios.map(h => h.dia_semana));
  if (diasAtivos.size === 7) return 'Todos os dias';
  const semana = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const fimDeSemana = ['SABADO', 'DOMINGO'];
  const sexADom = ['SEXTA', 'SABADO', 'DOMINGO'];

  if (semana.every(d => diasAtivos.has(d)) && diasAtivos.size === 5) return 'Segunda a Sexta';
  if (fimDeSemana.every(d => diasAtivos.has(d)) && diasAtivos.size === 2) return 'Fins de Semana (Sáb e Dom)';
  if (sexADom.every(d => diasAtivos.has(d)) && diasAtivos.size === 3) return 'Sexta a Domingo';

  const NOMES_CURTOS: Record<string, string> = {
    DOMINGO: 'Dom',
    SEGUNDA: 'Seg',
    TERCA: 'Ter',
    QUARTA: 'Qua',
    QUINTA: 'Qui',
    SEXTA: 'Sex',
    SABADO: 'Sáb',
  };
  const ordem = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  return ordem
    .filter(d => diasAtivos.has(d))
    .map(d => NOMES_CURTOS[d])
    .join(', ');
}

/**
 * Tela da Portaria para Gerenciamento de Áreas de Uso Livre (Sem Agendamento).
 * Permite ao porteiro alternar o status (LIVRE / EM_USO) e registrar observações ao vivo.
 */
export default function AreasLivres() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoObs, setEditandoObs] = useState<Area | null>(null);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  async function carregar() {
    setCarregando(true);
    try {
      const res = await api.get<Area[]>('/areas');
      // Filtra apenas áreas ativas e que NÃO requerem reserva (requer_reserva === false)
      setAreas(res.filter(a => a.ativo && a.requer_reserva === false));
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarStatus(area: Area, novoStatus: 'LIVRE' | 'EM_USO') {
    try {
      await api.patch(`/areas/${area.id_area_comum}/status-livre`, {
        status_livre: novoStatus,
        observacao: area.status_livre_observacao || undefined,
      });
      setMsg({
        t: `Status de "${area.nome}" alterado para ${novoStatus === 'EM_USO' ? 'EM USO' : 'LIVRE'}.`,
        tipo: 'ok',
      });
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    }
  }

  async function salvarObservacao() {
    if (!editandoObs) return;
    setSalvandoObs(true);
    try {
      await api.patch(`/areas/${editandoObs.id_area_comum}/status-livre`, {
        status_livre: editandoObs.status_livre || 'LIVRE',
        observacao: novaObservacao.trim(),
      });
      setMsg({ t: `Observação de "${editandoObs.nome}" atualizada com sucesso.`, tipo: 'ok' });
      setEditandoObs(null);
      setNovaObservacao('');
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setSalvandoObs(false);
    }
  }

  const totalLivres = areas.filter(a => (a.status_livre || 'LIVRE') === 'LIVRE').length;
  const totalEmUso = areas.filter(a => a.status_livre === 'EM_USO').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Titulo
        sub="Monitore e atualize a ocupação em tempo real dos espaços coletivos que não exigem agendamento prévio."
        icone={<Icone nome="building" className="h-5 w-5" />}
        acao={
          <Botao
            variante="claro"
            tamanho="sm"
            icone={<Icone nome="filter" className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />}
            onClick={carregar}
            disabled={carregando}
          >
            Atualizar
          </Botao>
        }
      >
        Áreas de Uso Livre
      </Titulo>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Áreas Livres</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{areas.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-400">
            <Icone nome="building" className="h-5 w-5" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Livres Agora</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalLivres}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Icone nome="check" className="h-5 w-5" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Em Uso no Momento</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalEmUso}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Icone nome="alert" className="h-5 w-5" />
          </div>
        </Cartao>
      </div>

      {/* Listagem das Áreas de Uso Livre */}
      {areas.length === 0 ? (
        <EmptyState
          icone="building"
          titulo="Nenhuma área de uso livre cadastrada"
          descricao="Espaços como academia, piscina ou playground podem ser cadastrados pelo síndico marcando a opção 'Uso Livre (Sem Reserva)'."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {areas.map(a => {
            const emUso = a.status_livre === 'EM_USO';

            return (
              <Cartao
                key={a.id_area_comum}
                className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  {/* Foto e Badge ao Vivo */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {a.imagem_url ? (
                      <img src={a.imagem_url} alt={a.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400">
                        <Icone nome="building" className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />

                    {/* Status ao Vivo */}
                    <div className="absolute top-3 right-3">
                      {emUso ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/95 text-white text-xs font-bold px-3 py-1 backdrop-blur-xs shadow-md">
                          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                          EM USO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/95 text-white text-xs font-bold px-3 py-1 backdrop-blur-xs shadow-md">
                          <span className="h-2 w-2 rounded-full bg-white" />
                          LIVRE
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-xs font-semibold backdrop-blur-xs bg-black/40 rounded-md px-2 py-0.5">
                        Capacidade: {a.capacidade} pessoas
                      </span>
                    </div>
                  </div>

                  {/* Informações e Detalhes */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{a.nome}</h3>
                        <span className="rounded-md bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 text-[10px] font-bold">
                          Acesso Livre
                        </span>
                      </div>
                      {a.descricao && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {a.descricao}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-800/40 p-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Icone nome="clock" className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Funcionamento: <b>{formatarDiasSemana(a.horarios)}</b></span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Observação ao vivo:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoObs(a);
                              setNovaObservacao(a.status_livre_observacao || '');
                            }}
                            className="text-[11px] font-bold text-navy hover:underline dark:text-sky-400 cursor-pointer"
                          >
                            {a.status_livre_observacao ? 'Editar' : '+ Adicionar'}
                          </button>
                        </div>
                        {a.status_livre_observacao ? (
                          <p className="text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/60 italic font-medium">
                            "{a.status_livre_observacao}"
                          </p>
                        ) : (
                          <p className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                            Nenhuma observação registrada no momento.
                          </p>
                        )}
                      </div>

                      {a.status_livre_atualizado_em && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                          Última atualização: {new Date(a.status_livre_atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({new Date(a.status_livre_atualizado_em).toLocaleDateString('pt-BR')}) por {a.status_livre_porteiro || 'Portaria'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas do Porteiro */}
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                  <div className="pt-3">
                    {emUso ? (
                      <Botao
                        variante="sucesso"
                        className="w-full justify-center py-2 text-xs font-bold"
                        icone={<Icone nome="check" className="h-4 w-4" />}
                        onClick={() => alternarStatus(a, 'LIVRE')}
                      >
                        Liberar Espaço (Marcar como Livre)
                      </Botao>
                    ) : (
                      <Botao
                        className="w-full justify-center py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                        icone={<Icone nome="alert" className="h-4 w-4" />}
                        onClick={() => alternarStatus(a, 'EM_USO')}
                      >
                        Marcar como Em Uso Agora
                      </Botao>
                    )}
                  </div>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      {/* Modal para Editar Observação da Área Livre */}
      <Modal
        aberto={Boolean(editandoObs)}
        fechar={() => {
          setEditandoObs(null);
          setNovaObservacao('');
        }}
        titulo={`Observação para "${editandoObs?.nome}"`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Esta observação será exibida em tempo real para os moradores que consultarem o status deste espaço (ex: "8 pessoas no local", "Aula em andamento", "Piso molhado").
          </p>

          <Campo rotulo="Texto da Observação">
            <input
              type="text"
              maxLength={255}
              placeholder="Ex: Em uso com 5 moradores; liberando em breve"
              value={novaObservacao}
              onChange={e => setNovaObservacao(e.target.value)}
              className={inputCls}
            />
          </Campo>

          <div className="flex justify-end gap-2 pt-2">
            <Botao
              variante="claro"
              onClick={() => {
                setEditandoObs(null);
                setNovaObservacao('');
              }}
            >
              Cancelar
            </Botao>
            <Botao
              onClick={salvarObservacao}
              carregando={salvandoObs}
              icone={<Icone nome="check" className="h-4 w-4" />}
            >
              Salvar Observação
            </Botao>
          </div>
        </div>
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
