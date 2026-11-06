const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const rotasParaTestar = [
  { rota: '/inicio', nome: 'inicio' },
  { rota: '/morador/chamados', nome: 'morador-chamados' },
  { rota: '/sindico/chamados', nome: 'sindico-chamados' },
  { rota: '/morador/reservar', nome: 'morador-reservar' },
  { rota: '/morador/reservas', nome: 'morador-reservas' },
  { rota: '/morador/encomendas', nome: 'morador-encomendas' },
  { rota: '/mural', nome: 'mural' },
  { rota: '/morador/familia', nome: 'morador-familia' },
  { rota: '/portaria/painel', nome: 'portaria-painel' },
  { rota: '/portaria/encomendas', nome: 'portaria-encomendas' },
  { rota: '/portaria/chaves', nome: 'portaria-chaves' },
  { rota: '/portaria/areas-livres', nome: 'portaria-areas-livres' },
  { rota: '/sindico/painel', nome: 'sindico-painel' },
  { rota: '/sindico/areas', nome: 'sindico-areas' },
  { rota: '/sindico/pessoas', nome: 'sindico-pessoas' },
  { rota: '/sindico/avisos', nome: 'sindico-avisos' },
  { rota: '/superadmin/condominios', nome: 'superadmin-condominios' },
  { rota: '/superadmin/estrutura', nome: 'superadmin-estrutura' },
  { rota: '/superadmin/pessoas', nome: 'superadmin-pessoas' },
];

async function run() {
  console.log('🚀 Iniciando Chrome para teste de Help de Contexto e Tour Guiado...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // 1. Fazer Login como Superadmin
  console.log('🔑 Acessando tela de login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#btn-login-superadmin', { timeout: 10000 });
  await page.click('#btn-login-superadmin');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
  console.log('✅ Login efetuado com sucesso!');

  const resultados = [];
  const screenshotsDir = path.join(__dirname, 'screenshots_testes');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const item of rotasParaTestar) {
    try {
      await page.goto(`http://localhost:5173${item.rota}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      // Localizar o botão de ajuda (?)
      const btnAjuda = await page.$('button[title*="ajuda" i], button[title*="Ajuda"], button[aria-label*="ajuda" i]');
      if (!btnAjuda) {
        const botoes = await page.$$('button');
        let achou = null;
        for (const b of botoes) {
          const txt = await page.evaluate(el => el.textContent.trim(), b);
          if (txt === '?') {
            achou = b;
            break;
          }
        }
        if (!achou) {
          throw new Error('Botão de ajuda (?) não encontrado');
        }
        await achou.click();
      } else {
        await btnAjuda.click();
      }

      await new Promise(r => setTimeout(r, 600));

      // Verificar se o modal de ajuda abriu
      const modalVisivel = await page.evaluate(() => {
        return !!document.querySelector('.fixed.inset-0.z-50') || !!document.querySelector('[role="dialog"]');
      });

      // Verificar simulador animado
      const temSimulador = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Animação:') || text.includes('Simulação') || text.includes('Reproduzir') || text.includes('Pausar');
      });

      // Salvar screenshot do modal com simulador
      const screenshotModalPath = path.join(screenshotsDir, `${item.nome}-modal.png`);
      await page.screenshot({ path: screenshotModalPath });

      // Clicar em "Ver Onde Clicar na Tela Real (Iniciar Demonstração Guiada)"
      const btnTour = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Ver Onde Clicar') || b.textContent.includes('Iniciar Demonstração Guiada'));
      });

      let tourIniciado = false;
      let spotlightAtivo = false;

      if (btnTour && btnTour.asElement()) {
        await btnTour.asElement().click();
        await new Promise(r => setTimeout(r, 800));

        // Verificar se o tour iniciou e se há elemento com spotlight ativo
        const statusTour = await page.evaluate(() => {
          const barraTour = document.body.innerText.includes('Tour Guiado:') || document.body.innerText.includes('Passo 1 de');
          const spotlight = !!document.querySelector('.tour-spotlight-active');
          return { barraTour, spotlight };
        });

        tourIniciado = statusTour.barraTour;
        spotlightAtivo = statusTour.spotlight;

        const screenshotTourPath = path.join(screenshotsDir, `${item.nome}-tour.png`);
        await page.screenshot({ path: screenshotTourPath });
      }

      resultados.push({
        rota: item.rota,
        status: (modalVisivel && temSimulador && tourIniciado && spotlightAtivo) ? 'PERFEITO' : 'ATENÇÃO',
        modalVisivel,
        temSimulador,
        tourIniciado,
        spotlightAtivo,
      });

      console.log(`  ✅ ${item.rota.padEnd(25)} | Modal=${modalVisivel} | Simulador=${temSimulador} | Tour=${tourIniciado} | Spotlight=${spotlightAtivo}`);
    } catch (err) {
      console.error(`  ❌ ${item.rota}: ${err.message}`);
      resultados.push({
        rota: item.rota,
        status: 'ERRO',
        erro: err.message,
      });
    }
  }

  await browser.close();

  console.log('\n=======================================');
  console.log('📋 RESUMO CONSOLIDADO DOS TESTES DE HELP');
  console.log('=======================================');
  console.table(resultados);
}

run().catch(err => {
  console.error('Falha geral no script de testes:', err);
  process.exit(1);
});
