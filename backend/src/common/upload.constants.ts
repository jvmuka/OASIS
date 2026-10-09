/** Configuracoes centralizadas de upload de imagens (areas comuns, etc). */
export const IMAGEM_MAX_MB = 15;
export const IMAGEM_MAX_BYTES = IMAGEM_MAX_MB * 1024 * 1024;
export const IMAGEM_TIPOS_REGEX = /^image\/(jpeg|png|webp|gif)$/;

/** Configuracoes de upload para anexos de avisos (imagens e PDF). */
export const AVISO_ANEXO_MAX_MB = 15;
export const AVISO_ANEXO_MAX_BYTES = AVISO_ANEXO_MAX_MB * 1024 * 1024;
export const AVISO_ANEXO_TIPOS_REGEX = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

