import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, PerfilGuard, Perfis } from '../auth/guards';
import { DbService } from '../db/db.service';

interface GerarBlocoLoteDto {
  nome_bloco: string;
  descricao?: string;
  total_andares: number; // ex: 4
  incluir_terreo?: boolean; // se true, gera andar 0
  aptos_por_andar: number; // ex: 4
  vagas_por_apto?: number; // ex: 1
  metragem_padrao_vaga?: number; // ex: 12.50
  pavimento_padrao_vaga?: 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2';
  tipo_padrao_vaga?: 'SIMPLES' | 'DUPLA';
  coberta_padrao_vaga?: boolean;
}

interface CriarUnidadeDto {
  id_bloco: number;
  numero_apartamento: string;
  andar: number;
  numero_vagas?: number;
  vagas?: Array<{
    identificacao: string;
    pavimento?: 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2';
    tipo_vaga?: 'SIMPLES' | 'DUPLA';
    coberta?: boolean;
    metragem_m2: number;
  }>;
}

interface CriarVagaDto {
  id_unidade: number;
  identificacao: string;
  pavimento: 'TERREO' | 'SUBSOLO_1' | 'SUBSOLO_2';
  tipo_vaga: 'SIMPLES' | 'DUPLA';
  coberta?: boolean;
  metragem_m2: number;
}

@Controller('superadmin')
@UseGuards(JwtAuthGuard, PerfilGuard)
@Perfis('SUPERADMIN')
export class SuperadminController {
  constructor(private db: DbService) {}

  // =========================================================================
  // 1. GESTÃO ESTRUTURAL: BLOCOS, ANDARES, APARTAMENTOS E VAGAS COM METRAGEM
  // =========================================================================

  /**
   * Retorna a visão hierárquica completa da infraestrutura física do condomínio:
   * Blocos -> Andares -> Unidades -> Vagas com Metragem e Moradores.
   */
  @Get('estrutura')
  @Perfis('SUPERADMIN', 'SINDICO')
  async obterEstruturaCompleta() {
    // 1. Busca todos os blocos (exceto bloco de sistema 'Prédio' se não tiver unidades residenciais)
    const blocos = await this.db.query(`
      SELECT b.id_bloco, b.nome, b.descricao,
             COUNT(u.id_unidade)::INTEGER AS total_unidades,
             COALESCE(SUM(u.numero_vagas), 0)::INTEGER AS total_vagas_atribuidas
        FROM bloco b
        LEFT JOIN unidade u ON u.id_bloco = b.id_bloco
       GROUP BY b.id_bloco, b.nome, b.descricao
       ORDER BY (CASE WHEN b.nome = 'Prédio' THEN 2 ELSE 1 END), b.nome
    `);

    // 2. Busca todas as unidades com detalhes
    const unidades = await this.db.query(`
      SELECT u.id_unidade, u.id_bloco, b.nome AS bloco, u.numero_apartamento, u.andar, u.numero_vagas,
             (SELECT COUNT(*)::INTEGER FROM pessoa_unidade pu 
               WHERE pu.id_unidade = u.id_unidade 
                 AND pu.data_fim_ocupacao IS NULL 
                 AND pu.reside = TRUE) AS total_moradores,
             (SELECT p.nome FROM pessoa_unidade pu 
                JOIN pessoa p ON p.id_pessoa = pu.id_pessoa 
               WHERE pu.id_unidade = u.id_unidade 
                 AND pu.tipo_vinculo = 'PROPRIETARIO' 
                 AND pu.data_fim_ocupacao IS NULL LIMIT 1) AS proprietario,
             (SELECT p.nome FROM pessoa_unidade pu 
                JOIN pessoa p ON p.id_pessoa = pu.id_pessoa 
               WHERE pu.id_unidade = u.id_unidade 
                 AND pu.tipo_vinculo = 'INQUILINO' 
                 AND pu.data_fim_ocupacao IS NULL LIMIT 1) AS inquilino
        FROM unidade u
        JOIN bloco b ON b.id_bloco = u.id_bloco
       ORDER BY b.nome, u.andar, (CASE WHEN u.numero_apartamento ~ '^[0-9]+$' THEN u.numero_apartamento::INTEGER ELSE 999999 END), u.numero_apartamento
    `);

    // 2.1. Busca todos os vínculos de moradores ativos com as unidades
    const moradores = await this.db.query(`
      SELECT pu.id_pessoa_unidade, pu.id_unidade, pu.id_pessoa, pu.tipo_vinculo,
             pu.grau_parentesco, pu.reside, pu.data_inicio_ocupacao, pu.status_aprovacao,
             p.nome, p.cpf, p.email, p.celular, p.status_conta, p.ativo,
             pu.id_responsavel, resp.nome AS responsavel_nome
        FROM pessoa_unidade pu
        JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
        LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
       WHERE pu.data_fim_ocupacao IS NULL
       ORDER BY 
         CASE pu.tipo_vinculo 
           WHEN 'PROPRIETARIO' THEN 1 
           WHEN 'INQUILINO' THEN 2 
           WHEN 'DEPENDENTE' THEN 3 
           ELSE 4 
         END, 
         p.nome
    `);

    // Agrupa moradores por unidade
    const moradoresPorUnidade: Record<number, any[]> = {};
    for (const m of moradores) {
      if (!moradoresPorUnidade[m.id_unidade]) moradoresPorUnidade[m.id_unidade] = [];
      moradoresPorUnidade[m.id_unidade].push(m);
    }

    // 3. Busca todas as vagas de garagem com metragens
    const vagas = await this.db.query(`
      SELECT vg.id_vaga, vg.id_unidade, vg.identificacao, vg.pavimento, vg.tipo_vaga, vg.coberta, vg.metragem_m2,
             u.numero_apartamento, b.nome AS bloco
        FROM vaga_garagem vg
        JOIN unidade u ON u.id_unidade = vg.id_unidade
        JOIN bloco b ON b.id_bloco = u.id_bloco
       ORDER BY vg.identificacao
    `);

    // Agrupa vagas por unidade
    const vagasPorUnidade: Record<number, any[]> = {};
    for (const v of vagas) {
      if (!vagasPorUnidade[v.id_unidade]) vagasPorUnidade[v.id_unidade] = [];
      vagasPorUnidade[v.id_unidade].push(v);
    }

    // Agrupa unidades por bloco e andar com vagas e moradores
    const unidadesComVagas = unidades.map(u => ({
      ...u,
      vagas: vagasPorUnidade[u.id_unidade] || [],
      moradores: moradoresPorUnidade[u.id_unidade] || [],
    }));

    const blocosComDados = blocos.map(b => {
      const unidBloco = unidadesComVagas.filter(u => u.id_bloco === b.id_bloco);
      // Agrupa por andar
      const andaresSet = Array.from(new Set(unidBloco.map(u => u.andar))).sort((a, b) => a - b);
      return {
        ...b,
        andares: andaresSet,
        unidades: unidBloco,
      };
    });

    return {
      blocos: blocosComDados,
      resumo: {
        total_blocos: blocos.length,
        total_unidades: unidades.length,
        total_vagas: vagas.length,
        metragem_total_garagens: vagas.reduce((acc, v) => acc + Number(v.metragem_m2 || 0), 0),
      },
    };
  }

  /**
   * GERADOR EM LOTE: Cria bloco, andares, apartamentos e vagas com metragem em transação atômica.
   */
  @Post('blocos/lote')
  async gerarBlocoEmLote(@Body() dto: GerarBlocoLoteDto) {
    const nomeBloco = dto.nome_bloco?.trim();
    if (!nomeBloco) throw new BadRequestException('O nome do bloco é obrigatório.');
    if (!dto.total_andares || dto.total_andares < 1 || dto.total_andares > 50) {
      throw new BadRequestException('O total de andares deve ser entre 1 e 50.');
    }
    if (!dto.aptos_por_andar || dto.aptos_por_andar < 1 || dto.aptos_por_andar > 30) {
      throw new BadRequestException('A quantidade de apartamentos por andar deve ser entre 1 e 30.');
    }

    const vagasPorApto = Number(dto.vagas_por_apto ?? 1);
    const metragemVaga = Number(dto.metragem_padrao_vaga ?? 12.0);
    if (vagasPorApto > 0 && metragemVaga <= 0) {
      throw new BadRequestException('A metragem padrão da vaga deve ser maior que 0 m².');
    }

    return this.db.transacao(async client => {
      // 1. Cria ou reutiliza bloco
      let idBloco: number;
      const blocoExistente = await client.query(
        `SELECT id_bloco FROM bloco WHERE LOWER(nome) = LOWER($1)`,
        [nomeBloco]
      );
      if (blocoExistente.rows.length) {
        throw new BadRequestException(`Já existe um bloco cadastrado com o nome "${nomeBloco}".`);
      }

      const resBloco = await client.query(
        `INSERT INTO bloco (nome, descricao) VALUES ($1, $2) RETURNING id_bloco, nome, descricao`,
        [nomeBloco, dto.descricao?.trim() || null]
      );
      idBloco = resBloco.rows[0].id_bloco;

      // 2. Determina lista de andares
      const andares: number[] = [];
      if (dto.incluir_terreo) andares.push(0);
      for (let a = 1; a <= dto.total_andares; a++) {
        andares.push(a);
      }

      let totalAptosCriados = 0;
      let totalVagasCriadas = 0;

      for (const andar of andares) {
        for (let num = 1; num <= dto.aptos_por_andar; num++) {
          // Formata numero do apartamento:
          // Se andar 0: '01', '02'...
          // Se andar 1..N: '101', '102'.. '201'.. (se aptos < 10) ou '1001'..
          const sufixoApto = num < 10 ? `0${num}` : `${num}`;
          const numApto = andar === 0 ? `T-${sufixoApto}` : `${andar}${sufixoApto}`;

          // Insere unidade
          const resUnidade = await client.query(
            `INSERT INTO unidade (id_bloco, numero_apartamento, andar, numero_vagas)
             VALUES ($1, $2, $3, $4)
             RETURNING id_unidade`,
            [idBloco, numApto, andar, vagasPorApto]
          );
          const idUnidade = resUnidade.rows[0].id_unidade;
          totalAptosCriados++;

          // Cria vagas de garagem se solicitado
          if (vagasPorApto > 0) {
            for (let v = 1; v <= vagasPorApto; v++) {
              const sufixoVaga = vagasPorApto > 1 ? `-${String.fromCharCode(64 + v)}` : '';
              const idVagaStr = `G-${numApto}${sufixoVaga}`;

              await client.query(
                `INSERT INTO vaga_garagem (id_unidade, identificacao, pavimento, tipo_vaga, coberta, metragem_m2)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  idUnidade,
                  idVagaStr,
                  dto.pavimento_padrao_vaga || (andar === 0 ? 'TERREO' : 'SUBSOLO_1'),
                  dto.tipo_padrao_vaga || 'SIMPLES',
                  dto.coberta_padrao_vaga ?? true,
                  metragemVaga,
                ]
              );
              totalVagasCriadas++;
            }
          }
        }
      }

      return {
        sucesso: true,
        mensagem: `Bloco "${nomeBloco}" gerado com sucesso! Foram criados ${totalAptosCriados} apartamentos e ${totalVagasCriadas} vagas de garagem (${metragemVaga} m² cada).`,
        id_bloco: idBloco,
        total_apartamentos: totalAptosCriados,
        total_vagas: totalVagasCriadas,
      };
    });
  }

  /** Criação de bloco simples/avulso */
  @Post('blocos')
  async criarBloco(@Body() b: { nome: string; descricao?: string }) {
    const nome = b.nome?.trim();
    if (!nome) throw new BadRequestException('O nome do bloco é obrigatório.');
    return this.db.query(
      `INSERT INTO bloco (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome, b.descricao?.trim() || null]
    ).then(r => r[0]);
  }

  /** Edição de bloco */
  @Put('blocos/:id')
  async editarBloco(
    @Param('id', ParseIntPipe) idBloco: number,
    @Body() b: { nome: string; descricao?: string }
  ) {
    const nome = b.nome?.trim();
    if (!nome) throw new BadRequestException('O nome do bloco é obrigatório.');

    const res = await this.db.query(
      `UPDATE bloco SET nome = $1, descricao = $2 WHERE id_bloco = $3 RETURNING *`,
      [nome, b.descricao?.trim() || null, idBloco]
    );
    if (!res.length) throw new NotFoundException('Bloco não encontrado.');
    return res[0];
  }

  /** Exclusão segura de bloco: somente se não contiver unidades */
  @Delete('blocos/:id')
  async excluirBloco(@Param('id', ParseIntPipe) idBloco: number) {
    const unidades = await this.db.query(
      `SELECT COUNT(*)::INTEGER AS total FROM unidade WHERE id_bloco = $1`,
      [idBloco]
    );
    if (unidades[0]?.total > 0) {
      throw new BadRequestException(
        `Este bloco possui ${unidades[0].total} unidade(s) cadastrada(s). Remova ou transfira as unidades antes de excluir o bloco.`
      );
    }

    const res = await this.db.query(`DELETE FROM bloco WHERE id_bloco = $1 RETURNING *`, [idBloco]);
    if (!res.length) throw new NotFoundException('Bloco não encontrado.');
    return { sucesso: true, mensagem: `Bloco "${res[0].nome}" excluído com sucesso.` };
  }

  /** Adicionar andar completo a um bloco existente (padrão 4 apartamentos por andar com vagas) */
  @Post('blocos/:id/andar')
  async adicionarAndarAoBloco(
    @Param('id', ParseIntPipe) idBloco: number,
    @Body() dto: {
      andar: number;
      aptos_por_andar?: number;
      vagas_por_apto?: number;
      metragem_vaga?: number;
      coberta_vaga?: boolean;
    }
  ) {
    const bloco = await this.db.query(`SELECT * FROM bloco WHERE id_bloco = $1`, [idBloco]);
    if (!bloco.length) throw new NotFoundException('Bloco não encontrado.');

    const andar = Number(dto.andar);
    if (isNaN(andar) || andar < 0) {
      throw new BadRequestException('O número do andar deve ser 0 (Térreo) ou maior.');
    }

    const aptosPorAndar = Math.max(1, Number(dto.aptos_por_andar || 4));
    const vagasPorApto = Math.max(0, Number(dto.vagas_por_apto ?? 1));
    const metragemVaga = Math.max(1, Number(dto.metragem_vaga || 12.0));
    const coberta = dto.coberta_vaga ?? true;

    return this.db.transacao(async client => {
      const criados: any[] = [];
      for (let num = 1; num <= aptosPorAndar; num++) {
        // Regra do projeto: 4 apartamentos por andar, o prefixo é o andar e o último dígito é a porta
        const sufixoApto = num < 10 ? `${num}` : `${num}`;
        const numApto = andar === 0 ? `T-0${num}` : `${andar}${sufixoApto}`;

        const existe = await client.query(
          `SELECT id_unidade FROM unidade WHERE id_bloco = $1 AND numero_apartamento = $2`,
          [idBloco, numApto]
        );
        if (existe.rows.length) {
          throw new BadRequestException(`O apartamento "${numApto}" já existe no bloco ${bloco[0].nome}.`);
        }

        const resUnidade = await client.query(
          `INSERT INTO unidade (id_bloco, numero_apartamento, andar, numero_vagas)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [idBloco, numApto, andar, vagasPorApto]
        );
        const unidade = resUnidade.rows[0];

        const vagasCriadas: any[] = [];
        for (let v = 1; v <= vagasPorApto; v++) {
          const sufixoVaga = vagasPorApto > 1 ? `-${String.fromCharCode(64 + v)}` : '';
          const idVagaStr = `G-${numApto}${sufixoVaga}`;
          const resVaga = await client.query(
            `INSERT INTO vaga_garagem (id_unidade, identificacao, pavimento, tipo_vaga, coberta, metragem_m2)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [unidade.id_unidade, idVagaStr, andar === 0 ? 'TERREO' : 'SUBSOLO_1', 'SIMPLES', coberta, metragemVaga]
          );
          vagasCriadas.push(resVaga.rows[0]);
        }

        criados.push({ ...unidade, vagas: vagasCriadas });
      }

      return {
        sucesso: true,
        mensagem: `Andar ${andar} adicionado com sucesso ao bloco "${bloco[0].nome}" com ${criados.length} apartamentos (${criados.map(c => c.numero_apartamento).join(', ')}).`,
        unidades: criados,
      };
    });
  }

  /** Renomear/redefinir andar para todas as unidades daquele andar no bloco */
  @Put('blocos/:id/andares/:andar')
  async renomearAndar(
    @Param('id', ParseIntPipe) idBloco: number,
    @Param('andar', ParseIntPipe) andarAtual: number,
    @Body() dto: { novo_andar: number }
  ) {
    const novoAndar = Number(dto.novo_andar);
    if (isNaN(novoAndar) || novoAndar < 0) {
      throw new BadRequestException('O novo número do andar deve ser 0 ou superior.');
    }

    const res = await this.db.query(
      `UPDATE unidade 
          SET andar = $1
        WHERE id_bloco = $2 AND andar = $3
        RETURNING id_unidade, numero_apartamento, andar`,
      [novoAndar, idBloco, andarAtual]
    );

    if (!res.length) throw new NotFoundException('Nenhum apartamento encontrado neste andar para atualização.');

    return {
      sucesso: true,
      mensagem: `${res.length} apartamento(s) foram movidos do ${andarAtual}º andar para o ${novoAndar}º andar com sucesso.`,
    };
  }

  /** Sincronizar e organizar automaticamente os andares de um bloco pela numeração (4 aptos/andar) */
  @Post('blocos/:id/sincronizar-andares')
  async sincronizarAndaresBloco(@Param('id', ParseIntPipe) idBloco: number) {
    const bloco = await this.db.query(`SELECT * FROM bloco WHERE id_bloco = $1`, [idBloco]);
    if (!bloco.length) throw new NotFoundException('Bloco não encontrado.');

    const res = await this.db.query(
      `UPDATE unidade 
          SET andar = (numero_apartamento::INTEGER / 10)
        WHERE id_bloco = $1 
          AND numero_apartamento ~ '^[0-9]+$'
        RETURNING id_unidade, numero_apartamento, andar`,
      [idBloco]
    );

    return {
      sucesso: true,
      mensagem: `${res.length} apartamentos do bloco "${bloco[0].nome}" foram organizados em seus respectivos andares pela regra da numeração.`,
      atualizados: res,
    };
  }

  /** Obter detalhes e moradores vinculados a uma unidade */
  @Get('unidades/:id/moradores')
  @Perfis('SUPERADMIN', 'SINDICO')
  async obterMoradoresUnidade(@Param('id', ParseIntPipe) id: number) {
    const unidades = await this.db.query(
      `SELECT u.id_unidade, u.numero_apartamento, u.andar, u.numero_vagas, b.nome AS bloco, u.id_bloco
         FROM unidade u
         JOIN bloco b ON b.id_bloco = u.id_bloco
        WHERE u.id_unidade = $1`,
      [id],
    );
    if (!unidades.length) throw new NotFoundException('Unidade não encontrada.');

    const moradores = await this.db.query(
      `SELECT pu.id_pessoa_unidade, pu.id_unidade, pu.id_pessoa, pu.tipo_vinculo,
              pu.grau_parentesco, pu.reside, pu.data_inicio_ocupacao, pu.status_aprovacao,
              p.nome, p.cpf, p.email, p.celular, p.status_conta, p.ativo,
              pu.id_responsavel, resp.nome AS responsavel_nome
         FROM pessoa_unidade pu
         JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
         LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
        WHERE pu.id_unidade = $1 AND pu.data_fim_ocupacao IS NULL
        ORDER BY 
          CASE pu.tipo_vinculo 
            WHEN 'PROPRIETARIO' THEN 1 
            WHEN 'INQUILINO' THEN 2 
            WHEN 'DEPENDENTE' THEN 3 
            ELSE 4 
          END, 
          p.nome`,
      [id],
    );

    const vagas = await this.db.query(
      `SELECT id_vaga, identificacao, pavimento, tipo_vaga, coberta, metragem_m2
         FROM vaga_garagem
        WHERE id_unidade = $1
        ORDER BY identificacao`,
      [id],
    );

    return {
      unidade: unidades[0],
      moradores,
      vagas,
    };
  }

  /** Obter histórico e próximas atividades e reservas do apartamento inteiro */
  @Get('unidades/:id/atividades-reservas')
  @Perfis('SUPERADMIN', 'SINDICO')
  async obterAtividadesReservasUnidade(@Param('id', ParseIntPipe) id: number) {
    const unidades = await this.db.query(
      `SELECT u.id_unidade, u.numero_apartamento, u.andar, u.numero_vagas, b.nome AS bloco, u.id_bloco
         FROM unidade u
         JOIN bloco b ON b.id_bloco = u.id_bloco
        WHERE u.id_unidade = $1`,
      [id],
    );
    if (!unidades.length) throw new NotFoundException('Unidade não encontrada.');

    // 1. Atividade ativa acontecendo neste exato momento
    const agora = await this.db.query(
      `SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas,
              p.id_pessoa, p.nome AS morador_nome, pu.tipo_vinculo
         FROM reserva r
         JOIN perfil pf ON pf.id_perfil = r.id_perfil
         JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
         JOIN (
           SELECT id_pessoa, tipo_vinculo,
                  ROW_NUMBER() OVER (PARTITION BY id_pessoa ORDER BY data_inicio_ocupacao DESC) AS rn
             FROM pessoa_unidade
            WHERE id_unidade = $1
         ) pu ON pu.id_pessoa = p.id_pessoa AND pu.rn = 1
         JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        WHERE r.status = 'ATIVA'
          AND CURRENT_TIMESTAMP BETWEEN r.data_hora_inicio AND r.data_hora_fim
        ORDER BY r.data_hora_inicio
        LIMIT 5`,
      [id],
    );

    // 2. Próximas reservas agendadas para o apartamento
    const proximas = await this.db.query(
      `SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas,
              p.id_pessoa, p.nome AS morador_nome, pu.tipo_vinculo
         FROM reserva r
         JOIN perfil pf ON pf.id_perfil = r.id_perfil
         JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
         JOIN (
           SELECT id_pessoa, tipo_vinculo,
                  ROW_NUMBER() OVER (PARTITION BY id_pessoa ORDER BY data_inicio_ocupacao DESC) AS rn
             FROM pessoa_unidade
            WHERE id_unidade = $1
         ) pu ON pu.id_pessoa = p.id_pessoa AND pu.rn = 1
         JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        WHERE r.status = 'ATIVA' AND r.data_hora_inicio > CURRENT_TIMESTAMP
        ORDER BY r.data_hora_inicio ASC
        LIMIT 30`,
      [id],
    );

    // 3. Histórico recente de reservas do apartamento (concluídas ou canceladas)
    const historico = await this.db.query(
      `SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas,
              CASE WHEN r.status = 'ATIVA' AND r.data_hora_fim < CURRENT_TIMESTAMP THEN 'CONCLUIDA'
                   ELSE r.status END AS status,
              p.id_pessoa, p.nome AS morador_nome, pu.tipo_vinculo,
              r.motivo_cancelamento
         FROM reserva r
         JOIN perfil pf ON pf.id_perfil = r.id_perfil
         JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
         JOIN (
           SELECT id_pessoa, tipo_vinculo,
                  ROW_NUMBER() OVER (PARTITION BY id_pessoa ORDER BY data_inicio_ocupacao DESC) AS rn
             FROM pessoa_unidade
            WHERE id_unidade = $1
         ) pu ON pu.id_pessoa = p.id_pessoa AND pu.rn = 1
         JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        WHERE (r.data_hora_fim < CURRENT_TIMESTAMP OR r.status = 'CANCELADA')
        ORDER BY r.data_hora_inicio DESC
        LIMIT 50`,
      [id],
    );

    return {
      unidade: unidades[0],
      atividade_agora: agora,
      proximas_reservas: proximas,
      historico_reservas: historico,
      total_reservas: agora.length + proximas.length + historico.length,
    };
  }

  /** Criação de unidade avulsa com vagas opcionais */
  @Post('unidades')
  async criarUnidade(@Body() dto: CriarUnidadeDto) {
    const numApto = dto.numero_apartamento?.trim();
    if (!numApto) throw new BadRequestException('O número do apartamento é obrigatório.');
    if (!dto.id_bloco) throw new BadRequestException('O bloco é obrigatório.');

    // Auto-calcula o andar se não foi especificado explicitamente
    let andar = dto.andar;
    if (andar === undefined || andar === null) {
      andar = /^\d+$/.test(numApto) ? Math.floor(parseInt(numApto, 10) / 10) : 1;
    }
    const vagas = dto.vagas || [];
    const totalVagas = dto.numero_vagas ?? vagas.length;

    return this.db.transacao(async client => {
      const resUnidade = await client.query(
        `INSERT INTO unidade (id_bloco, numero_apartamento, andar, numero_vagas)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [dto.id_bloco, numApto, andar, totalVagas]
      );
      const unidade = resUnidade.rows[0];

      // Insere vagas se houver
      const vagasCriadas: any[] = [];
      for (const v of vagas) {
        if (!v.identificacao?.trim()) continue;
        const metragem = Number(v.metragem_m2 || 12.0);
        if (metragem <= 0) throw new BadRequestException('A metragem de cada vaga deve ser maior que 0 m².');

        const resVaga = await client.query(
          `INSERT INTO vaga_garagem (id_unidade, identificacao, pavimento, tipo_vaga, coberta, metragem_m2)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            unidade.id_unidade,
            v.identificacao.trim(),
            v.pavimento || 'SUBSOLO_1',
            v.tipo_vaga || 'SIMPLES',
            v.coberta ?? true,
            metragem,
          ]
        );
        vagasCriadas.push(resVaga.rows[0]);
      }

      return {
        ...unidade,
        vagas: vagasCriadas,
      };
    });
  }

  /** Edição de unidade: número, andar e total de vagas */
  @Put('unidades/:id')
  async editarUnidade(
    @Param('id', ParseIntPipe) idUnidade: number,
    @Body() dto: { numero_apartamento?: string; andar?: number; id_bloco?: number; numero_vagas?: number }
  ) {
    const atual = await this.db.query(`SELECT * FROM unidade WHERE id_unidade = $1`, [idUnidade]);
    if (!atual.length) throw new NotFoundException('Unidade não encontrada.');

    const numApto = dto.numero_apartamento?.trim() || atual[0].numero_apartamento;
    const andar = dto.andar !== undefined ? dto.andar : atual[0].andar;
    const idBloco = dto.id_bloco || atual[0].id_bloco;
    const numeroVagas = dto.numero_vagas !== undefined ? dto.numero_vagas : atual[0].numero_vagas;

    const res = await this.db.query(
      `UPDATE unidade 
          SET numero_apartamento = $1, andar = $2, id_bloco = $3, numero_vagas = $4
        WHERE id_unidade = $5
        RETURNING *`,
      [numApto, andar, idBloco, numeroVagas, idUnidade]
    );

    return res[0];
  }

  /** Exclusão protegida de unidade */
  @Delete('unidades/:id')
  async excluirUnidade(@Param('id', ParseIntPipe) idUnidade: number) {
    // 1. Verifica vínculos com pessoas (moradores atuais ou históricos)
    const pessoas = await this.db.query(
      `SELECT COUNT(*)::INTEGER AS total FROM pessoa_unidade WHERE id_unidade = $1`,
      [idUnidade]
    );
    if (pessoas[0]?.total > 0) {
      throw new BadRequestException(
        `Não é possível excluir este apartamento pois existem ${pessoas[0].total} registro(s) de pessoas/moradores vinculados a ele.`
      );
    }

    return this.db.transacao(async client => {
      // Remove vagas da unidade
      await client.query(`DELETE FROM vaga_garagem WHERE id_unidade = $1`, [idUnidade]);
      // Remove unidade
      const res = await client.query(`DELETE FROM unidade WHERE id_unidade = $1 RETURNING *`, [idUnidade]);
      if (!res.rows.length) throw new NotFoundException('Unidade não encontrada.');
      return { sucesso: true, mensagem: `Apartamento ${res.rows[0].numero_apartamento} excluído com sucesso.` };
    });
  }

  /** Adicionar vaga avulsa a uma unidade com metragem */
  @Post('vagas')
  async criarVaga(@Body() dto: CriarVagaDto) {
    if (!dto.id_unidade) throw new BadRequestException('A unidade é obrigatória.');
    const ident = dto.identificacao?.trim();
    if (!ident) throw new BadRequestException('A identificação da vaga é obrigatória.');
    const metragem = Number(dto.metragem_m2 || 12.0);
    if (metragem <= 0) throw new BadRequestException('A metragem da vaga deve ser maior que 0 m².');

    return this.db.transacao(async client => {
      const res = await client.query(
        `INSERT INTO vaga_garagem (id_unidade, identificacao, pavimento, tipo_vaga, coberta, metragem_m2)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [dto.id_unidade, ident, dto.pavimento || 'SUBSOLO_1', dto.tipo_vaga || 'SIMPLES', dto.coberta ?? true, metragem]
      );

      // Incrementa numero_vagas na unidade
      await client.query(
        `UPDATE unidade 
            SET numero_vagas = (SELECT COUNT(*) FROM vaga_garagem WHERE id_unidade = $1)
          WHERE id_unidade = $1`,
        [dto.id_unidade]
      );

      return res.rows[0];
    });
  }

  /** Editar vaga de garagem */
  @Put('vagas/:id')
  async editarVaga(
    @Param('id', ParseIntPipe) idVaga: number,
    @Body() dto: Partial<CriarVagaDto>
  ) {
    const atual = await this.db.query(`SELECT * FROM vaga_garagem WHERE id_vaga = $1`, [idVaga]);
    if (!atual.length) throw new NotFoundException('Vaga não encontrada.');

    const ident = dto.identificacao !== undefined ? dto.identificacao.trim() : atual[0].identificacao;
    if (!ident) throw new BadRequestException('A identificação da vaga é obrigatória.');

    const metragem = dto.metragem_m2 !== undefined ? Number(dto.metragem_m2) : Number(atual[0].metragem_m2);
    if (metragem <= 0) throw new BadRequestException('A metragem da vaga deve ser maior que 0 m².');

    const pavimento = dto.pavimento || atual[0].pavimento;
    const tipoVaga = dto.tipo_vaga || atual[0].tipo_vaga;
    const coberta = dto.coberta !== undefined ? dto.coberta : atual[0].coberta;
    const idUnidade = dto.id_unidade || atual[0].id_unidade;

    const res = await this.db.query(
      `UPDATE vaga_garagem
          SET identificacao = $1, metragem_m2 = $2, pavimento = $3, tipo_vaga = $4, coberta = $5, id_unidade = $6
        WHERE id_vaga = $7
        RETURNING *`,
      [ident, metragem, pavimento, tipoVaga, coberta, idUnidade, idVaga]
    );

    return res[0];
  }

  /** Excluir vaga de garagem */
  @Delete('vagas/:id')
  async excluirVaga(@Param('id', ParseIntPipe) idVaga: number) {
    const atual = await this.db.query(`SELECT id_unidade FROM vaga_garagem WHERE id_vaga = $1`, [idVaga]);
    if (!atual.length) throw new NotFoundException('Vaga não encontrada.');
    const idUnidade = atual[0].id_unidade;

    return this.db.transacao(async client => {
      await client.query(`DELETE FROM vaga_garagem WHERE id_vaga = $1`, [idVaga]);
      await client.query(
        `UPDATE unidade 
            SET numero_vagas = (SELECT COUNT(*) FROM vaga_garagem WHERE id_unidade = $1)
          WHERE id_unidade = $1`,
        [idUnidade]
      );
      return { sucesso: true, mensagem: 'Vaga de garagem excluída com sucesso.' };
    });
  }

  // =========================================================================
  // 2. GESTÃO GLOBAL DE PESSOAS E GOVERNANÇA DE SÍNDICOS
  // =========================================================================

  /**
   * Listagem ampla de pessoas com todos os seus perfis, unidades, dependentes e vínculos.
   */
  @Get('pessoas')
  async listarPessoasGlobal(
    @Query('busca') busca?: string,
    @Query('papel') papel?: string,
    @Query('status') status?: string
  ) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (busca && busca.trim()) {
      params.push(`%${busca.trim()}%`);
      const idx = params.length;
      conditions.push(`(
        p.nome ILIKE $${idx} 
        OR p.email ILIKE $${idx} 
        OR p.cpf ILIKE $${idx} 
        OR p.celular ILIKE $${idx}
        OR EXISTS (
          SELECT 1 FROM pessoa_unidade pu_s 
          JOIN unidade u_s ON u_s.id_unidade = pu_s.id_unidade 
          JOIN bloco b_s ON b_s.id_bloco = u_s.id_bloco 
          WHERE pu_s.id_pessoa = p.id_pessoa 
            AND (u_s.numero_apartamento ILIKE $${idx} OR b_s.nome ILIKE $${idx} OR CONCAT(b_s.nome, ' ', u_s.numero_apartamento) ILIKE $${idx})
        )
      )`);
    }

    if (status && status.trim()) {
      const s = status.trim().toUpperCase();
      if (s === 'ATIVOS') conditions.push(`p.ativo = TRUE`);
      else if (s === 'INATIVOS') conditions.push(`p.ativo = FALSE`);
      else if (s === 'BLOQUEADOS') conditions.push(`p.status_conta = 'BLOQUEADO'`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const pessoas = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento, p.ativo, p.status_conta,
             p.papel_controle, p.tipo_servico,
             COALESCE(
               (SELECT json_agg(json_build_object('id_perfil', pf.id_perfil, 'tipo', pf.tipo_perfil, 'data_inicio', pf.data_inicio))
                  FROM perfil pf
                 WHERE pf.id_pessoa = p.id_pessoa AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)),
               '[]'::json
             ) AS perfis,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id_unidade', u.id_unidade,
                 'bloco', b.nome,
                 'apartamento', u.numero_apartamento,
                 'andar', u.andar,
                 'tipo_vinculo', pu.tipo_vinculo,
                 'parentesco', pu.grau_parentesco,
                 'reside', pu.reside
               ))
                  FROM pessoa_unidade pu
                  JOIN unidade u ON u.id_unidade = pu.id_unidade
                  JOIN bloco b ON b.id_bloco = u.id_bloco
                 WHERE pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL),
               '[]'::json
             ) AS unidades,
             (SELECT json_build_object('id_pessoa', resp.id_pessoa, 'nome', resp.nome, 'email', resp.email)
                FROM pessoa_unidade pu_dep
                JOIN pessoa resp ON resp.id_pessoa = pu_dep.id_responsavel
               WHERE pu_dep.id_pessoa = p.id_pessoa AND pu_dep.data_fim_ocupacao IS NULL LIMIT 1) AS responsavel,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id_pessoa', p_filho.id_pessoa,
                 'nome', p_filho.nome,
                 'email', p_filho.email,
                 'cpf', p_filho.cpf,
                 'data_nascimento', p_filho.data_nascimento,
                 'grau_parentesco', pu_filho.grau_parentesco,
                 'ativo', p_filho.ativo
               ))
                  FROM pessoa_unidade pu_filho
                  JOIN pessoa p_filho ON p_filho.id_pessoa = pu_filho.id_pessoa
                 WHERE pu_filho.id_responsavel = p.id_pessoa AND pu_filho.data_fim_ocupacao IS NULL),
               '[]'::json
             ) AS dependentes,
             (SELECT COUNT(*)::INTEGER FROM bloqueio_perfil bp
                JOIN perfil pf_b ON pf_b.id_perfil = bp.id_perfil
               WHERE pf_b.id_pessoa = p.id_pessoa
                 AND bp.data_hora_inicio <= CURRENT_TIMESTAMP
                 AND (bp.data_hora_fim IS NULL OR bp.data_hora_fim >= CURRENT_TIMESTAMP)) AS total_bloqueios_ativos,
             (SELECT c.codigo FROM codigo_primeiro_acesso c
                WHERE c.id_pessoa = p.id_pessoa AND c.status = 'DISPONIVEL'
                  AND c.data_expiracao > CURRENT_TIMESTAMP
                ORDER BY c.id_codigo DESC LIMIT 1) AS codigo_ativacao
        FROM pessoa p
       ${whereClause}
       ORDER BY p.nome
    `);

    // Filtro pós-banco por perfil se informado
    let filtradas = pessoas;
    if (papel && papel.trim() && papel !== 'TODOS') {
      const pFiltro = papel.trim().toUpperCase();
      if (pFiltro === 'ADMINISTRADOR' || pFiltro === 'SINDICO') {
        filtradas = pessoas.filter((p: any) =>
          (p.perfis || []).some((pf: any) => pf.tipo === 'SINDICO' || pf.tipo === 'ADMINISTRADOR')
        );
      } else if (pFiltro === 'VISITANTE') {
        filtradas = pessoas.filter((p: any) =>
          p.papel_controle === 'VISITANTE' || (p.unidades || []).some((u: any) => u.tipo_vinculo === 'VISITANTE')
        );
      } else if (pFiltro === 'PRESTADOR_SERVICO') {
        filtradas = pessoas.filter((p: any) =>
          p.papel_controle === 'PRESTADOR_SERVICO' || (p.unidades || []).some((u: any) => u.tipo_vinculo === 'PRESTADOR_SERVICO')
        );
      } else {
        filtradas = pessoas.filter((p: any) =>
          (p.perfis || []).some((pf: any) => pf.tipo === pFiltro) ||
          (p.unidades || []).some((u: any) => u.tipo_vinculo === pFiltro)
        );
      }
    }

    return filtradas;
  }

  /**
   * Conceder permissão de Administradora (mandato SINDICO ativo).
   */
  @Post('pessoas/:id/promover-sindico')
  @Post('pessoas/:id/dar-administracao')
  async promoverParaSindico(@Param('id', ParseIntPipe) idPessoa: number) {
    const pessoa = await this.db.query(`SELECT id_pessoa, nome FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) throw new NotFoundException('Pessoa não encontrada.');

    return this.db.transacao(async client => {
      // 1. Verifica se já é administradora ativa
      const jaSindico = await client.query(
        `SELECT id_perfil FROM perfil WHERE id_pessoa = $1 AND tipo_perfil = 'SINDICO' AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`,
        [idPessoa]
      );
      if (jaSindico.rows.length) {
        throw new BadRequestException(`"${pessoa[0].nome}" já possui papel ativo de Administradora.`);
      }

      // 2. Insere perfil SINDICO
      await client.query(
        `INSERT INTO perfil (id_pessoa, tipo_perfil, data_inicio)
         VALUES ($1, 'SINDICO', CURRENT_DATE)`,
        [idPessoa]
      );

      return {
        sucesso: true,
        mensagem: `Permissão de Administradora concedida a "${pessoa[0].nome}" com sucesso!`,
      };
    });
  }

  /**
   * Revogar permissão de Administradora.
   */
  @Post('pessoas/:id/revogar-sindico')
  @Post('pessoas/:id/remover-administracao')
  async revogarSindico(@Param('id', ParseIntPipe) idPessoa: number) {
    const pessoa = await this.db.query(`SELECT id_pessoa, nome FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) throw new NotFoundException('Pessoa não encontrada.');

    const res = await this.db.query(
      `UPDATE perfil 
          SET data_fim = CURRENT_DATE 
        WHERE id_pessoa = $1 AND tipo_perfil = 'SINDICO' AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
        RETURNING id_perfil`,
      [idPessoa]
    );

    if (!res.length) {
      throw new BadRequestException(`"${pessoa[0].nome}" não possui papel ativo de Administradora para ser revogado.`);
    }

    return {
      sucesso: true,
      mensagem: `Permissão de Administradora de "${pessoa[0].nome}" revogada com sucesso.`,
    };
  }

  /**
   * EXCLUSÃO IRRESTRITA DE USUÁRIO (SUPERADMIN):
   * Remove o usuário e todas as suas referências e dependências de forma soberana e atômica.
   */
  @Delete('pessoas/:id')
  async excluirPessoaSuperadmin(
    @Req() req: any,
    @Param('id', ParseIntPipe) idPessoa: number
  ) {
    if (idPessoa === req.user?.sub) {
      throw new BadRequestException('Não é permitido excluir o usuário Superadministrador atualmente conectado.');
    }

    const pessoa = await this.db.query(`SELECT id_pessoa, nome FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) {
      throw new NotFoundException('Pessoa não encontrada no sistema.');
    }
    const nomePessoa = pessoa[0].nome;

    return this.db.transacao(async client => {
      // 1. Limpa encomendas vinculadas
      await client.query(`
        DELETE FROM encomenda 
         WHERE id_pessoa_destinatario = $1 
            OR id_perfil_recebimento IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
            OR id_perfil_entrega IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 2. Limpa empréstimo de chaves
      await client.query(`
        DELETE FROM entrega_chave 
         WHERE id_pessoa_solicitante = $1 
            OR id_perfil_solicitante IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
            OR id_perfil_entrega IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
            OR id_perfil_recebimento IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 3. Limpa reservas
      await client.query(`
        DELETE FROM reserva 
         WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 4. Limpa bloqueios de área registrados
      await client.query(`
        DELETE FROM bloqueio_area 
         WHERE id_perfil_registro IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 5. Limpa bloqueios de perfil
      await client.query(`
        DELETE FROM bloqueio_perfil 
         WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
            OR id_perfil_registro IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 6. Limpa leituras de avisos
      await client.query(`
        DELETE FROM aviso_perfil 
         WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 7. Limpa avisos publicados pelo autor
      await client.query(`
        DELETE FROM aviso 
         WHERE id_perfil_autor IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);

      // 8. Desvincula dependentes de que esta pessoa era responsável
      await client.query(`
        UPDATE pessoa_unidade 
           SET id_responsavel = NULL 
         WHERE id_responsavel = $1
      `, [idPessoa]);

      // 9. Remove vínculos de unidades
      await client.query(`
        DELETE FROM pessoa_unidade 
         WHERE id_pessoa = $1
      `, [idPessoa]);

      // 10. Desvincula e remove códigos de ativação
      await client.query(`
        UPDATE codigo_primeiro_acesso 
           SET id_perfil_gerador = NULL 
         WHERE id_perfil_gerador IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
      `, [idPessoa]);
      await client.query(`
        DELETE FROM codigo_primeiro_acesso 
         WHERE id_pessoa = $1
      `, [idPessoa]);

      // 11. Remove perfis
      await client.query(`
        DELETE FROM perfil 
         WHERE id_pessoa = $1
      `, [idPessoa]);

      // 12. Remove a pessoa
      await client.query(`
        DELETE FROM pessoa 
         WHERE id_pessoa = $1
      `, [idPessoa]);

      return {
        sucesso: true,
        mensagem: `Usuário "${nomePessoa}" e todas as suas referências foram excluídos definitivamente pelo Superadmin sem restrições.`,
      };
    });
  }

  /**
   * Alterar status da conta (ATIVO / BLOQUEADO).
   */
  @Patch('pessoas/:id/status')
  async alternarStatusConta(
    @Param('id', ParseIntPipe) idPessoa: number,
    @Body() body: { status_conta?: 'ATIVO' | 'BLOQUEADO'; ativo?: boolean }
  ) {
    const pessoa = await this.db.query(`SELECT id_pessoa, nome, status_conta, ativo FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) throw new NotFoundException('Pessoa não encontrada.');

    const novoStatus = body.status_conta || (pessoa[0].status_conta === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO');
    const novoAtivo = body.ativo !== undefined ? body.ativo : novoStatus === 'ATIVO';

    await this.db.query(
      `UPDATE pessoa SET status_conta = $1, ativo = $2 WHERE id_pessoa = $3`,
      [novoStatus, novoAtivo, idPessoa]
    );

    return {
      sucesso: true,
      mensagem: `Status de "${pessoa[0].nome}" atualizado para "${novoStatus}".`,
      status_conta: novoStatus,
      ativo: novoAtivo,
    };
  }

  /**
   * Edição irrestrita de dados da pessoa pelo Superadmin.
   */
  @Put('pessoas/:id')
  async editarPessoaSuperadmin(
    @Param('id', ParseIntPipe) idPessoa: number,
    @Body() body: { nome?: string; email?: string; celular?: string; data_nascimento?: string }
  ) {
    const pessoa = await this.db.query(`SELECT * FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) throw new NotFoundException('Pessoa não encontrada.');

    const nome = body.nome?.trim() || pessoa[0].nome;
    const email = body.email ? body.email.trim().toLowerCase() : pessoa[0].email;
    const celular = body.celular ? body.celular.replace(/\D/g, '') : pessoa[0].celular;
    const dataNascimento = body.data_nascimento || pessoa[0].data_nascimento;

    const res = await this.db.query(
      `UPDATE pessoa 
          SET nome = $1, email = $2, celular = $3, data_nascimento = $4
        WHERE id_pessoa = $5
        RETURNING id_pessoa, nome, email, cpf, celular, data_nascimento, ativo, status_conta`,
      [nome, email, celular, dataNascimento, idPessoa]
    );

    return {
      sucesso: true,
      mensagem: `Dados de "${nome}" atualizados com sucesso pelo Superadmin.`,
      pessoa: res[0],
    };
  }
}
