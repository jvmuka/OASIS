import { useEffect, useState } from 'react';
import { api, sessaoAtual } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState } from '../../components/ui';
import Calendario from '../../components/Calendario';

type Area = {
  id_area_comum: number;
  nome: string;
  capacidade: number;
  ativo: boolean;
  duracao_slot_min: number;
  antecedencia_minima_dias: number;
  antecedencia_minima_horas?: number;
  antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number;
  limite_reservas_semana: number;
  imagem_url?: string | null;
};

type Slot = { inicio: string; fim: string; status: 'LIVRE' | 'OCUPADO' | 'BLOQUEADO' | 'PASSADO' };
type Grade = { dia_semana: string; regras: any; slots: Slot[] };

/** UC02 + UC03: Nova Reserva de Área Comum (UI/UX Pro Max) */
export default function NovaReserva() {
  const s = sessaoAtual()!;
  const unidade = s.unidades[0];
  const [areas, setAreas] = useState<Area[]>([]);
  const [area, setArea] = useState<Area | null>(null);
  const [data, setData] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [pessoas, setPessoas] = useState(1);
  const [carregandoGrade, setCarregandoGrade] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  useEffect(() => {
    api.get<Area[]>('/areas').then(a => setAreas(a.filter(x => x.ativo)));
  }, []);

  async function consultar(d: string) {
    setData(d);
    setSlot(null);
    setGrade(null);
    setMsg({ t: '', tipo: 'ok' });
    if (!area || !d) return;
    setCarregandoGrade(true);
    try {
      const res = await api.get<Grade>(`/reservas/disponibilidade?area=${area.id_area_comum}&data=${d}`);
      setGrade(res);
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setCarregandoGrade(false);
    }
  }

  async function confirmar() {
    if (!area || !slot) return;
    setConfirmando(true);
    try {
      await api.post('/reservas', {
        id_area_comum: area.id_area_comum,
        data,
        inicio: slot.inicio,
        fim: slot.fim,
        numero_pessoas: pessoas,
      });
      setMsg({
        t: `Reserva confirmada com sucesso para "${area.nome}" no dia ${data} das ${slot.inicio} às ${slot.fim}.`,
        tipo: 'ok',
      });
      consultar(data);
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setConfirmando(false);
    }
  }

  function limitesData() {
    if (!area) return {};
    const hoje = new Date();
    const min = new Date(hoje);
    const antMinHoras = area.antecedencia_minima_horas ?? (area.antecedencia_minima_dias * 24);
    min.setHours(min.getHours() + antMinHoras);

    const max = new Date(hoje);
    max.setDate(max.getDate() + area.antecedencia_maxima_dias);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      minDate: `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`,
      maxDate: `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`,
    };
  }

  function voltar() {
    setArea(null);
    setGrade(null);
    setSlot(null);
    setData('');
    setMsg({ t: '', tipo: 'ok' });
  }

  return (
    <div className="space-y-6">
      <Titulo
        sub="Selecione um espaço coletivo, consulte o calendário e reserve seus horários."
        icone={<Icone nome="calendar" className="h-5 w-5" />}
        acao={
          <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3.5 py-1.5 text-xs text-slate-600 font-medium">
            <Icone nome="user" className="h-3.5 w-3.5 text-slate-400" />
            <span>
              <b>{s.pessoa.nome}</b>
              {unidade && ` • Bloco ${unidade.bloco}, Apto ${unidade.numero_apartamento}`}
            </span>
          </div>
        }
      >
        Nova Reserva de Área
      </Titulo>

      {/* Passo 1: Seleção de Área */}
      {!area && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Escolha a Área Comum ({areas.length} disponíveis)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map(a => (
              <Cartao
                key={a.id_area_comum}
                className="group cursor-pointer overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-card-hover"
              >
                <div onClick={() => { setArea(a); setPessoas(Math.min(pessoas, a.capacidade)); }}>
                  {/* Foto da Área */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    {a.imagem_url ? (
                      <img
                        src={a.imagem_url}
                        alt={a.nome}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                        <Icone nome="building" className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="text-xs font-semibold backdrop-blur-xs bg-black/30 rounded-md px-2 py-0.5">
                        Capacidade: {a.capacidade} pessoas
                      </span>
                    </div>
                  </div>

                  {/* Informações da Área */}
                  <div className="p-4">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-navy transition-colors">
                      {a.nome}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                        Antecedência: {a.antecedencia_minima_dias} a {a.antecedencia_maxima_dias}d
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                        Máx. {a.limite_reservas_semana}x/sem
                      </span>
                    </div>
                  </div>
                </div>
              </Cartao>
            ))}
          </div>
        </div>
      )}

      {/* Passo 2: Calendário e Seleção de Horários */}
      {area && (
        <div className="w-full max-w-4xl animate-fade-in space-y-3">
          <button
            type="button"
            onClick={voltar}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-navy transition-colors cursor-pointer"
          >
            <Icone nome="chevronLeft" className="h-4 w-4" />
            Voltar para lista de áreas
          </button>

          <Cartao>
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {area.imagem_url && (
                  <img
                    src={area.imagem_url}
                    alt={area.nome}
                    className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{area.nome}</h3>
                  <p className="text-xs text-slate-500">
                    Capacidade máxima: <b>{area.capacidade} pessoas</b> • Cancelamento até <b>{area.prazo_cancelamento_horas}h</b> antes
                  </p>
                </div>
              </div>
              <Botao
                variante="claro"
                tamanho="sm"
                icone={<Icone nome="chevronLeft" className="h-3.5 w-3.5" />}
                onClick={voltar}
              >
                Voltar
              </Botao>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
              {/* Coluna Esquerda: Calendário & Regras */}
              <div className="space-y-4 md:col-span-6">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Selecione a Data Desejada
                  </p>
                  <Calendario
                    dataSelecionada={data}
                    onChange={d => consultar(d)}
                    {...limitesData()}
                  />
                </div>

                <Campo rotulo="Número de Pessoas Presentes" obrigatorio>
                  <input
                    type="number"
                    min={1}
                    max={area.capacidade}
                    className={inputCls}
                    value={pessoas}
                    onChange={e => setPessoas(Math.max(1, Math.min(area.capacidade, Number(e.target.value) || 1)))}
                  />
                </Campo>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-navy">Regras deste Espaço:</p>
                  <ul className="list-inside list-disc space-y-0.5 text-slate-500">
                    <li>Antecedência: {area.antecedencia_minima_dias} a {area.antecedencia_maxima_dias} dias.</li>
                    <li>Cancelamento permitido até {area.prazo_cancelamento_horas} horas antes do início.</li>
                    <li>Limite de {area.limite_reservas_semana} reserva(s) semanais por unidade.</li>
                  </ul>
                </div>
              </div>

              {/* Coluna Direita: Grade de Horários */}
              <div className="flex flex-col justify-between md:col-span-6 md:border-l md:border-slate-100 md:pl-6">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Escolha o Horário ({data ? `${data} - ${grade?.dia_semana || ''}` : 'Nenhuma data selecionada'})
                  </p>

                  {!data && (
                    <EmptyState
                      icone="calendar"
                      titulo="Selecione uma data no calendário"
                      descricao="Os horários disponíveis e ocupados serão exibidos aqui."
                    />
                  )}

                  {carregandoGrade && (
                    <div className="flex h-40 items-center justify-center text-xs text-slate-400">
                      <Icone nome="clock" className="mr-2 h-4 w-4 animate-spin text-navy" />
                      Consultando disponibilidade...
                    </div>
                  )}

                  {data && !carregandoGrade && grade && grade.slots.length === 0 && (
                    <EmptyState
                      icone="alert"
                      titulo="Área Fechada"
                      descricao="Este espaço não possui horários de funcionamento no dia da semana selecionado."
                    />
                  )}

                  {data && !carregandoGrade && grade && grade.slots.length > 0 && (
                    <div className="grid max-h-72 grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1">
                      {grade.slots.map(sl => {
                        const sel = slot?.inicio === sl.inicio;
                        const dataHoraSlot = new Date(`${data}T${sl.inicio}:00`);
                        const agora = new Date();
                        const noPassado = dataHoraSlot <= agora || sl.status === 'PASSADO';
                        const livre = !noPassado && sl.status === 'LIVRE';
                        const ocupado = !noPassado && sl.status === 'OCUPADO';
                        const rotuloStatus = livre
                          ? 'LIVRE'
                          : ocupado
                          ? 'OCUPADO'
                          : 'INDISPONÍVEL';

                        return (
                          <button
                            key={sl.inicio}
                            disabled={!livre}
                            onClick={() => setSlot(sl)}
                            className={
                              'flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold transition-all ' +
                              (sel
                                ? 'border-navy bg-navy text-white shadow-sm ring-2 ring-navy/20 cursor-pointer'
                                : livre
                                ? 'border-slate-200 bg-white text-slate-700 hover:border-navy hover:bg-navy-50/40 cursor-pointer'
                                : ocupado
                                ? 'cursor-not-allowed border-amber-200/90 bg-amber-50/80 text-amber-900'
                                : 'cursor-not-allowed border-red-200/90 bg-red-50/80 text-red-900')
                            }
                          >
                            <span>{sl.inicio} – {sl.fim}</span>
                            <span
                              className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${
                                sel
                                  ? 'bg-white/20 text-white'
                                  : livre
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : ocupado
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300/70'
                                  : 'bg-red-100 text-red-700 border border-red-200/80'
                              }`}
                            >
                              {rotuloStatus}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Botão de Confirmação */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  {slot && (
                    <div className="mb-3 rounded-xl bg-navy-50/70 p-3 text-xs text-navy font-medium">
                      Resumo: <b>{area.nome}</b> em <b>{data}</b> das <b>{slot.inicio} às {slot.fim}</b> ({pessoas} pessoas).
                    </div>
                  )}
                  <div className="flex gap-2.5">
                    <Botao
                      variante="claro"
                      className="w-1/3 py-2.5"
                      onClick={voltar}
                      icone={<Icone nome="chevronLeft" className="h-3.5 w-3.5" />}
                    >
                      Voltar
                    </Botao>
                    <Botao
                      className="w-2/3 py-2.5"
                      disabled={!slot}
                      carregando={confirmando}
                      onClick={confirmar}
                      icone={<Icone nome="check" className="h-4 w-4" />}
                    >
                      Confirmar Reserva
                    </Botao>
                  </div>
                </div>
              </div>
            </div>

            <Mensagem texto={msg.t} tipo={msg.tipo} />
          </Cartao>
        </div>
      )}
    </div>
  );
}
