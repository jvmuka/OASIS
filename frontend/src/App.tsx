import { Navigate, Route, Routes } from 'react-router-dom';
import { painelInicial, sessaoAtual } from './api';
import Login from './pages/Login';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import NovaReserva from './pages/morador/NovaReserva';
import MinhasReservas from './pages/morador/MinhasReservas';
import Dependentes from './pages/morador/Dependentes';
import MinhasEncomendas from './pages/morador/Encomendas';
import Mural from './pages/morador/Mural';
import Portaria from './pages/porteiro/Portaria';
import Encomendas from './pages/porteiro/Encomendas';
import Chaves from './pages/porteiro/Chaves';
import Painel from './pages/sindico/Painel';
import Areas from './pages/sindico/Areas';
import Pessoas from './pages/sindico/Pessoas';
import PublicarAviso from './pages/sindico/PublicarAviso';

/** Redireciona para o painel inicial do perfil (ou login, se nao houver sessao). */
function RedirecionaInicio() {
  const s = sessaoAtual();
  if (!s) return <Navigate to="/login" replace />;
  return <Navigate to={painelInicial(s)} replace />;
}

/** Bloqueia rotas para quem nao esta logado ou nao tem nenhum dos perfis exigidos. */
function Protegida({ perfil, children }: { perfil?: string | string[]; children: JSX.Element }) {
  const s = sessaoAtual();
  if (!s) return <Navigate to="/login" replace />;
  const exigidos = perfil ? (Array.isArray(perfil) ? perfil : [perfil]) : null;
  if (exigidos && !s.perfis.some(p => exigidos.includes(p.tipo))) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RedirecionaInicio />} />
      <Route element={<Layout />}>
        <Route path="/inicio" element={<Protegida><Inicio /></Protegida>} />
        {/* Morador */}
        <Route path="/morador/reservar" element={<Protegida perfil="MORADOR"><NovaReserva /></Protegida>} />
        <Route path="/morador/reservas" element={<Protegida perfil="MORADOR"><MinhasReservas /></Protegida>} />
        <Route path="/morador/encomendas" element={<Protegida perfil="MORADOR"><MinhasEncomendas /></Protegida>} />
        <Route path="/morador/familia" element={<Protegida perfil="MORADOR"><Dependentes /></Protegida>} />
        <Route path="/mural" element={<Protegida><Mural /></Protegida>} />
        {/* Porteiro */}
        <Route path="/portaria/painel" element={<Protegida perfil={['PORTEIRO', 'SINDICO']}><Portaria /></Protegida>} />
        <Route path="/portaria/encomendas" element={<Protegida perfil="PORTEIRO"><Encomendas /></Protegida>} />
        <Route path="/portaria/chaves" element={<Protegida perfil="PORTEIRO"><Chaves /></Protegida>} />
        {/* Sindico */}
        <Route path="/sindico/painel" element={<Protegida perfil="SINDICO"><Painel /></Protegida>} />
        <Route path="/sindico/areas" element={<Protegida perfil="SINDICO"><Areas /></Protegida>} />
        <Route path="/sindico/pessoas" element={<Protegida perfil="SINDICO"><Pessoas /></Protegida>} />
        <Route path="/sindico/avisos" element={<Protegida perfil="SINDICO"><PublicarAviso /></Protegida>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
