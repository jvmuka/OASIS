import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface DadosRelatorioGeral {
  condominio: {
    nome: string;
    cnpj?: string | null;
    endereco_completo?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  mes_rotulo: string;
  mes_chave: string;
  periodo_apuracao: string;
  data_emissao: string;
  usuario_emissor?: string;
  totais: {
    receita_mes_atual: number;
    variacao_receita_pct: number;
    reservas_mes: number;
    moradores_ativos: number;
    encomendas_pendentes: number;
    chaves_emprestadas: number;
    chaves_atrasadas: number;
    total_unidades: number;
  };
  chamados: {
    total_mes: number;
    resolvidos: number;
    pendentes: number;
    taxa_resolucao_pct: number;
    tempo_medio_resolucao_horas: number;
    categorias: { categoria: string; rotulo: string; total: number; pct: number }[];
  };
  areas: {
    nome: string;
    capacidade: number;
    reservas: number;
    horas_totais: number;
    valor_unitario: number;
    receita_total: number;
  }[];
  top_unidades: {
    bloco: string;
    apartamento: string;
    morador: string;
    total_reservas: number;
    total_taxas: number;
  }[];
}

export interface ItemCobrancaArea {
  id_reserva: number;
  bloco: string;
  apartamento: string;
  morador_nome: string;
  morador_cpf: string;
  area_nome: string;
  data_evento: string;
  horario_inicio: string;
  horario_fim: string;
  status: string;
  valor_taxa: number;
}

export interface DadosRelatorioCobranca {
  condominio: {
    nome: string;
    cnpj?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  mes_rotulo: string;
  mes_chave: string;
  periodo_apuracao: string;
  data_emissao: string;
  usuario_emissor?: string;
  total_geral: number;
  total_reservas: number;
  total_unidades: number;
  itens: ItemCobrancaArea[];
}

@Injectable()
export class RelatoriosPdfService {
  private readonly logger = new Logger(RelatoriosPdfService.name);
  private logoPath: string;

  constructor() {
    const candidate1 = path.resolve(__dirname, '..', '..', 'assets', 'logo-deitada-navy.png');
    const candidate2 = path.resolve(process.cwd(), 'backend', 'assets', 'logo-deitada-navy.png');
    const candidate3 = path.resolve(process.cwd(), 'assets', 'logo-deitada-navy.png');
    const candidate4 = path.resolve(process.cwd(), 'frontend', 'public', 'logos', 'logo-deitada-navy.png');

    if (fs.existsSync(candidate1)) {
      this.logoPath = candidate1;
    } else if (fs.existsSync(candidate2)) {
      this.logoPath = candidate2;
    } else if (fs.existsSync(candidate3)) {
      this.logoPath = candidate3;
    } else if (fs.existsSync(candidate4)) {
      this.logoPath = candidate4;
    } else {
      this.logoPath = '';
    }
  }

  private formatarMoeda(val: number): string {
    return (Number(val) || 0)
      .toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
      .replace(/\u00a0/g, ' ');
  }

  /**
   * UC13: Gera o Relatório Mensal Geral Consolidado (Painel Executivo) em formato PDF.
   */
  async gerarPdfGeral(dados: DadosRelatorioGeral): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 45, left: 36, right: 36 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const MARGEM_ESQ = 36;
      const LARGURA_UTIL = 523;

      // 1. Cabeçalho Institucional
      let y = 36;
      if (this.logoPath && fs.existsSync(this.logoPath)) {
        try {
          doc.image(this.logoPath, MARGEM_ESQ, y, { width: 105 });
        } catch {
          doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1830').text('OASIS', MARGEM_ESQ, y);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1830').text('OASIS GESTÃO', MARGEM_ESQ, y);
      }

      // Dados do condomínio à direita
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B1830')
        .text(dados.condominio.nome || 'Condomínio Residencial OASIS', MARGEM_ESQ + 160, y, { width: LARGURA_UTIL - 160, align: 'right' });

      const localizacao = [dados.condominio.cidade, dados.condominio.uf].filter(Boolean).join(' - ');
      const infoCondo = [dados.condominio.cnpj ? `CNPJ: ${dados.condominio.cnpj}` : null, localizacao].filter(Boolean).join(' | ');
      if (infoCondo) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
          .text(infoCondo, MARGEM_ESQ + 160, y + 13, { width: LARGURA_UTIL - 160, align: 'right' });
      }

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
        .text(`Emissão: ${dados.data_emissao}${dados.usuario_emissor ? ` por ${dados.usuario_emissor}` : ''}`, MARGEM_ESQ + 160, y + 23, { width: LARGURA_UTIL - 160, align: 'right' });

      y += 45;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(MARGEM_ESQ, y).lineTo(MARGEM_ESQ + LARGURA_UTIL, y).stroke();

      // 2. Título do Relatório
      y += 12;
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 32).fill('#F1F5F9');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0B1830')
        .text('RELATÓRIO MENSAL CONSOLIDADO DE GESTÃO', MARGEM_ESQ + 12, y + 6, { width: 330, lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
        .text(dados.periodo_apuracao || 'Demonstrativo executivo de operações e uso dos espaços', MARGEM_ESQ + 12, y + 19, { width: 330, lineBreak: false });

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#2548A0')
        .text(`COMPETÊNCIA: ${dados.mes_rotulo.toUpperCase()}`, MARGEM_ESQ + 330, y + 10, { width: LARGURA_UTIL - 342, align: 'right', lineBreak: false });

      // 3. Super Cards de Resumo Executivo (4 cards em linha)
      y += 40;
      const cardLargura = (LARGURA_UTIL - 18) / 4;
      const cardAltura = 48;
      const cards = [
        {
          titulo: 'RECEITA DE TAXAS',
          valor: this.formatarMoeda(dados.totais.receita_mes_atual),
          sub: dados.totais.variacao_receita_pct !== 0
            ? `${dados.totais.variacao_receita_pct > 0 ? '+' : ''}${dados.totais.variacao_receita_pct.toFixed(1)}% vs anterior`
            : 'Taxas realizadas',
          corBorda: '#CBD5E1',
          corDestaque: '#16A34A',
        },
        {
          titulo: 'RESERVAS DO MÊS',
          valor: `${dados.totais.reservas_mes} eventos`,
          sub: 'Espaços utilizados',
          corBorda: '#CBD5E1',
          corDestaque: '#2548A0',
        },
        {
          titulo: 'CHAMADOS & AVARIAS',
          valor: `${dados.chamados.total_mes} ocorridos`,
          sub: `${dados.chamados.resolvidos} resolvidos (${dados.chamados.taxa_resolucao_pct}%)`,
          corBorda: '#CBD5E1',
          corDestaque: '#D97706',
        },
        {
          titulo: 'HABITAÇÃO & PORTARIA',
          valor: `${dados.totais.moradores_ativos} moradores`,
          sub: `${dados.totais.encomendas_pendentes} enc. pendentes`,
          corBorda: '#CBD5E1',
          corDestaque: '#0F172A',
        },
      ];

      cards.forEach((c, i) => {
        const xCard = MARGEM_ESQ + i * (cardLargura + 6);
        doc.roundedRect(xCard, y, cardLargura, cardAltura, 4).fillAndStroke('#FFFFFF', c.corBorda);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748B').text(c.titulo, xCard + 7, y + 6, { width: cardLargura - 14, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(c.corDestaque).text(c.valor, xCard + 7, y + 17, { width: cardLargura - 14, lineBreak: false });
        doc.font('Helvetica').fontSize(6.5).fillColor('#64748B').text(c.sub, xCard + 7, y + 33, { width: cardLargura - 14, lineBreak: false, ellipsis: true });
      });

      // 4. Seção: Desempenho e Arrecadação por Área Comum
      y += cardAltura + 14;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0B1830')
        .text('1. DESEMPENHO E ARRECADAÇÃO POR ÁREA COMUM', MARGEM_ESQ, y, { lineBreak: false });

      y += 14;
      // Cabeçalho da Tabela
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 16).fill('#0B1830');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');
      doc.text('ÁREA COMUM', MARGEM_ESQ + 8, y + 4, { width: 160, lineBreak: false });
      doc.text('CAPACIDADE', 208, y + 4, { width: 62, align: 'center', lineBreak: false });
      doc.text('RESERVAS', 274, y + 4, { width: 56, align: 'center', lineBreak: false });
      doc.text('HORAS RESERV.', 334, y + 4, { width: 66, align: 'center', lineBreak: false });
      doc.text('VALOR TAXA', 404, y + 4, { width: 64, align: 'right', lineBreak: false });
      doc.text('TOTAL GERADO', 472, y + 4, { width: 80, align: 'right', lineBreak: false });

      y += 16;
      let totalGeralAreas = 0;
      let totalReservasAreas = 0;

      if (!dados.areas || dados.areas.length === 0) {
        doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 18).fill('#F8FAFC');
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#64748B')
          .text('Nenhuma área comum com movimentação registrada neste mês.', MARGEM_ESQ + 8, y + 5, { lineBreak: false });
        y += 18;
      } else {
        dados.areas.forEach((area, idx) => {
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 15).fill(bg);
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(area.nome, MARGEM_ESQ + 8, y + 3.5, { width: 160, ellipsis: true, lineBreak: false });
          doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`${area.capacidade} pess.`, 208, y + 3.5, { width: 62, align: 'center', lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(String(area.reservas), 274, y + 3.5, { width: 56, align: 'center', lineBreak: false });
          doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`${area.horas_totais}h`, 334, y + 3.5, { width: 66, align: 'center', lineBreak: false });
          doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(this.formatarMoeda(area.valor_unitario), 404, y + 3.5, { width: 64, align: 'right', lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(area.receita_total > 0 ? '#16A34A' : '#64748B')
            .text(this.formatarMoeda(area.receita_total), 472, y + 3.5, { width: 80, align: 'right', lineBreak: false });

          totalGeralAreas += Number(area.receita_total || 0);
          totalReservasAreas += Number(area.reservas || 0);
          y += 15;
        });

        // Linha de Totalizador
        doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 16).fill('#E2E8F0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0B1830').text('TOTAL CONSOLIDADO DAS ÁREAS', MARGEM_ESQ + 8, y + 4, { width: 220, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0B1830').text(`${totalReservasAreas} reservas`, 274, y + 4, { width: 56, align: 'center', lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#16A34A').text(this.formatarMoeda(totalGeralAreas), 450, y + 4, { width: 102, align: 'right', lineBreak: false });
        y += 16;
      }

      // 5. Seção 2: Chamados, Manutenções & Portaria (2 colunas lado a lado)
      y += 14;
      const colLargura = (LARGURA_UTIL - 12) / 2;

      // Coluna Esquerda: Chamados
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0B1830')
        .text('2. OCORRÊNCIAS & MANUTENÇÃO', MARGEM_ESQ, y, { lineBreak: false });

      // Coluna Direita: Top Unidades em Uso
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0B1830')
        .text('3. TOP UNIDADES EM UTILIZAÇÃO', MARGEM_ESQ + colLargura + 12, y, { lineBreak: false });

      y += 13;
      const boxAltura = 96;

      // Box Chamados
      doc.roundedRect(MARGEM_ESQ, y, colLargura, boxAltura, 4).fillAndStroke('#FFFFFF', '#CBD5E1');
      let yInterno = y + 7;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0B1830')
        .text('Total de Chamados Abertos: ', MARGEM_ESQ + 8, yInterno, { continued: true })
        .fillColor('#2548A0')
        .text(`${dados.chamados.total_mes} chamados`, { lineBreak: false });

      yInterno += 11;
      doc.font('Helvetica').fontSize(7).fillColor('#475569')
        .text(`Resolvidos no Mês: ${dados.chamados.resolvidos} | Em Andamento/Análise: ${dados.chamados.pendentes}`, MARGEM_ESQ + 8, yInterno, { width: colLargura - 16, lineBreak: false });

      yInterno += 11;
      doc.font('Helvetica').fontSize(7).fillColor('#475569')
        .text(`Taxa de Resolução: ${dados.chamados.taxa_resolucao_pct}% | Tempo Médio: ${dados.chamados.tempo_medio_resolucao_horas}h`, MARGEM_ESQ + 8, yInterno, { width: colLargura - 16, lineBreak: false });

      yInterno += 12;
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(MARGEM_ESQ + 8, yInterno).lineTo(MARGEM_ESQ + colLargura - 8, yInterno).stroke();
      yInterno += 5;

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0B1830').text('Distribuição por Categoria:', MARGEM_ESQ + 8, yInterno, { lineBreak: false });
      yInterno += 10;

      if (!dados.chamados.categorias || dados.chamados.categorias.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#64748B').text('Nenhum chamado no período.', MARGEM_ESQ + 8, yInterno, { lineBreak: false });
      } else {
        dados.chamados.categorias.slice(0, 3).forEach(cat => {
          doc.font('Helvetica').fontSize(7).fillColor('#334155')
            .text(`• ${cat.rotulo}: ${cat.total} (${cat.pct}%)`, MARGEM_ESQ + 12, yInterno, { width: colLargura - 20, lineBreak: false, ellipsis: true });
          yInterno += 10;
        });
      }

      // Box Top Unidades
      const xCol2 = MARGEM_ESQ + colLargura + 12;
      doc.roundedRect(xCol2, y, colLargura, boxAltura, 4).fillAndStroke('#FFFFFF', '#CBD5E1');
      let yInterno2 = y + 7;

      if (!dados.top_unidades || dados.top_unidades.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#64748B')
          .text('Nenhuma unidade com agendamentos no mês.', xCol2 + 8, yInterno2 + 25, { width: colLargura - 16, align: 'center', lineBreak: false });
      } else {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748B');
        doc.text('APTO / BLOCO', xCol2 + 8, yInterno2, { width: 64, lineBreak: false });
        doc.text('MORADOR', xCol2 + 74, yInterno2, { width: 74, lineBreak: false });
        doc.text('RESERVAS', xCol2 + 150, yInterno2, { width: 38, align: 'center', lineBreak: false });
        doc.text('TAXAS', xCol2 + 190, yInterno2, { width: 57.5, align: 'right', lineBreak: false });

        yInterno2 += 10;
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(xCol2 + 8, yInterno2).lineTo(xCol2 + colLargura - 8, yInterno2).stroke();
        yInterno2 += 5;

        dados.top_unidades.slice(0, 5).forEach((u) => {
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#0F172A')
            .text(`Apto ${u.apartamento} (${u.bloco})`, xCol2 + 8, yInterno2, { width: 64, ellipsis: true, lineBreak: false });
          doc.font('Helvetica').fontSize(7).fillColor('#475569')
            .text(u.morador, xCol2 + 74, yInterno2, { width: 74, ellipsis: true, lineBreak: false });
          doc.font('Helvetica').fontSize(7).fillColor('#0F172A')
            .text(String(u.total_reservas), xCol2 + 150, yInterno2, { width: 38, align: 'center', lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(7).fillColor(u.total_taxas > 0 ? '#16A34A' : '#64748B')
            .text(this.formatarMoeda(u.total_taxas), xCol2 + 190, yInterno2, { width: 57.5, align: 'right', lineBreak: false });
          yInterno2 += 12.5;
        });
      }

      // 6. Parecer e Assinaturas
      y += boxAltura + 14;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B1830')
        .text('4. PARECER DA ADMINISTRAÇÃO E CONSELHO FISCAL', MARGEM_ESQ, y, { lineBreak: false });

      y += 12;
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 35).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#64748B')
        .text('Atestamos que os dados, receitas e registros consolidados neste relatório refletem com fidedignidade as operações realizadas no condomínio durante a competência supracitada.', MARGEM_ESQ + 8, y + 6, { width: LARGURA_UTIL - 16 });

      y += 45;
      const larguraAssinatura = (LARGURA_UTIL - 36) / 2;

      // Assinatura Síndico
      doc.strokeColor('#94A3B8').lineWidth(0.8).moveTo(MARGEM_ESQ + 10, y).lineTo(MARGEM_ESQ + 10 + larguraAssinatura, y).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0B1830').text('Síndico(a) / Gestor Condominial', MARGEM_ESQ + 10, y + 4, { width: larguraAssinatura, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B').text(dados.condominio.nome, MARGEM_ESQ + 10, y + 13, { width: larguraAssinatura, align: 'center', lineBreak: false });

      // Assinatura Conselho Fiscal
      const xAssinatura2 = MARGEM_ESQ + larguraAssinatura + 36;
      doc.strokeColor('#94A3B8').lineWidth(0.8).moveTo(xAssinatura2, y).lineTo(xAssinatura2 + larguraAssinatura, y).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0B1830').text('Conselho Fiscal / Consultivo', xAssinatura2, y + 4, { width: larguraAssinatura, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B').text('Aprovação de Contas', xAssinatura2, y + 13, { width: larguraAssinatura, align: 'center', lineBreak: false });

      // 7. Rodapé com numeração dinâmica de páginas (sem criar páginas em branco espúrias)
      const totalPaginas = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPaginas; i++) {
        doc.switchToPage(i);
        const margemAntiga = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const yRodape = 795;
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(MARGEM_ESQ, yRodape).lineTo(MARGEM_ESQ + LARGURA_UTIL, yRodape).stroke();
        doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8')
          .text(`OASIS Gestão Condominial • Relatório Executivo Mensal • Emitido em ${dados.data_emissao}`, MARGEM_ESQ, yRodape + 4, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748B')
          .text(`Página ${i + 1} de ${totalPaginas}`, MARGEM_ESQ, yRodape + 4, { width: LARGURA_UTIL, align: 'right', lineBreak: false });

        doc.page.margins.bottom = margemAntiga;
      }

      doc.end();
    });
  }

  /**
   * UC13: Gera o Demonstrativo de Cobrança de Áreas Comuns (para envio à Administradora / Boleto) em PDF.
   * Regra estrita: apenas eventos já realizados até a data do corte (se for mês atual, até hoje; se for mês passado, o mês inteiro).
   */
  async gerarPdfCobrancaAreas(dados: DadosRelatorioCobranca): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 45, left: 36, right: 36 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const MARGEM_ESQ = 36;
      const LARGURA_UTIL = 523;

      // 1. Cabeçalho Institucional
      let y = 36;
      if (this.logoPath && fs.existsSync(this.logoPath)) {
        try {
          doc.image(this.logoPath, MARGEM_ESQ, y, { width: 105 });
        } catch {
          doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1830').text('OASIS', MARGEM_ESQ, y);
        }
      } else {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#0B1830').text('OASIS GESTÃO', MARGEM_ESQ, y);
      }

      // Dados do condomínio à direita
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0B1830')
        .text(dados.condominio.nome || 'Condomínio Residencial OASIS', MARGEM_ESQ + 160, y, { width: LARGURA_UTIL - 160, align: 'right' });

      const infoCondo = [
        dados.condominio.cnpj ? `CNPJ: ${dados.condominio.cnpj}` : null,
        [dados.condominio.cidade, dados.condominio.uf].filter(Boolean).join(' - '),
      ].filter(Boolean).join(' | ');

      if (infoCondo) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
          .text(infoCondo, MARGEM_ESQ + 160, y + 13, { width: LARGURA_UTIL - 160, align: 'right' });
      }

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
        .text(`Emissão: ${dados.data_emissao}${dados.usuario_emissor ? ` por ${dados.usuario_emissor}` : ''}`, MARGEM_ESQ + 160, y + 23, { width: LARGURA_UTIL - 160, align: 'right' });

      y += 45;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(MARGEM_ESQ, y).lineTo(MARGEM_ESQ + LARGURA_UTIL, y).stroke();

      // 2. Título do Relatório
      y += 12;
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 34).fill('#0B1830');
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#FFFFFF')
        .text('DEMONSTRATIVO DE COBRANÇA - TAXAS DE ÁREAS COMUNS', MARGEM_ESQ + 12, y + 6, { width: 340 });
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
        .text(dados.periodo_apuracao || 'Espelho analítico para inclusão das taxas na cota condominial mensal pela Administradora', MARGEM_ESQ + 12, y + 19, { width: 340 });

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#38BDF8')
        .text(`COMPETÊNCIA: ${dados.mes_rotulo.toUpperCase()}`, MARGEM_ESQ + 350, y + 11, { width: LARGURA_UTIL - 362, align: 'right' });

      // 3. Resumo de Faturamento
      y += 42;
      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 28).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('TOTAL A FATURAR:', MARGEM_ESQ + 12, y + 9, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#16A34A')
        .text(this.formatarMoeda(dados.total_geral), MARGEM_ESQ + 105, y + 7, { lineBreak: false });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text(`EVENTOS REALIZADOS: ${dados.total_reservas}`, MARGEM_ESQ + 260, y + 9, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text(`UNIDADES IMPACTADAS: ${dados.total_unidades}`, MARGEM_ESQ + 395, y + 9, { lineBreak: false });

      // 4. Tabela de Lançamentos com larguras rigorosamente calibradas (largura total útil: 523pt, [36 a 559])
      y += 36;
      const desenharCabecalhoTabela = (yPos: number) => {
        doc.rect(MARGEM_ESQ, yPos, LARGURA_UTIL, 18).fill('#1E293B');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF');
        doc.text('UNIDADE', MARGEM_ESQ + 8, yPos + 5, { width: 46, lineBreak: false });
        doc.text('MORADOR SOLICITANTE', 92, yPos + 5, { width: 112, lineBreak: false });
        doc.text('CPF', 206, yPos + 5, { width: 66, lineBreak: false });
        doc.text('ESPAÇO RESERVADO', 274, yPos + 5, { width: 94, lineBreak: false });
        doc.text('DATA', 370, yPos + 5, { width: 56, align: 'center', lineBreak: false });
        doc.text('HORÁRIO', 428, yPos + 5, { width: 58, align: 'center', lineBreak: false });
        doc.text('TAXA (R$)', 488, yPos + 5, { width: 66, align: 'right', lineBreak: false });
        return yPos + 18;
      };

      y = desenharCabecalhoTabela(y);

      if (!dados.itens || dados.itens.length === 0) {
        doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 24).fill('#F8FAFC');
        doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748B')
          .text('Nenhum evento tarifado realizado no período apurado até o momento.', MARGEM_ESQ + 12, y + 8, { lineBreak: false });
        y += 24;
      } else {
        // Agrupa por Bloco para criar subtotais organizados
        const itensPorBloco: Record<string, ItemCobrancaArea[]> = {};
        dados.itens.forEach(item => {
          const blocoKey = item.bloco || 'Geral';
          if (!itensPorBloco[blocoKey]) itensPorBloco[blocoKey] = [];
          itensPorBloco[blocoKey].push(item);
        });

        const ALTURA_LINHA = 16;
        let linhaIndex = 0;

        for (const bloco of Object.keys(itensPorBloco).sort()) {
          const itensBloco = itensPorBloco[bloco];
          let subtotalBloco = 0;

          // Se faltar espaço para cabeçalho do bloco + 2 linhas, salta página
          if (y > 690) {
            doc.addPage();
            y = desenharCabecalhoTabela(36);
          }

          // Faixa de cabeçalho do Bloco
          doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 15).fill('#E2E8F0');
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0B1830')
            .text(`BLOCO: ${bloco.toUpperCase()} (${itensBloco.length} lançamento${itensBloco.length > 1 ? 's' : ''})`, MARGEM_ESQ + 8, y + 3.5, { lineBreak: false });
          y += 15;

          for (const item of itensBloco) {
            if (y > 710) {
              doc.addPage();
              y = desenharCabecalhoTabela(36);
            }

            const bg = linhaIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, ALTURA_LINHA).fill(bg);

            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A')
              .text(`Apto ${item.apartamento}`, MARGEM_ESQ + 8, y + 4, { width: 46, lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
              .text(item.morador_nome, 92, y + 4, { width: 112, ellipsis: true, lineBreak: false });
            doc.font('Helvetica').fontSize(7).fillColor('#64748B')
              .text(item.morador_cpf || '---', 206, y + 4, { width: 66, lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0B1830')
              .text(item.area_nome, 274, y + 4, { width: 94, ellipsis: true, lineBreak: false });
            doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
              .text(item.data_evento, 370, y + 4, { width: 56, align: 'center', lineBreak: false });

            const horarioFormatado = item.horario_inicio && item.horario_fim
              ? `${item.horario_inicio} às ${item.horario_fim}`
              : item.horario_inicio || '---';
            doc.font('Helvetica').fontSize(6.5).fillColor('#475569')
              .text(horarioFormatado, 428, y + 4.5, { width: 58, align: 'center', lineBreak: false });

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A')
              .text(this.formatarMoeda(item.valor_taxa), 488, y + 4, { width: 66, align: 'right', lineBreak: false });

            subtotalBloco += Number(item.valor_taxa || 0);
            linhaIndex++;
            y += ALTURA_LINHA;
          }

          // Subtotal do Bloco com alinhamento perfeito na coluna de taxa
          doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 16).fill('#F1F5F9');
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569')
            .text(`Subtotal Bloco ${bloco}:`, 200, y + 4, { width: 280, align: 'right', lineBreak: false });
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#0B1830')
            .text(this.formatarMoeda(subtotalBloco), 488, y + 4, { width: 66, align: 'right', lineBreak: false });
          y += 16;
        }

        // Linha de Total Geral Consolidado
        y += 6;
        doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 20).fill('#0B1830');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
          .text('TOTAL GERAL A SER COBRADO EM BOLETO:', MARGEM_ESQ + 12, y + 6, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#4ADE80')
          .text(this.formatarMoeda(dados.total_geral), 430, y + 5, { width: 124, align: 'right', lineBreak: false });
        y += 20;
      }

      // 5. Termo de Envio e Protocolo Contábil
      if (y > 640) {
        doc.addPage();
        y = 40;
      } else {
        y += 14;
      }

      doc.rect(MARGEM_ESQ, y, LARGURA_UTIL, 70).fillAndStroke('#FFFFFF', '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0B1830')
        .text('TERMO DE CONFERÊNCIA E PROTOCOLO DE FATURAMENTO', MARGEM_ESQ + 12, y + 8);

      doc.font('Helvetica').fontSize(7).fillColor('#475569')
        .text('Encaminho para a Administradora de Condomínio o presente demonstrativo contendo todos os lançamentos de taxas de uso de áreas comuns apurados na competência, para inclusão nos boletos da cota condominial.', MARGEM_ESQ + 12, y + 20, { width: LARGURA_UTIL - 24 });

      const yAssinaturas = y + 42;
      const larguraAssinatura = (LARGURA_UTIL - 48) / 2;

      // Linha Síndico
      doc.strokeColor('#94A3B8').lineWidth(0.8)
        .moveTo(MARGEM_ESQ + 16, yAssinaturas + 12)
        .lineTo(MARGEM_ESQ + 16 + larguraAssinatura, yAssinaturas + 12)
        .stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0B1830')
        .text('Síndico(a) / Gestor Responsável', MARGEM_ESQ + 16, yAssinaturas + 15, { width: larguraAssinatura, align: 'center' });

      // Linha Administradora
      const xAssinatura2 = MARGEM_ESQ + 16 + larguraAssinatura + 16;
      doc.strokeColor('#94A3B8').lineWidth(0.8)
        .moveTo(xAssinatura2, yAssinaturas + 12)
        .lineTo(xAssinatura2 + larguraAssinatura, yAssinaturas + 12)
        .stroke();
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0B1830')
        .text('Recebido pela Administradora / Data: ___/___/______', xAssinatura2, yAssinaturas + 15, { width: larguraAssinatura, align: 'center' });

      // 6. Rodapé em todas as páginas (sem criar páginas adicionais)
      const totalPaginas = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPaginas; i++) {
        doc.switchToPage(i);
        const margemAntiga = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const yRodape = 795;
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(MARGEM_ESQ, yRodape).lineTo(MARGEM_ESQ + LARGURA_UTIL, yRodape).stroke();
        doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8')
          .text(`OASIS Gestão Condominial • Demonstrativo de Cobrança de Áreas • Emitido em ${dados.data_emissao}`, MARGEM_ESQ, yRodape + 4, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748B')
          .text(`Página ${i + 1} de ${totalPaginas}`, MARGEM_ESQ, yRodape + 4, { width: LARGURA_UTIL, align: 'right', lineBreak: false });

        doc.page.margins.bottom = margemAntiga;
      }

      doc.end();
    });
  }

  /**
   * Gera o arquivo CSV estruturado para importação direta no software da administradora de condomínio.
   */
  gerarCsvCobrancaAreas(dados: DadosRelatorioCobranca): string {
    const separador = ';';
    const linhas: string[] = [];

    // Cabeçalho CSV
    linhas.push([
      'BLOCO',
      'APARTAMENTO',
      'MORADOR',
      'CPF',
      'AREA_COMUM',
      'DATA_EVENTO',
      'HORARIO_INICIO',
      'HORARIO_FIM',
      'STATUS_RESERVA',
      'TAXA_BRL',
    ].join(separador));

    // Linhas de dados
    (dados.itens || []).forEach(item => {
      const taxaFormatada = (Number(item.valor_taxa) || 0).toFixed(2).replace('.', ',');
      linhas.push([
        `"${item.bloco || ''}"`,
        `"${item.apartamento || ''}"`,
        `"${(item.morador_nome || '').replace(/"/g, '""')}"`,
        `"${item.morador_cpf || ''}"`,
        `"${(item.area_nome || '').replace(/"/g, '""')}"`,
        `"${item.data_evento || ''}"`,
        `"${item.horario_inicio || ''}"`,
        `"${item.horario_fim || ''}"`,
        `"${item.status || ''}"`,
        `"${taxaFormatada}"`,
      ].join(separador));
    });

    // Retorna com BOM UTF-8 (\uFEFF) para abrir nativamente no Excel sem corromper acentuação
    return '\uFEFF' + linhas.join('\r\n');
  }
}
