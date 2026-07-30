import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

type Pessoa = { id_pessoa: number; nome: string; unidades: { bloco: string; apartamento: string }[] };
type Encomenda = {
  id_encomenda: number; destinatario: string; bloco: string; numero_apartamento: string;
  descricao: string; tamanho: string; status: string; data_hora_recebimento: string;
};

/** UC07 (registrar) + UC08 (alterar status / confirmar retirada). */
export default function Encomendas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [lista, setLista] = useState<Encomenda[]>([]);
  const [destinatario, setDestinatario] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tamanho, setTamanho] = useState('MEDIO');
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  // retirada
  const [retirando, setRetirando] = useState<number | null>(null);
  const [retiradoPor, setRetiradoPor] = useState('PROPRIO');
  const [nomeRetirante, setNomeRetirante] = useState('');

  const carregar = () => {
    api.get<Pessoa[]>('/cadastros/pessoas').then(setPessoas);
    api.get<Encomenda[]>('/portaria/encomendas').then(setLista);
  };
  useEffect(() => { carregar(); }, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); setMsg({ t: '', tipo: 'ok' });
    try {
      await api.post('/portaria/encomendas', {
        id_pessoa_destinatario: Number(destinatario), descricao, tamanho,
      });
      setMsg({ t: 'Encomenda registrada; o morador foi notificado no mural.', tipo: 'ok' });
      setDescricao(''); carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  async function confirmarRetirada(id: number) {
    try {
      await api.patch(`/portaria/encomendas/${id}/retirada`, {
        retirado_por: retiradoPor,
        nome_retirante: retiradoPor === 'TERCEIRO' ? nomeRetirante : undefined,
      });
      setMsg({ t: 'Retirada confirmada.', tipo: 'ok' });
      setRetirando(null); setNomeRetirante(''); carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); } // RN12 chega aqui
  }

  return (
    <div>
      <Titulo sub="Registre e controle as encomendas dos moradores">Gestão de Encomendas</Titulo>
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <h3 className="mb-3 font-semibold text-navy">Registrar Encomenda</h3>
          <form onSubmit={registrar} className="space-y-3">
            <Campo rotulo="Morador destinatário">
              <select className={inputCls} value={destinatario} required
                onChange={e => setDestinatario(e.target.value)}>
                <option value="">Selecione o morador</option>
                {pessoas.map(p => (
                  <option key={p.id_pessoa} value={p.id_pessoa}>
                    {p.nome}{p.unidades[0] ? ` — Bloco ${p.unidades[0].bloco}, Apto ${p.unidades[0].apartamento}` : ''}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Descrição">
              <input className={inputCls} value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Ex.: Pacote Correios" />
            </Campo>
            <Campo rotulo="Tamanho">
              <div className="flex gap-2">
                {['PEQUENO', 'MEDIO', 'GRANDE'].map(t => (
                  <button key={t} type="button" onClick={() => setTamanho(t)}
                    className={'flex-1 rounded-lg border px-3 py-2 text-sm ' +
                      (tamanho === t ? 'border-navy bg-navy text-white' : 'bg-white')}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Campo>
            <Botao className="w-full">Registrar Encomenda</Botao>
          </form>
        </Cartao>

        <Cartao>
          <h3 className="mb-3 font-semibold text-navy">Encomendas Registradas</h3>
          <ul className="max-h-96 divide-y overflow-y-auto">
            {lista.map(e => (
              <li key={e.id_encomenda} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{e.destinatario}</p>
                    <p className="text-xs text-slate-500">
                      {e.bloco ? `Bloco ${e.bloco} - Apto ${e.numero_apartamento} · ` : ''}
                      {e.descricao || 'sem descrição'} · {e.tamanho}
                    </p>
                  </div>
                  {e.status === 'AGUARDANDO_RETIRADA'
                    ? <Botao variante="claro" onClick={() => setRetirando(retirando === e.id_encomenda ? null : e.id_encomenda)}>
                        Alterar status
                      </Botao>
                    : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{e.status}</span>}
                </div>
                {retirando === e.id_encomenda && (
                  <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                    <Campo rotulo="Retirado por">
                      <select className={inputCls} value={retiradoPor} onChange={ev => setRetiradoPor(ev.target.value)}>
                        <option value="PROPRIO">Próprio morador</option>
                        <option value="TERCEIRO">Terceiro</option>
                        <option value="PORTEIRO">Porteiro</option>
                      </select>
                    </Campo>
                    {retiradoPor === 'TERCEIRO' && (
                      <Campo rotulo="Nome de quem retirou (obrigatório)">
                        <input className={inputCls} value={nomeRetirante}
                          onChange={ev => setNomeRetirante(ev.target.value)} />
                      </Campo>
                    )}
                    <Botao onClick={() => confirmarRetirada(e.id_encomenda)}>Confirmar retirada</Botao>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
