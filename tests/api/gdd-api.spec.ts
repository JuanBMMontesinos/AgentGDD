import { expect, test } from '@playwright/test';
import {
  createTemporaryTestUser,
  signInAndEnableMockAi,
  type TestUserHandle,
} from '../helpers/supabase-test-user';

test.describe('AgentGDD API Integration Tests', () => {
  let testUser: TestUserHandle;

  test.beforeAll(async () => {
    testUser = await createTemporaryTestUser();
  });

  test.afterAll(async () => {
    if (testUser) {
      await testUser.cleanup();
    }
  });

  test('public endpoints return health and 11 seeded templates while protecting /api/projects', async ({
    request,
  }) => {
    const healthRes = await request.get('/api/health');
    expect(healthRes.status()).toBe(200);
    const health = await healthRes.json();
    expect(health.database).toBe('connected');

    const tplRes = await request.get('/api/templates');
    expect(tplRes.status()).toBe(200);
    const tplJson = await tplRes.json();
    expect(tplJson.templates.length).toBeGreaterThanOrEqual(11);

    const unauthRes = await request.get('/api/projects');
    expect(unauthRes.status()).toBe(401);
  });

  test('authenticated full API lifecycle: create, generate, refine, entities, audit, versions, export, share', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAndEnableMockAi(page, testUser.email, testUser.password);

    const api = page.request;

    // 1. Create project
    const createRes = await api.post('/api/projects', {
      data: {
        title: 'API Test Cyber Blade',
        studioName: 'Test Studio',
        language: 'pt-BR',
        depthMode: 'full',
        conceptBrief: {
          title: 'API Test Cyber Blade',
          idea: 'Jogo de ação cyberpunk cooperativo para 2-4 jogadores com parkour.',
          engine: 'Unreal Engine 5.4+',
          dimensionality: '3D',
          camera: 'Primeira Pessoa',
          platforms: ['PC (Windows/Linux)'],
          multiplayer: true,
        },
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const projectId = created.project.id as string;

    // 2. Generate GDD (mock AI enabled via x-mock-ai header)
    const genRes = await api.post(`/api/projects/${projectId}/generate`, {
      headers: { 'x-mock-ai': '1' },
      data: { model: 'gemini-3.8-flash' },
    });
    expect(genRes.status()).toBe(200);
    const sseBody = await genRes.text();
    expect(sseBody).toContain('event: done');

    // 3. Hydrate detail and assert 15 sections + extracted entities
    const detailRes = await api.get(`/api/projects/${projectId}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.sections).toHaveLength(15);
    expect(detail.entities.length).toBeGreaterThan(5);
    expect(detail.project.completeness_score).toBeGreaterThanOrEqual(90);

    // 4. Refine section 6
    const refineRes = await api.post(`/api/projects/${projectId}/sections/6/refine`, {
      headers: { 'x-mock-ai': '1' },
      data: { instruction: 'Adicionar dash aéreo.' },
    });
    expect(refineRes.status()).toBe(200);
    const refined = await refineRes.json();
    expect(refined.section.content_markdown).toContain('Adicionar dash aéreo.');

    // 5. Add & delete entity
    const entRes = await api.post(`/api/projects/${projectId}/entities`, {
      data: {
        entity_type: 'enemy',
        name: 'Torreta Laser',
        attributes: { Vida: '90', Dano: '15' },
      },
    });
    expect(entRes.status()).toBe(201);
    const entJson = await entRes.json();
    const delEntRes = await api.delete(`/api/projects/${projectId}/entities/${entJson.entity.id}`);
    expect(delEntRes.status()).toBe(200);

    // 6. Create version snapshot & restore
    const verRes = await api.post(`/api/projects/${projectId}/versions`, {
      data: { version_label: 'v1.2', changelog_note: 'Teste API' },
    });
    expect(verRes.status()).toBe(201);
    const verJson = await verRes.json();
    const restoreRes = await api.post(
      `/api/projects/${projectId}/versions/${verJson.version.id}/restore`
    );
    expect(restoreRes.status()).toBe(200);

    // 7. Toggle public sharing and verify public endpoint
    const sharePatch = await api.patch(`/api/projects/${projectId}`, {
      data: { is_public: true },
    });
    expect(sharePatch.status()).toBe(200);
    const sharePatchJson = await sharePatch.json();
    const shareSlug = sharePatchJson.project.share_slug as string;
    expect(shareSlug).toBeTruthy();

    const publicRes = await api.get(`/api/share/${shareSlug}`);
    expect(publicRes.status()).toBe(200);

    // 8. Export formats (.md, .json, .csv)
    const mdRes = await api.get(`/api/projects/${projectId}/export?format=md`);
    expect(mdRes.status()).toBe(200);
    expect(await mdRes.text()).toContain('API Test Cyber Blade');

    const csvRes = await api.get(`/api/projects/${projectId}/export?format=csv`);
    expect(csvRes.status()).toBe(200);
    expect(await csvRes.text()).toContain('Epic,Task,Category');

    const jsonRes = await api.get(`/api/projects/${projectId}/export?format=json`);
    expect(jsonRes.status()).toBe(200);

    // 9. Moodboard endpoint (mocked)
    const moodRes = await api.post(`/api/projects/${projectId}/moodboard`, {
      headers: { 'x-mock-ai': '1' },
    });
    expect(moodRes.status()).toBe(200);
    const moodJson = await moodRes.json();
    expect(moodJson.moodboard_image_url).toContain('data:image/png;base64');

    // 9b. resumeOnlyMissing rejects when all sections are already filled; cancel endpoint stays safe
    const fullResumeRes = await api.post(`/api/projects/${projectId}/generate`, {
      headers: { 'x-mock-ai': '1' },
      data: { resumeOnlyMissing: true },
    });
    expect(fullResumeRes.status()).toBe(400);

    const cancelRes = await api.post(`/api/projects/${projectId}/generate/cancel`);
    expect(cancelRes.status()).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.cancelled).toBe(true);
    expect(typeof cancelJson.overallScore).toBe('number');

    // 10. Delete project
    const delProj = await api.delete(`/api/projects/${projectId}`);
    expect(delProj.status()).toBe(200);

    await context.close();
  });

  test('partial generation cancel preserves sections and resumeOnlyMissing completes remaining stages', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAndEnableMockAi(page, testUser.email, testUser.password);
    const api = page.request;

    const createRes = await api.post('/api/projects', {
      data: {
        title: 'API Partial Resume Project',
        studioName: 'Test Studio',
        language: 'pt-BR',
        depthMode: 'full',
        conceptBrief: {
          title: 'API Partial Resume Project',
          idea: 'Tactical RPG por turnos com esquadrão de 4 unidades.',
          engine: 'Godot 4.3+',
          dimensionality: '2.5D',
          camera: 'Isométrica',
          platforms: ['PC (Windows/Linux)'],
          multiplayer: true,
        },
      },
    });
    expect(createRes.status()).toBe(201);
    const { project } = await createRes.json();
    const partialId = project.id as string;

    // Seed only Stage 1 sections (1..4) manually to simulate cancelled after Stage 1
    for (const secNum of [1, 2, 3, 4]) {
      const patchRes = await api.patch(`/api/projects/${partialId}/sections/${secNum}`, {
        data: {
          content_markdown: `CONTEUDO PARCIAL PRESERVADO SECAO ${secNum} com parâmetros numéricos 12 e 24.`,
        },
      });
      expect(patchRes.status()).toBe(200);
    }

    const cancelRes = await api.post(`/api/projects/${partialId}/generate/cancel`);
    expect(cancelRes.status()).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.cancelled).toBe(true);

    // Resume only missing stages (should run 3 stages: 2, 3, 4 and skip Stage 1)
    const resumeRes = await api.post(`/api/projects/${partialId}/generate`, {
      headers: { 'x-mock-ai': '1' },
      data: { resumeOnlyMissing: true },
    });
    expect(resumeRes.status()).toBe(200);
    const resumeSse = await resumeRes.text();
    expect(resumeSse).toContain('"totalStages":3');
    expect(resumeSse).toContain('"stageNumber":2');
    expect(resumeSse).toContain('"stageNumber":4');
    expect(resumeSse).not.toContain('"stageNumber":1');
    expect(resumeSse).toContain('event: done');

    const detailRes = await api.get(`/api/projects/${partialId}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.sections).toHaveLength(15);
    const sec1 = detail.sections.find((s: { section_number: number }) => s.section_number === 1);
    expect(sec1.content_markdown).toContain('CONTEUDO PARCIAL PRESERVADO SECAO 1');

    const delRes = await api.delete(`/api/projects/${partialId}`);
    expect(delRes.status()).toBe(200);
    await context.close();
  });
});
