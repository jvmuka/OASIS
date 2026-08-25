import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Cartao, Titulo, Icone, Badge, EmptyState, Botao } from '../../components/ui';

type Painel = {
  totais: {
    reservas_mes: string;
    encomendas_pendentes: string;
    moradores_ativos: string;
    chaves_emprestadas: string;
  };
  areas_mais_usadas: { nome: string; reservas: string }[];
  reservas_recentes: { nome: string; area: string; data_hora_inicio: string; status: string }[];
};

/** UC13 - Painel administrativo com indicadores consolidados (UI/UX Pro Max) */
export default function PainelAdmin() {
  const [d, setD] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () => {
    setCarregando(true);
    setErro(null);
    api
      .get<Painel>('/relatorios/painel')
      .then(res => setD(res))
      .catch(err => setErro(err.message || 'Erro ao consultar indicadores.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <svg className="h-5 w-5 animate-spin text-navy" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Carregando indicadores do condomínio...</span>
        </div>
      </div>
    );
  }

  if (erro || !d) {
    return (
      <div className="space-y-6">
        <Titulo
          sub="Acompanhe os principais indicadores de operação e uso dos espaços coletivos."
          icone={<Icone nome="home" className="h-5 w-5" />}
        >
          Painel Administrativo
        </Titulo>
        <Cartao>
          <EmptyState
            icone="home"
            titulo="Não foi possível carregar os indicadores"
            descricao={erro || 'Houve uma falha ao obter os dados consolidados.'}
            acao={
              <Botao onClick={carregar} variante="primario" tamanho="sm">
                Tentar Novamente
              </Botao>
            }
          />
        </Cartao>
      </div>
    );
  }

  const max = Math.max(1, ...d.areas_mais_usadas.map(a => Number(a.reservas)));

  const kpis = [
    {
      titulo: 'Reservas no Mês',
      valor: d.totais.reservas_mes,
      icone: 'calendar' as const,
      cor: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60',
    },
    {
      titulo: 'Encomendas Pendentes',
      valor: d.totais.encomendas_pendentes,
      icone: 'package' as const,
      cor: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
    },
    {
      titulo: 'Moradores Ativos',
      valor: d.totais.moradores_ativos,
      icone: 'users' as const,
      cor: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60',
    },
    {
      titulo: 'Chaves em Uso',
      valor: d.totais.chaves_emprestadas,
      icone: 'key' as const,
      cor: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60',
    },
  ];

  return (
    <div className="space-y-6">
      <Titulo
        sub="Acompanhe os principais indicadores de operação e uso dos espaços coletivos."
        icone={<Icone nome="home" className="h-5 w-5" />}
      >
        Painel Administrativo
      </Titulo>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Cartao key={k.titulo} className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {k.titulo}
              </p>
              <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-navy dark:text-sky-400">
                {k.valor}
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${k.cor}`}>
              <Icone nome={k.icone} className="h-6 w-6" />
            </div>
          </Cartao>
        ))}
      </div>

      {/* Gráfico de Áreas + Lista de Reservas Recentes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Áreas mais utilizadas */}
        <Cartao>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icone nome="building" className="h-4 w-4 text-navy dark:text-sky-400" />
              Áreas Mais Utilizadas
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Neste mês</span>
          </div>

          {d.areas_mais_usadas.length === 0 ? (
            <EmptyState titulo="Nenhuma reserva registrada" descricao="Não há registros de reservas neste período." />
          ) : (
            <div className="space-y-3.5">
              {d.areas_mais_usadas.map(a => {
                const perc = Math.round((Number(a.reservas) / max) * 100);
                return (
                  <div key={a.nome} className="group">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{a.nome}</span>
                      <span className="font-bold text-navy dark:text-sky-400">{a.reservas} reserva(s)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-navy to-brand-blue dark:from-sky-600 dark:to-cyan-400 transition-all duration-500 group-hover:opacity-90"
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Cartao>

        {/* Reservas Recentes */}
        <Cartao>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icone nome="calendar" className="h-4 w-4 text-navy dark:text-sky-400" />
              Reservas Recentes
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Últimos agendamentos</span>
          </div>

          {d.reservas_recentes.length === 0 ? (
            <EmptyState titulo="Nenhuma reserva recente" descricao="As novas reservas realizadas aparecerão aqui." />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {d.reservas_recentes.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {r.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.area}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      tipo={
                        r.status === 'ATIVA'
                          ? 'sucesso'
                          : r.status === 'CANCELADA'
                          ? 'perigo'
                          : 'neutro'
                      }
                    >
                      {r.status}
                    </Badge>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(r.data_hora_inicio).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
}
