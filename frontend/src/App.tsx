import { Navigate, Route, Routes } from 'react-router-dom';
import { painelInicial, sessaoAtual } from './api';
import { ModulosProvider, useModulos } from './contexts/ModulosContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import NovaReserva from './pages/morador/NovaReserva';
import MinhasReservas from './pages/morador/MinhasReservas';
import Dependentes from './pages/morador/Dependentes';
import MinhasEncomendas from './pages/morador/Encomendas';
import Mural from './pages/morador/Mural';
import MoradorChamados from './pages/morador/Chamados';
import Portaria from './pages/porteiro/Portaria';
import Encomendas from './pages/porteiro/Encomendas';
import Chaves from './pages/porteiro/Chaves';
import Painel from './pages/sindico/Painel';
import Areas from './pages/sindico/Areas';
import Pessoas from './pages/sindico/Pessoas';
import PublicarAviso from './pages/sindico/PublicarAviso';
import SindicoChamados from './pages/sindico/Chamados';
import AreasLivres from './pages/porteiro/AreasLivres';
import EstruturaFisica from './pages/superadmin/EstruturaFisica';
import PessoasSuperadmin from './pages/superadmin/PessoasSuperadmin';
import CondominiosSuperadmin from './pages/superadmin/Condominios';

/** Redireciona para o painel inicial do perfil (ou login, se nao houver sessao). */
function RedirecionaInicio() {
  const s = sessaoAtual();
  if (!s) return <Navigate to="/login" replace />;
  return <Navigate to={painelInicial(s)} replace />;
}

/** Bloqueia rotas para quem nao esta logado ou nao tem nenhum dos perfis/módulos exigidos. */
function Protegida({
  perfil,
  modulo,
  children,
}: {
  perfil?: string | string[];
  modulo?: string;
  children: JSX.Element;
}) {
  const s = sessaoAtual();
  const { temModulo } = useModulos();
  if (!s) return <Navigate to="/login" replace />;

  // Superadmin possui passe livre universal
  if (s.perfis.some(p => p.tipo === 'SUPERADMIN')) return children;

  // Bloqueio por módulo inativo no condomínio
  if (modulo && !temModulo(modulo)) {
    return <Navigate to="/" replace />;
  }

  const exigidos = perfil ? (Array.isArray(perfil) ? perfil : [perfil]) : null;
  if (exigidos) {
    const sinonimos = (t: string) => (t === 'SINDICO' || t === 'ADMINISTRADOR' ? ['SINDICO', 'ADMINISTRADOR'] : [t]);
    const permitidos = new Set(exigidos.flatMap(sinonimos));
    if (!s.perfis.some(p => permitidos.has(p.tipo))) return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ModulosProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RedirecionaInicio />} />
        <Route element={<Layout />}>
          <Route path="/inicio" element={<Protegida><Inicio /></Protegida>} />
          {/* Morador */}
          <Route path="/morador/reservar" element={<Protegida perfil="MORADOR" modulo="RESERVAS_AREAS"><NovaReserva /></Protegida>} />
          <Route path="/morador/reservas" element={<Protegida perfil="MORADOR" modulo="RESERVAS_AREAS"><MinhasReservas /></Protegida>} />
          <Route path="/morador/chamados" element={<Protegida perfil="MORADOR" modulo="CHAMADOS_OCORRENCIAS"><MoradorChamados /></Protegida>} />
          <Route path="/morador/encomendas" element={<Protegida perfil="MORADOR" modulo="ENCOMENDAS_PACOTES"><MinhasEncomendas /></Protegida>} />
          <Route path="/morador/familia" element={<Protegida perfil="MORADOR" modulo="DEPENDENTES_FAMILIA"><Dependentes /></Protegida>} />
          <Route path="/mural" element={<Protegida modulo="MURAL_AVISOS"><Mural /></Protegida>} />
          {/* Porteiro e Administrador */}
          <Route path="/portaria/painel" element={<Protegida perfil={['PORTEIRO', 'ADMINISTRADOR', 'SINDICO']}><Portaria /></Protegida>} />
          <Route path="/portaria/areas-livres" element={<Protegida perfil={['PORTEIRO', 'ADMINISTRADOR', 'SINDICO']} modulo="AREAS_LIVRES"><AreasLivres /></Protegida>} />
          <Route path="/portaria/encomendas" element={<Protegida perfil="PORTEIRO" modulo="ENCOMENDAS_PACOTES"><Encomendas /></Protegida>} />
          <Route path="/portaria/chaves" element={<Protegida perfil={['PORTEIRO', 'ADMINISTRADOR', 'SINDICO']} modulo="CONTROLE_CHAVES"><Chaves /></Protegida>} />
          {/* Administrador */}
          <Route path="/sindico/painel" element={<Protegida perfil={['ADMINISTRADOR', 'SINDICO']}><Painel /></Protegida>} />
          <Route path="/sindico/chamados" element={<Protegida perfil={['ADMINISTRADOR', 'SINDICO']} modulo="CHAMADOS_OCORRENCIAS"><SindicoChamados /></Protegida>} />
          <Route path="/sindico/areas" element={<Protegida perfil={['ADMINISTRADOR', 'SINDICO']} modulo="RESERVAS_AREAS"><Areas /></Protegida>} />
          <Route path="/sindico/pessoas" element={<Protegida perfil={['ADMINISTRADOR', 'SINDICO', 'PORTEIRO']}><Pessoas /></Protegida>} />
          <Route path="/sindico/avisos" element={<Protegida perfil={['ADMINISTRADOR', 'SINDICO']} modulo="MURAL_AVISOS"><PublicarAviso /></Protegida>} />
          {/* Plataforma Superadmin */}
          <Route path="/superadmin/condominios" element={<Protegida perfil="SUPERADMIN"><CondominiosSuperadmin /></Protegida>} />
          <Route path="/superadmin/estrutura" element={<Protegida perfil="SUPERADMIN"><EstruturaFisica /></Protegida>} />
          <Route path="/superadmin/pessoas" element={<Protegida perfil="SUPERADMIN"><PessoasSuperadmin /></Protegida>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ModulosProvider>
  );
}
