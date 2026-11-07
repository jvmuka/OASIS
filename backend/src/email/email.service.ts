import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface OpcoesEmail {
  para: string;
  assunto: string;
  html: string;
  texto?: string;
}

/**
 * Função utilitária para ofuscar o e-mail em exibições públicas/telas,
 * oferecendo uma dica clara para idosos sem expor o e-mail completo.
 * Exemplo: 'carlos.silva@gmail.com' -> 'ca******a@gmail.com'
 */
export function ofuscarEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [usuario, dominio] = email.trim().toLowerCase().split('@');
  if (usuario.length <= 2) {
    return `${usuario[0]}*@${dominio}`;
  }
  const visivelInicio = usuario.slice(0, 2);
  const visivelFim = usuario.slice(-1);
  const mascara = '*'.repeat(Math.max(3, usuario.length - 3));
  return `${visivelInicio}${mascara}${visivelFim}@${dominio}`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.inicializarTransporter();
  }

  private inicializarTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`Transporter SMTP configurado para o host: ${host}:${port}`);
    } else {
      this.logger.log(
        'Configurações SMTP não informadas no .env. O EmailService operará em modo SIMULADO/DEV com logs no console.',
      );
    }
  }

  private getAppUrl(): string {
    return (process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
  }

  private getFrom(): string {
    return process.env.SMTP_FROM || 'OASIS Residencial <nao-responda@oasiscondominio.com.br>';
  }

  /**
   * Envia um e-mail com tratamento de contingência resiliente.
   * Não derruba a requisição em caso de falha de conexão SMTP externa.
   */
  async enviarEmail(opcoes: OpcoesEmail): Promise<{ enviado: boolean; modo: string; erro?: string }> {
    const remetente = this.getFrom();

    if (!this.transporter) {
      this.logger.log(
        `\n==================== [E-MAIL SIMULADO / DEV] ====================\n` +
          `Para: ${opcoes.para}\n` +
          `De: ${remetente}\n` +
          `Assunto: ${opcoes.assunto}\n` +
          `Conteúdo Texto: ${opcoes.texto || '(Ver versão HTML)'}\n` +
          `=================================================================\n`,
      );
      return { enviado: true, modo: 'simulado' };
    }

    try {
      await this.transporter.sendMail({
        from: remetente,
        to: opcoes.para,
        subject: opcoes.assunto,
        text: opcoes.texto,
        html: opcoes.html,
      });
      this.logger.log(`E-mail enviado com sucesso via SMTP para: ${opcoes.para}`);
      return { enviado: true, modo: 'smtp' };
    } catch (err: any) {
      this.logger.warn(`Falha ao enviar e-mail via SMTP para ${opcoes.para}: ${err.message}. Registrado em log.`);
      // Modo de fallback: loga o conteúdo para garantir que nada se perca
      this.logger.log(
        `\n[FALLBACK CONSOLE] Para: ${opcoes.para} | Assunto: ${opcoes.assunto}\nTexto: ${opcoes.texto || opcoes.html.slice(0, 300)}...\n`,
      );
      return { enviado: false, modo: 'falha_smtp', erro: err.message };
    }
  }

  /**
   * Layout base dos e-mails no padrão visual moderno Lettly SaaS / OASIS.
   */
  private renderizarLayoutBase(conteudoHtml: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OASIS Residencial</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background-color: #0b1830; padding: 28px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; font-weight: 500; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #334155; }
    .box-destaque { background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .codigo { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #0284c7; margin: 8px 0; }
    .btn { display: inline-block; background-color: #0b1830; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-top: 16px; text-align: center; }
    .passos { background-color: #f8fafc; border-radius: 12px; padding: 18px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .passos ol { margin: 0; padding-left: 20px; }
    .passos li { margin-bottom: 8px; font-size: 14px; }
    .passos li:last-child { margin-bottom: 0; }
    .aviso { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌴 OASIS</h1>
      <p>Gestão Condominial Inteligente</p>
    </div>
    <div class="content">
      ${conteudoHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Condomínio Residencial OASIS · Todos os direitos reservados.</p>
      <p>Mensagem gerada automaticamente pelo sistema do condomínio.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * E-mail 1: Boas-vindas e Código de Primeiro Acesso.
   * Especialmente planejado para clareza e facilidade de leitura para idosos.
   */
  async enviarCodigoPrimeiroAcesso(dados: {
    para: string;
    nome: string;
    codigo: string;
    nomeCondominio?: string;
    unidade?: string;
  }) {
    const appUrl = this.getAppUrl();
    const linkLogin = `${appUrl}/login`;
    const primeiroNome = (dados.nome || 'Morador(a)').split(' ')[0];
    const condominio = dados.nomeCondominio || 'Condomínio Residencial OASIS';
    const unidadeTexto = dados.unidade ? ` (Unidade: ${dados.unidade})` : '';

    const conteudoHtml = `
      <h2 style="color: #0b1830; margin-top: 0; font-size: 20px;">Olá, ${primeiroNome}!</h2>
      <p>Seja muito bem-vindo(a) ao <b>${condominio}</b>${unidadeTexto}! O seu acesso ao nosso sistema online está pronto para ser ativado.</p>
      
      <p>Para criar a sua senha pessoal e ter acesso a reservas de áreas comuns, comunicados e controle de encomendas, use o seu <b>Código de Primeiro Acesso</b>:</p>

      <div class="box-destaque">
        <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Seu Código de Ativação:</div>
        <div class="codigo">${dados.codigo}</div>
        <div style="font-size: 12px; color: #64748b;">Guarde este código para ativar sua conta</div>
      </div>

      <div class="passos">
        <b style="color: #0b1830; display: block; margin-bottom: 8px;">Como ativar sua conta em 3 passos fáceis:</b>
        <ol>
          <li>Acesse a tela de entrada do sistema clicando no botão abaixo.</li>
          <li>Clique na opção <b>"Primeiro Acesso (Código)"</b>.</li>
          <li>Digite o seu código <b>${dados.codigo}</b> e o seu <b>CPF</b> (ou este e-mail), e crie sua senha de preferência.</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${linkLogin}" class="btn" target="_blank">Acessar o Sistema e Ativar Conta</a>
      </div>

      <p style="font-size: 13px; color: #475569; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;">
        💡 <b>Dica de facilidade:</b> Para entrar no sistema, você nunca precisará decorar seu e-mail se não quiser — você pode sempre fazer o login utilizando apenas o seu número de <b>CPF</b> e sua senha!
      </p>

      <div class="aviso">
        Se tiver qualquer dúvida ou dificuldade para acessar, procure a administração ou a portaria do condomínio para assistência.
      </div>
    `;

    return this.enviarEmail({
      para: dados.para,
      assunto: `🌴 Bem-vindo ao ${condominio} - Seu Código de Primeiro Acesso: ${dados.codigo}`,
      texto: `Olá ${primeiroNome}!\n\nSeja bem-vindo ao ${condominio}.\nSeu código de primeiro acesso é: ${dados.codigo}\n\nAcesse ${linkLogin}, selecione 'Primeiro Acesso' e informe seu código e CPF ou e-mail para cadastrar sua senha.`,
      html: this.renderizarLayoutBase(conteudoHtml),
    });
  }

  /**
   * E-mail 2: Código de Recuperação de Senha ("Esqueci Minha Senha").
   */
  async enviarCodigoRecuperacaoSenha(dados: {
    para: string;
    nome: string;
    codigo: string;
  }) {
    const appUrl = this.getAppUrl();
    const linkLogin = `${appUrl}/login`;
    const primeiroNome = (dados.nome || 'Usuário').split(' ')[0];

    const conteudoHtml = `
      <h2 style="color: #0b1830; margin-top: 0; font-size: 20px;">Olá, ${primeiroNome}!</h2>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema do <b>Condomínio OASIS</b>.</p>
      
      <p>Para cadastrar uma nova senha, utilize o código de verificação abaixo:</p>

      <div class="box-destaque">
        <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Código de Recuperação:</div>
        <div class="codigo">${dados.codigo}</div>
        <div style="font-size: 12px; color: #ef4444; font-weight: 600;">⏱️ Este código expira em 2 horas</div>
      </div>

      <div class="passos">
        <b style="color: #0b1830; display: block; margin-bottom: 8px;">Instruções:</b>
        <ol>
          <li>Volte à tela de redefinição de senha no sistema.</li>
          <li>Insira o código <b>${dados.codigo}</b>.</li>
          <li>Digite a sua nova senha e confirme.</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${linkLogin}" class="btn" target="_blank">Ir para a Tela de Acesso</a>
      </div>

      <div class="aviso">
        <b>Segurança:</b> Se você <b>não</b> solicitou a redefinição de sua senha, ignore este e-mail. A sua senha atual permanecerá segura e inalterada.
      </div>
    `;

    return this.enviarEmail({
      para: dados.para,
      assunto: `🔒 OASIS - Código para Recuperação de Senha: ${dados.codigo}`,
      texto: `Olá ${primeiroNome}!\n\nRecebemos uma solicitação de redefinição de senha para sua conta OASIS.\nSeu código de recuperação é: ${dados.codigo} (válido por 2 horas).\n\nAcesse ${linkLogin} para concluir a alteração. Caso não tenha solicitado, ignore esta mensagem.`,
      html: this.renderizarLayoutBase(conteudoHtml),
    });
  }

  /**
   * E-mail 3: Notificação de Confirmação de Senha Redefinida.
   */
  async enviarConfirmacaoSenhaAlterada(dados: { para: string; nome: string }) {
    const appUrl = this.getAppUrl();
    const primeiroNome = (dados.nome || 'Usuário').split(' ')[0];

    const conteudoHtml = `
      <h2 style="color: #0b1830; margin-top: 0; font-size: 20px;">Olá, ${primeiroNome}!</h2>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="color: #166534; font-weight: 700; margin: 0; font-size: 16px;">✓ Senha alterada com sucesso!</p>
        <p style="color: #15803d; margin: 6px 0 0 0; font-size: 14px;">A senha da sua conta OASIS foi atualizada com sucesso.</p>
      </div>
      <p>Você já pode acessar o sistema utilizando sua nova senha pessoal e seu <b>E-mail ou CPF</b>.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}/login" class="btn" target="_blank">Acessar o Sistema</a>
      </div>
      <div class="aviso">
        Se você não realizou esta alteração, entre em contato imediatamente com a administração do condomínio.
      </div>
    `;

    return this.enviarEmail({
      para: dados.para,
      assunto: `✓ OASIS - Sua senha foi atualizada com sucesso`,
      texto: `Olá ${primeiroNome}!\n\nA senha da sua conta OASIS foi atualizada com sucesso. Você já pode acessar em ${appUrl}/login.`,
      html: this.renderizarLayoutBase(conteudoHtml),
    });
  }

  /**
   * E-mail 4: Boas-vindas após Primeiro Acesso Concluído.
   */
  async enviarBoasVindasContaAtivada(dados: { para: string; nome: string }) {
    const appUrl = this.getAppUrl();
    const primeiroNome = (dados.nome || 'Usuário').split(' ')[0];

    const conteudoHtml = `
      <h2 style="color: #0b1830; margin-top: 0; font-size: 20px;">Parabéns, ${primeiroNome}!</h2>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="color: #166534; font-weight: 700; margin: 0; font-size: 16px;">✓ Sua conta foi ativada com sucesso!</p>
        <p style="color: #15803d; margin: 6px 0 0 0; font-size: 14px;">Seu primeiro acesso foi concluído e sua senha pessoal está configurada.</p>
      </div>
      <p>Agora você tem acesso completo a todos os serviços digitais do seu condomínio:</p>
      <ul>
        <li>Reserva online de áreas comuns (Churrasqueira, Salão de Festas, etc.)</li>
        <li>Acompanhamento de encomendas na portaria</li>
        <li>Abertura e acompanhamento de chamados e ocorrências</li>
        <li>Mural de avisos e comunicados em tempo real</li>
      </ul>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}/login" class="btn" target="_blank">Acessar Minha Conta</a>
      </div>
    `;

    return this.enviarEmail({
      para: dados.para,
      assunto: `🌴 Bem-vindo ao OASIS - Conta Ativada com Sucesso!`,
      texto: `Olá ${primeiroNome}!\n\nSua conta OASIS foi ativada com sucesso! Acesse ${appUrl}/login com seu CPF ou e-mail e aproveite os recursos do condomínio.`,
      html: this.renderizarLayoutBase(conteudoHtml),
    });
  }
}
