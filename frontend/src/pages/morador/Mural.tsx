import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Cartao, Titulo } from '../../components/ui';

type Aviso = {
  id_aviso_perfil: number; titulo: string; conteudo: string; autor: string;
  fixado: boolean; lido: boolean; data_hora_publicacao: string; escopo: string;
};

/** UC05 - mural: destaque para fixados/não lidos; abrir marca como lido (RN14). */
export default function Mural() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);

  const carregar = () => api.get<Aviso[]>('/avisos/meus').then(setAvisos);
  useEffect(() => { carregar(); }, []);

  async function abrir(a: Aviso) {
    setAberto(aberto === a.id_aviso_perfil ? null : a.id_aviso_perfil);
    if (!a.lido) { await api.patch(`/avisos/${a.id_aviso_perfil}/lido`); carregar(); }
  }

  return (
    <div>
      <Titulo sub="Comunicados da administração e notificações do sistema">Mural de Avisos</Titulo>
      <div className="space-y-3">
        {avisos.length === 0 && <Cartao><p className="text-sm text-slate-500">Nenhum comunicado disponível.</p></Cartao>}
        {avisos.map(a => (
          <Cartao key={a.id_aviso_perfil} className="cursor-pointer">
            <div onClick={() => abrir(a)}>
              <div className="flex items-center justify-between">
                <h3 className={'font-semibold ' + (a.lido ? 'text-slate-600' : 'text-navy')}>
                  {a.fixado && '📌 '}{a.titulo}{!a.lido && <span className="ml-2 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">NOVO</span>}
                </h3>
                <span className="text-xs text-slate-400">
                  {new Date(a.data_hora_publicacao).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {aberto === a.id_aviso_perfil && (
                <div className="mt-2 border-t pt-2 text-sm text-slate-600">
                  <p>{a.conteudo}</p>
                  <p className="mt-2 text-xs text-slate-400">Publicado por {a.autor}</p>
                </div>
              )}
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
