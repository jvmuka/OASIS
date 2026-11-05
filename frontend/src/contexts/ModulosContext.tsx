import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { obterMeusModulos, sessaoAtual, MODULOS_SISTEMA_PADRAO } from '../api';

interface ModulosContextType {
  modulosAtivos: Set<string>;
  temModulo: (codigo: string) => boolean;
  recarregarModulos: () => Promise<void>;
  carregando: boolean;
}

const ModulosContext = createContext<ModulosContextType>({
  modulosAtivos: new Set<string>(MODULOS_SISTEMA_PADRAO),
  temModulo: () => true,
  recarregarModulos: async () => {},
  carregando: false,
});

export function ModulosProvider({ children }: { children: React.ReactNode }) {
  const [modulosAtivos, setModulosAtivos] = useState<Set<string>>(() => {
    const s = sessaoAtual();
    if (s?.modulosAtivos && s.modulosAtivos.length > 0) {
      return new Set(s.modulosAtivos);
    }
    return s ? new Set(MODULOS_SISTEMA_PADRAO) : new Set();
  });
  const [carregando, setCarregando] = useState(true);

  const recarregarModulos = useCallback(async () => {
    const s = sessaoAtual();
    if (!s) {
      setModulosAtivos(new Set());
      setCarregando(false);
      return;
    }

    // Se já tiver na sessão, usa inicialmente para exibição imediata sem flicker
    if (s.modulosAtivos && Array.isArray(s.modulosAtivos) && s.modulosAtivos.length > 0) {
      setModulosAtivos(new Set(s.modulosAtivos));
    } else {
      setModulosAtivos(new Set(MODULOS_SISTEMA_PADRAO));
    }

    try {
      const res = await obterMeusModulos();
      if (res && Array.isArray(res.modulosAtivos) && res.modulosAtivos.length > 0) {
        setModulosAtivos(new Set(res.modulosAtivos));
        // Mantém a sessão atualizada localmente para próximas montagens
        const sAtual = sessaoAtual();
        if (sAtual) {
          sAtual.modulosAtivos = res.modulosAtivos;
          localStorage.setItem('oasis_sessao', JSON.stringify(sAtual));
        }
      }
    } catch {
      // Em caso de falha de rede temporária, preserva os dados da sessão local ou o padrão
      if (s.modulosAtivos && s.modulosAtivos.length > 0) {
        setModulosAtivos(new Set(s.modulosAtivos));
      } else {
        setModulosAtivos(new Set(MODULOS_SISTEMA_PADRAO));
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarModulos();

    const handleAtualizacao = () => {
      recarregarModulos();
    };
    window.addEventListener('oasis_sessao_alterada', handleAtualizacao);
    window.addEventListener('storage', handleAtualizacao);
    return () => {
      window.removeEventListener('oasis_sessao_alterada', handleAtualizacao);
      window.removeEventListener('storage', handleAtualizacao);
    };
  }, [recarregarModulos]);

  // Função auxiliar para verificar se um módulo está habilitado
  const temModulo = useCallback(
    (codigo: string): boolean => {
      const s = sessaoAtual();
      if (!s) return false;
      // Superadmin possui acesso universal
      if (s.perfis.some(p => p.tipo === 'SUPERADMIN')) return true;

      // Fallback seguro: se por qualquer motivo os módulos não estiverem carregados,
      // nunca bloqueie de forma cega as abas essenciais
      if (modulosAtivos.size === 0) {
        if (s.modulosAtivos && s.modulosAtivos.length > 0) {
          return s.modulosAtivos.includes(codigo);
        }
        return MODULOS_SISTEMA_PADRAO.includes(codigo);
      }

      return modulosAtivos.has(codigo);
    },
    [modulosAtivos]
  );

  return (
    <ModulosContext.Provider value={{ modulosAtivos, temModulo, recarregarModulos, carregando }}>
      {children}
    </ModulosContext.Provider>
  );
}

export function useModulos() {
  return useContext(ModulosContext);
}

