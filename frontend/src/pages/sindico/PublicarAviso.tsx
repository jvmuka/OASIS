import { useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

/** UC10 - publicar aviso no mural (RN13 distribui a todos os perfis). */
export default function PublicarAviso() {
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [fixado, setFixado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/avisos', { titulo, conteudo, fixado });
      setMsg({ t: 'Aviso publicado e distribuído a todos os moradores.', tipo: 'ok' });
      setTitulo(''); setConteudo(''); setFixado(false);
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  return (
    <div>
      <Titulo sub="O comunicado será distribuído a todos os perfis ativos">Publicar Aviso</Titulo>
      <Cartao className="max-w-2xl">
        <form onSubmit={publicar} className="space-y-3">
          <Campo rotulo="Título">
            <input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120} />
          </Campo>
          <Campo rotulo="Conteúdo">
            <textarea className={inputCls + ' min-h-32'} value={conteudo}
              onChange={e => setConteudo(e.target.value)} required maxLength={2000} />
          </Campo>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={fixado} onChange={e => setFixado(e.target.checked)} />
            Fixar no topo do mural
          </label>
          <Botao>Publicar</Botao>
        </form>
        <Mensagem texto={msg.t} tipo={msg.tipo} />
      </Cartao>
    </div>
  );
}
