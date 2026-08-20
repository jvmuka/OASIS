import { useEffect, useState } from 'react';
import { api, sessaoAtual } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';
import Calendario from '../../components/Calendario';

type Area = {
  id_area_comum: number; nome: string; capacidade: number; ativo: boolean;
  antecedencia_minima_dias: number; antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number; limite_reservas_semana: number;
  imagem_url?: string | null;
};
type Slot = { inicio: string; fim: string; status: 'LIVRE' | 'OCUPADO' | 'BLOQUEADO' | 'PASSADO' };
type Grade = { dia_semana: string; regras: any; slots: Slot[] };

/** Imagens padrao por nome de area, usadas quando nao ha imagem cadastrada. */
const iconesPadrao: Record<string, string> = {
  'Academia': '🏋️',
  'Piscina': '🏊',
  'Salao de Festas': '🎉',
  'Churrasqueira': '🔥',
  'Elevador de Servico': '🛗',
};

/**
 * UC02 + UC03: escolher a area, consultar a grade de horarios e reservar.
 * A tela identifica em nome de quem a reserva e feita (observacao da banca)
 * e apenas EXIBE as regras; quem as valida de verdade sao os gatilhos do banco.
 */
export default function NovaReserva() {
  const s = sessaoAtual()!;
  const unidade = s.unidades[0];
  const [areas, setAreas] = useState<Area[]>([]);
  const [area, setArea] = useState<Area | null>(null);
  const [data, setData] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [pessoas, setPessoas] = useState(1);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  useEffect(() => { api.get<Area[]>('/areas').then(a => setAreas(a.filter(x => x.ativo))); }, []);

  async function consultar(d: string) {
    setData(d); setSlot(null); setGrade(null); setMsg({ t: '', tipo: 'ok' });
    if (!area || !d) return;
    try { setGrade(await api.get<Grade>(`/reservas/disponibilidade?area=${area.id_area_comum}&data=${d}`)); }
    catch (e: any) { setMsg({ t: e.message, tipo: 'erro' }); }
  }

  async function confirmar() {
    if (!area || !slot) return;
    try {
      await api.post('/reservas', {
        id_area_comum: area.id_area_comum, data,
        inicio: slot.inicio, fim: slot.fim, numero_pessoas: pessoas,
      });
      setMsg({ t: `Reserva confirmada: ${area.nome}, ${data}, ${slot.inicio}–${slot.fim}.`, tipo: 'ok' });
      consultar(data); // atualiza a grade
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' }); // mensagens RN01..RN07 chegam aqui
    }
  }

  /** Calcula a data minima e maxima permitida pela antecedencia da area. */
  function limitesData() {
    if (!area) return {};
    const hoje = new Date();
    const min = new Date(hoje);
    min.setDate(min.getDate() + area.antecedencia_minima_dias);
    const max = new Date(hoje);
    max.setDate(max.getDate() + area.antecedencia_maxima_dias);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      minDate: `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`,
      maxDate: `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`,
    };
  }

  return (
    <div>
      <Titulo sub="Selecione uma área e escolha o horário desejado">Reserva de Áreas Comuns</Titulo>
      <p className="mb-4 text-sm text-slate-600">
        Reserva em nome de: <b>{s.pessoa.nome}</b>
        {unidade && <> — Bloco {unidade.bloco}, Apto {unidade.numero_apartamento}</>} (Morador)
      </p>

      {!area && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map(a => (
            <Cartao key={a.id_area_comum} className="cursor-pointer overflow-hidden transition-shadow hover:border-navy hover:shadow-md">
              <div onClick={() => setArea(a)}>
                {/* Imagem da area */}
                {a.imagem_url ? (
                  <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden">
                    <img
                      src={a.imagem_url}
                      alt={a.nome}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                ) : (
                  <div className="relative -mx-5 -mt-5 mb-4 flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-5xl">{iconesPadrao[a.nome] || '🏢'}</span>
                  </div>
                )}
                <h3 className="font-semibold text-navy">{a.nome}</h3>
                <p className="mt-1 text-xs text-slate-500">Capacidade: {a.capacidade} pessoas</p>
                <p className="text-xs text-slate-500">Antecedência: {a.antecedencia_minima_dias} a {a.antecedencia_maxima_dias} dias</p>
              </div>
            </Cartao>
          ))}
        </div>
      )}

      {area && (
        <div className="w-full max-w-4xl">
          <Cartao>
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-semibold text-navy">{area.nome}</h3>
                <p className="text-xs text-slate-500">Capacidade: {area.capacidade} pessoas</p>
              </div>
              <Botao variante="claro" onClick={() => { setArea(null); setGrade(null); setSlot(null); setData(''); }}>Voltar</Botao>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {/* Calendario mensal */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-600">Selecione a data</p>
                  <Calendario
                    dataSelecionada={data}
                    onChange={d => consultar(d)}
                    {...limitesData()}
                  />
                </div>
                <Campo rotulo="Número de pessoas">
                  <input type="number" min={1} max={area.capacidade} className={inputCls} value={pessoas}
                    onChange={e => setPessoas(Number(e.target.value))} />
                </Campo>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                  <p className="mb-1 font-semibold text-navy">Regras de reserva</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    <li>Antecedência: {area.antecedencia_minima_dias} a {area.antecedencia_maxima_dias} dias</li>
                    <li>Capacidade máxima: {area.capacidade} pessoas</li>
                    <li>Cancelamento até {area.prazo_cancelamento_horas}h antes</li>
                    <li>Máximo {area.limite_reservas_semana} reserva(s) por semana por unidade</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-600">
                    {grade ? `Horários — ${data} (${grade.dia_semana})` : 'Escolha uma data para ver os horários'}
                  </p>
                  {grade && grade.slots.length === 0 && (
                    <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                      A área não funciona neste dia.
                    </div>
                  )}
                  <div className="grid max-h-72 grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {grade?.slots.map(sl => {
                      const sel = slot?.inicio === sl.inicio;
                      const livre = sl.status === 'LIVRE';
                      return (
                        <button key={sl.inicio} disabled={!livre}
                          onClick={() => setSlot(sl)}
                          className={
                            'rounded-lg border px-3 py-2 text-sm transition-all ' +
                            (sel ? 'border-navy bg-navy text-white shadow-sm'
                              : livre ? 'bg-white text-slate-700 hover:border-navy hover:bg-slate-50'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400 line-through')}>
                          {sl.inicio} – {sl.fim}{!livre && ` (${sl.status.toLowerCase()})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4">
                  <Botao className="w-full py-2.5" disabled={!slot} onClick={confirmar}>Confirmar Reserva</Botao>
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
