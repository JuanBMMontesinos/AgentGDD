import { expect, test } from '@playwright/test';
import {
  createTemporaryTestUser,
  signInAndEnableMockAi,
  type TestUserHandle,
} from '../helpers/supabase-test-user';

test.describe('AgentGDD Studio v2 End-to-End Tests', () => {
  let testUser: TestUserHandle;

  test.beforeAll(async () => {
    testUser = await createTemporaryTestUser();
  });

  test.afterAll(async () => {
    if (testUser) {
      await testUser.cleanup();
    }
  });

  test('redirects unauthenticated visitors cleanly, renders /guide tutorial, and authenticates', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Entrar ou Criar Conta/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ver Tutorial das 15 Seções/i })).toBeVisible();

    await page.getByRole('link', { name: /Ver Tutorial das 15 Seções/i }).click();
    await page.waitForURL('**/guide');
    await expect(page.getByRole('heading', { name: /A\. Conceito & Direção/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /D\. UI, Produção & Studio/i })).toBeVisible();

    await signInAndEnableMockAi(page, testUser.email, testUser.password);
    await expect(page.getByRole('heading', { name: /Meus Projetos GDD/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar Novo GDD' })).toBeVisible();
  });

  test('full v2/v3 studio flow: locked submit, live SSE progress, progressive lock, cancel & resume, copilot, export, audit, tables & share', async ({
    page,
    browser,
  }) => {
    await signInAndEnableMockAi(page, testUser.email, testUser.password);

    // Slow down first /generate call so Playwright deterministically inspects active SSE & cancellation states
    let generateAttempts = 0;
    await page.route('**/api/projects/*/generate', async (route) => {
      if (route.request().method() === 'POST') {
        generateAttempts += 1;
        if (generateAttempts === 1) {
          await route.fallback({
            headers: {
              ...route.request().headers(),
              'x-mock-ai': '1',
              'x-mock-stage-delay-ms': '1200',
            },
          });
          return;
        }
      }
      await route.fallback();
    });

    // Navigate to dedicated /new 3-step wizard
    await page.getByRole('link', { name: 'Criar Novo GDD' }).click();
    await page.waitForURL('**/new');
    await page.locator('form[data-hydrated="true"]').waitFor({ state: 'visible' });

    // Step 1: Select Neon Blades template and advance
    await page.getByRole('button', { name: /Neon Blades/i }).click();
    await expect(page.getByLabel('Título do Jogo *')).toHaveValue(/Neon Blades/);
    await page.getByRole('button', { name: /Avançar para Arquitetura/i }).click();

    // Step 2: Trigger real-time conflict detector, clear it, and advance
    await page.getByLabel('Web (HTML5/WebGL)').check();
    await expect(page.getByText(/Detector de Conflitos Técnicos/i)).toBeVisible();
    await page.getByLabel('Web (HTML5/WebGL)').uncheck();
    await page.getByRole('button', { name: /Avançar para Revisão/i }).click();

    // Step 3: Delay project creation slightly to verify anti-double-click submit lock
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 350));
      }
      await route.fallback();
    });

    await expect(page.getByText(/Resumo do Projeto/i)).toBeVisible();
    await page.getByRole('button', { name: /Criar & Abrir no Studio GDD/i }).click();
    await expect(page.getByRole('button', { name: /Criando e abrindo Studio GDD/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Voltar/i })).toBeDisabled();
    await page.waitForURL('**/projects/**');

    // Verify right Copilot drawer starts CLOSED by default
    await expect(page.getByRole('complementary', { name: 'Assistente Copiloto e Notas' })).toHaveCount(0);

    // During active Stage 1: verify Live Generation Panel, semantic progressbar, locked conflicting buttons & pending sections
    await expect(page.getByRole('heading', { name: /Gerando seu Game Design Document/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('progressbar', { name: /Progresso da geração do GDD/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auditar Qualidade' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Copiloto & Notas' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i })).toBeDisabled();

    // Wait for Stage 1 (sections 1..4) to finish and unlock progressively while Stage 2 runs
    await expect(page.getByRole('button', { name: /4\. Estilo Visual/i })).toBeEnabled({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i })).toBeDisabled();

    // Cancel generation mid-Stage 2 and verify Stage 1 preservation + Resume button
    await page.getByRole('button', { name: /Cancelar e Manter Seções Concluídas/i }).click();
    await expect(page.getByRole('button', { name: /Continuar Geração \(3 estágios\)/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i })).toBeDisabled();

    // Verify completed Stage 1 section 4 is immediately readable even after partial cancel
    await page.getByRole('button', { name: /4\. Estilo Visual/i }).click();
    await expect(page.getByText('#0EA5E9').first()).toBeVisible();

    // Resume generation to complete remaining stages 2..4
    await page.getByRole('button', { name: /Continuar Geração \(3 estágios\)/i }).click();
    await expect(page.getByText(/GDD completo gerado e auditado/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Score: (9\d|100)%/i)).toBeVisible();

    // Verify discipline-grouped sidebar & contextual section guide banner
    await expect(page.getByRole('button', { name: /A\. Conceito & Direção/i })).toBeVisible();
    await expect(page.getByText(/O que vai aqui:/i)).toBeVisible();

    // Check Section 4 Visual HEX Palette
    await page.getByRole('button', { name: /4\. Estilo Visual/i }).click();
    await expect(page.getByRole('heading', { name: /Paleta HEX Visual/i })).toBeVisible();
    await expect(page.getByText('#0EA5E9').first()).toBeVisible();

    // Check Section 6 Mermaid diagram rendering (now unlocked after resume)
    await expect(page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i })).toBeEnabled();
    await page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i }).click();
    await expect(page.getByText(/Diagrama visual gerado pelo fluxo do GDD/i)).toBeVisible();

    // Toggle Right Copilot & Notes Drawer open and closed
    await page.getByRole('button', { name: 'Copiloto & Notas' }).click();
    await expect(page.getByRole('complementary', { name: 'Assistente Copiloto e Notas' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar painel Copiloto e Notas' }).click();
    await expect(page.getByRole('complementary', { name: 'Assistente Copiloto e Notas' })).toHaveCount(0);

    // Test Export disclosure dropdown & Escape dismiss
    await page.getByRole('button', { name: 'Exportar' }).click();
    await expect(page.getByRole('link', { name: /CSV Backlog/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: /CSV Backlog/i })).toHaveCount(0);

    // Open Audit Checklist modal
    await page.getByRole('button', { name: 'Auditar Qualidade' }).click();
    await expect(
      page.getByRole('heading', { name: /Auditoria de Qualidade & Consistência/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Fechar relatório de auditoria' }).click();

    // Open Global Tool: Tabelas and add enemy
    await page.getByRole('button', { name: /Tabelas \(/i }).click();
    await page.getByLabel(/Nome \(Inimigos\)/i).fill('Ciber-Cão');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByRole('rowheader', { name: 'Ciber-Cão' })).toBeVisible();

    // Open Share popover, enable public link, and verify in fresh incognito context
    await page.getByRole('button', { name: 'Compartilhar' }).click();
    await page.getByRole('button', { name: 'Ativar Link Público' }).click();
    const shareAnchor = page.locator('a[href^="/share/"]');
    await expect(shareAnchor).toBeVisible();
    const shareHref = await shareAnchor.getAttribute('href');
    expect(shareHref).toBeTruthy();

    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(shareHref!);
    await expect(anonPage.getByRole('heading', { name: /Neon Blades/i })).toBeVisible();
    await anonContext.close();
  });
});
