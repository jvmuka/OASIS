import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

type Chave = {
  id_chave: number; codigo: string; status: string; area: string;
  id_entrega_chave: number | null; responsavel: string | null; data_hora_retirada: string | null;
};
type Pessoa = { id_pessoa: number; nome: string; perfis: { tipo: string; id_perfil: number }[] };

/** UC06 - empréstimo e devolução de chaves (RN09/RN10 nos gatilhos). */
export default function Chaves() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [emprestando, setEmprestando] = useState<number | null>(null);
  const [solicitante, setSolicitante] = useState('');
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    api.get<Chave[]>('/portaria/chaves').then(setChaves);
    api.get<Pessoa[]>('/cadastros/pessoas').then(setPessoas);
  };
  useEffect(() => { carregar(); }, []);

  const moradores = pessoas
    .map(p => ({ nome: p.nome, perfil: p.perfis.find(x => x.tipo === 'MORADOR') }))
    .filter(p => p.perfil);

  async function emprestar(idChave: number) {
    try {
      await api.post(`/portaria/chaves/${idChave}/emprestimo`, { id_perfil_solicitante: Number(solicitante) });
      setMsg({ t: 'Empréstimo registrado.', tipo: 'ok' }); setEmprestando(null); carregar();
    } catch (e: any) { setMsg({ t: e.message, tipo: 'erro' }); } // RN09
  }
  async function devolver(idEntrega: number) {
    try {
      await api.patch(`/portaria/chaves/emprestimos/${idEntrega}/devolucao`);
      setMsg({ t: 'Devolução registrada; chave disponível novamente.', tipo: 'ok' }); carregar();
    } catch (e: any) { setMsg({ t: e.message, tipo: 'erro' }); } // RN10
  }

  const cor: any = { DISPONIVEL: 'bg-emerald-50 text-emerald-700', EMPRESTADA: 'bg-amber-50 text-amber-700', EXTRAVIADA: 'bg-red-50 text-red-600' };

  return (
    <div>
      <Titulo sub="Empréstimo e devolução das chaves das áreas comuns">Controle de Chaves</Titulo>
      <Cartao>
        <ul className="divide-y">
          {chaves.map(c => (
            <li key={c.id_chave} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-navy">{c.codigo} <span className="font-normal text-slate-500">— {c.area}</span></p>
                  {c.responsavel &&
                    <p className="text-xs text-slate-500">Com {c.responsavel} desde {new Date(c.data_hora_retirada!).toLocaleString('pt-BR')}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (cor[c.status] || '')}>{c.status}</span>
                  {c.status === 'DISPONIVEL' &&
                    <Botao variante="claro" onClick={() => setEmprestando(emprestando === c.id_chave ? null : c.id_chave)}>Emprestar</Botao>}
                  {c.status === 'EMPRESTADA' && c.id_entrega_chave &&
                    <Botao onClick={() => devolver(c.id_entrega_chave!)}>Registrar devolução</Botao>}
                </div>
              </div>
              {emprestando === c.id_chave && (
                <div className="mt-3 flex items-end gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex-1">
                    <Campo rotulo="Morador solicitante">
                      <select className={inputCls} value={solicitante} onChange={e => setSolicitante(e.target.value)}>
                        <option value="">Selecione</option>
                        {moradores.map(m => <option key={m.perfil!.id_perfil} value={m.perfil!.id_perfil}>{m.nome}</option>)}
                      </select>
                    </Campo>
                  </div>
                  <Botao disabled={!solicitante} onClick={() => emprestar(c.id_chave)}>Confirmar</Botao>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Mensagem texto={msg.t} tipo={msg.tipo} />
      </Cartao>
    </div>
  );
}
