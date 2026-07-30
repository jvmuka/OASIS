import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { sessaoAtual, sair } from '../api';

/**
 * Casca comum de todas as telas internas:
 * topo com identificacao do usuario + menu lateral montado pelo perfil.
 * (Corresponde as "dicas de navegacao" do prototipo: menu fixo, modulo
 *  ativo destacado e usuario/perfil sempre visiveis no canto superior.)
 */
export default function Layout() {
  const nav = useNavigate();
  const s = sessaoAtual();
  if (!s) return null;
  const tipos = s.perfis.map(p => p.tipo);

  const item = (to: string, rotulo: string) => (
    <NavLink key={to} to={to}
      className={({ isActive }) =>
        'block rounded-lg px-4 py-2 text-sm ' +
        (isActive ? 'bg-navy text-white font-semibold' : 'text-slate-600 hover:bg-slate-100')}>
      {rotulo}
    </NavLink>
  );

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy font-bold text-white">O</span>
          <span className="text-lg font-bold text-navy">OASIS</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{s.pessoa.nome} — {tipos.join(' / ')}</span>
          <button onClick={() => { sair(); nav('/login'); }}
            className="rounded-lg border px-3 py-1 hover:bg-slate-50">Sair</button>
        </div>
      </header>
      <div className="flex">
        <aside className="min-h-[calc(100vh-57px)] w-56 space-y-1 border-r bg-white p-3">
          {tipos.includes('MORADOR') && <>
            <p className="px-2 pt-2 text-xs font-semibold uppercase text-slate-400">Morador</p>
            {item('/morador/reservar', 'Nova reserva')}
            {item('/morador/reservas', 'Minhas reservas')}
          </>}
          {tipos.includes('PORTEIRO') && <>
            <p className="px-2 pt-2 text-xs font-semibold uppercase text-slate-400">Portaria</p>
            {item('/portaria/encomendas', 'Encomendas')}
            {item('/portaria/chaves', 'Chaves')}
          </>}
          {tipos.includes('SINDICO') && <>
            <p className="px-2 pt-2 text-xs font-semibold uppercase text-slate-400">Administração</p>
            {item('/sindico/painel', 'Painel')}
            {item('/sindico/areas', 'Áreas comuns')}
            {item('/sindico/pessoas', 'Pessoas')}
            {item('/sindico/avisos', 'Publicar aviso')}
          </>}
          <p className="px-2 pt-2 text-xs font-semibold uppercase text-slate-400">Geral</p>
          {item('/mural', 'Mural de avisos')}
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
