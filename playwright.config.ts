import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const args = process.argv.slice(2);
const projectFlagIndex = args.findIndex((a) => a === '--project' || a.startsWith('--project='));
const isUnitOnly =
  process.env.PW_SKIP_SERVER === '1' ||
  (projectFlagIndex !== -1 &&
    (args[projectFlagIndex] === '--project=unit' || args[projectFlagIndex + 1] === 'unit'));

const TEST_PORT = process.env.PW_PORT ?? '3105';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const hasBuild = fs.existsSync(path.resolve(process.cwd(), '.next', 'BUILD_ID'));

export default defineConfig({
  testDir: './tests',
  fullyParallel: isUnitOnly,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: isUnitOnly ? undefined : 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--disable-gpu', '--no-sandbox', '--remote-debugging-port=0'],
    },
  },
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
      use: {},
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
  ],
  ...(isUnitOnly
    ? {}
    : {
        webServer: {
          command:
            hasBuild && process.env.PW_DEV !== '1'
              ? `pnpm next start --port ${TEST_PORT} --hostname 127.0.0.1`
              : `pnpm next dev --turbopack --port ${TEST_PORT} --hostname 127.0.0.1`,
          url: `${BASE_URL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            E2E_MOCK_AI: '1',
          },
        },
      }),
});
