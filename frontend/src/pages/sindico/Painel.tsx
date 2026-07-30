import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Cartao, Titulo } from '../../components/ui';

type Painel = {
  totais: { reservas_mes: string; encomendas_pendentes: string; moradores_ativos: string; chaves_emprestadas: string };
  areas_mais_usadas: { nome: string; reservas: string }[];
  reservas_recentes: { nome: string; area: string; data_hora_inicio: string; status: string }[];
};

/** UC13 - painel administrativo com os indicadores consolidados. */
export default function PainelAdmin() {
  const [d, setD] = useState<Painel | null>(null);
  useEffect(() => { api.get<Painel>('/relatorios/painel').then(setD); }, []);
  if (!d) return <p className="text-sm text-slate-500">Carregando...</p>;

  const max = Math.max(1, ...d.areas_mais_usadas.map(a => Number(a.reservas)));
  const cards = [
    ['Reservas no mês', d.totais.reservas_mes],
    ['Encomendas pendentes', d.totais.encomendas_pendentes],
    ['Moradores ativos', d.totais.moradores_ativos],
    ['Chaves emprestadas', d.totais.chaves_emprestadas],
  ];

  return (
    <div>
      <Titulo sub="Visão geral do condomínio">Painel Administrativo</Titulo>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([r, v]) => (
          <Cartao key={r}><p className="text-xs text-slate-500">{r}</p>
            <p className="text-3xl font-bold text-navy">{v}</p></Cartao>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao>
          <h3 className="mb-3 font-semibold text-navy">Áreas mais utilizadas</h3>
          {d.areas_mais_usadas.map(a => (
            <div key={a.nome} className="mb-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{a.nome}</span><span>{a.reservas}</span>
              </div>
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-navy" style={{ width: `${(Number(a.reservas) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </Cartao>
        <Cartao>
          <h3 className="mb-3 font-semibold text-navy">Reservas recentes</h3>
          <ul className="divide-y text-sm">
            {d.reservas_recentes.map((r, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>{r.nome} — <span className="text-slate-500">{r.area}</span></span>
                <span className="text-xs text-slate-400">
                  {new Date(r.data_hora_inicio).toLocaleDateString('pt-BR')} · {r.status}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </div>
  );
}
