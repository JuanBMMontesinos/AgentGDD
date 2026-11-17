import { expect, test } from '@playwright/test';
import {
  createTemporaryTestUser,
  signInAndEnableMockAi,
  type TestUserHandle,
} from '../helpers/supabase-test-user';

test.describe('AgentGDD Studio End-to-End Tests', () => {
  let testUser: TestUserHandle;

  test.beforeAll(async () => {
    testUser = await createTemporaryTestUser();
  });

  test.afterAll(async () => {
    if (testUser) {
      await testUser.cleanup();
    }
  });

  test('redirects unauthenticated visitors cleanly and authenticates via Supabase Auth', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Entrar ou Criar Conta/i })).toBeVisible();

    await signInAndEnableMockAi(page, testUser.email, testUser.password);
    await expect(page.getByRole('heading', { name: /Meus Projetos GDD/i })).toBeVisible();
  });

  test('full GDD studio flow: template wizard, conflict detector, generation, palette, entities, audit, share', async ({
    page,
    browser,
  }) => {
    await signInAndEnableMockAi(page, testUser.email, testUser.password);

    // Select featured Cyberpunk template
    await page.getByRole('button', { name: /Neon Blades/i }).click();
    await expect(page.getByLabel('Título do Jogo *')).toHaveValue(/Neon Blades/);

    // Verify conflict detector triggers when switching to Unreal + Web
    await page.getByLabel('Web (HTML5/WebGL)').check();
    await expect(page.getByText(/Detector de Conflitos Técnicos/i)).toBeVisible();
    await page.getByLabel('Web (HTML5/WebGL)').uncheck();

    // Create and auto-generate
    await page.getByRole('button', { name: /Criar & Abrir no Studio GDD/i }).click();
    await page.waitForURL('**/projects/**');

    // Wait for mocked multi-stage generation to finish
    await expect(page.getByText(/GDD completo gerado e auditado/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Score: (9\d|100)%/i)).toBeVisible();

    // Check Section 4 Visual HEX Palette
    await page.getByRole('button', { name: /4\. Estilo Visual/i }).click();
    await expect(page.getByRole('heading', { name: /Paleta HEX Visual/i })).toBeVisible();
    await expect(page.getByText('#0EA5E9').first()).toBeVisible();

    // Check Section 6 Mermaid diagram rendering
    await page.getByRole('button', { name: /6\. Mecânicas de Gameplay/i }).click();
    await expect(page.getByText(/Diagrama visual gerado pelo fluxo do GDD/i)).toBeVisible();

    // Open Audit Checklist modal
    await page.getByRole('button', { name: 'Auditar Qualidade' }).click();
    await expect(
      page.getByRole('heading', { name: /Auditoria de Qualidade & Consistência/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Fechar relatório de auditoria' }).click();

    // Add structured enemy in Tables tab
    await page.getByRole('tab', { name: /Tabelas/i }).click();
    await page.getByLabel(/Nome \(Inimigos\)/i).fill('Ciber-Cão');
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByRole('rowheader', { name: 'Ciber-Cão' })).toBeVisible();

    // Enable public share link and verify in fresh anonymous context
    await page.getByRole('button', { name: 'Compartilhar' }).click();
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
