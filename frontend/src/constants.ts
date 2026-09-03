/**
 * Configuracoes centralizadas de upload de imagens.
 * Precisam casar com os limites definidos no backend
 * (backend/src/common/upload.constants.ts) e no nginx.conf.
 */
export const IMAGEM_MAX_MB = 5;
export const IMAGEM_MAX_BYTES = IMAGEM_MAX_MB * 1024 * 1024;
export const IMAGEM_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const IMAGEM_EXTENSOES_ACEITAS = 'JPEG, PNG, WebP, GIF';
