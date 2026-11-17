import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

export interface TestUserHandle {
  id: string;
  email: string;
  password: string;
  cleanup: () => Promise<void>;
}

/**
 * Provisions a temporary email-confirmed Supabase Auth user via the Admin API
 * and returns a cleanup callback that deletes the user (and cascaded projects).
 */
export async function createTemporaryTestUser(): Promise<TestUserHandle> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for tests.');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `pw-test-${unique}@agentgdd.local`;
  const password = `AgentGdd!${unique}99`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to provision test user: ${error?.message ?? 'unknown error'}`);
  }

  const userId = data.user.id;

  return {
    id: userId,
    email,
    password,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(userId);
    },
  };
}

/**
 * Signs into `/login` inside a Playwright Page and attaches `x-mock-ai: 1`
 * strictly to same-origin `/api/**` calls for deterministic test execution.
 */
export async function signInAndEnableMockAi(page: Page, email: string, password: string) {
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      'x-mock-ai': '1',
    };
    await route.continue({ headers });
  });

  await page.goto('/login', { waitUntil: 'load' });
  await page.locator('form[data-hydrated="true"]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Acessar Studio' }).click();
  await page.waitForURL((url) => url.pathname === '/', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
}
