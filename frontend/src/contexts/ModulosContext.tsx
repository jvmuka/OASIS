import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { obterMeusModulos, sessaoAtual } from '../api';

interface ModulosContextType {
  modulosAtivos: Set<string>;
  temModulo: (codigo: string) => boolean;
  recarregarModulos: () => Promise<void>;
  carregando: boolean;
}

const ModulosContext = createContext<ModulosContextType>({
  modulosAtivos: new Set<string>(),
  temModulo: () => true,
  recarregarModulos: async () => {},
  carregando: false,
});

export function ModulosProvider({ children }: { children: React.ReactNode }) {
  const [modulosAtivos, setModulosAtivos] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const recarregarModulos = useCallback(async () => {
    const s = sessaoAtual();
    if (!s) {
      setModulosAtivos(new Set());
      setCarregando(false);
      return;
    }

    // Se já tiver na sessão, usa inicialmente para exibição imediata sem flicker
    if (s.modulosAtivos && Array.isArray(s.modulosAtivos)) {
      setModulosAtivos(new Set(s.modulosAtivos));
    }

    try {
      const res = await obterMeusModulos();
      if (res && Array.isArray(res.modulosAtivos)) {
        setModulosAtivos(new Set(res.modulosAtivos));
      }
    } catch {
      // Em caso de falha de rede temporária, preserva os dados da sessão local
      if (s.modulosAtivos) {
        setModulosAtivos(new Set(s.modulosAtivos));
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarModulos();
  }, [recarregarModulos]);

  // Função auxiliar para verificar se um módulo está habilitado
  const temModulo = useCallback(
    (codigo: string): boolean => {
      const s = sessaoAtual();
      if (!s) return false;
      // Superadmin possui acesso universal
      if (s.perfis.some(p => p.tipo === 'SUPERADMIN')) return true;

      // Se ainda estiver carregando sem lista, não bloqueia visualmente de imediato
      if (modulosAtivos.size === 0 && carregando) return true;

      return modulosAtivos.has(codigo);
    },
    [modulosAtivos, carregando]
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

