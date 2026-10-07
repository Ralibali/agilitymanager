import { expect, test, type Page, type BrowserContext, type Route } from '@playwright/test';

const key = 'am-redesign-planner-v2';
const course = {
  version: 2, name: 'QA privat bana', sport: 'agility', sizeClass: 'L', arenaWidthM: 30, arenaHeightM: 40,
  classTemplate: 'agility_1', ruleSetId: 'skk-agility-2023',
  obstacles: [
    { id: 'start', type: 'start', x: 5, y: 1, rotation: 0 },
    { id: 'one', type: 'jump', x: 5, y: 6, rotation: 0, number: 1 },
    { id: 'two', type: 'tunnel', x: 15, y: 15, rotation: 20, number: 2, curveDeg: 60 },
    { id: 'three', type: 'jump', x: 24, y: 29, rotation: 0, number: 3 },
    { id: 'finish', type: 'finish', x: 24, y: 35, rotation: 0 },
  ],
};
async function setup(page: Page) {
  await page.goto('/banplanerare');
  const consent = page.getByRole('button', { name: 'Endast nödvändiga', exact: true });
  if (await consent.isVisible()) await consent.click();
  await expect(page.getByRole('textbox', { name: 'Banans namn' })).toBeVisible();
}
async function importCourse(page: Page) {
  await page.locator('input[type=file]').setInputFiles({ name: 'bana.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(course)) });
  await expect(page.getByRole('textbox', { name: 'Banans namn' })).toHaveValue(course.name);
}
async function stored(page: Page) { return page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), key); }
async function save(page: Page) { await page.getByRole('button', { name: 'Spara bana', exact: true }).click(); }
async function open(page: Page) {
  await page.getByRole('button', { name: /^Bana-meny/ }).click();
  await page.getByRole('menuitem', { name: /^Öppna bana/ }).click();
}

test('length breakdown, view and undo/redo survive reload; PNG confirms a real download', async ({ page }) => {
  test.skip(test.info().project.name === 'mobil', 'Desktop history and export regression');
  await setup(page); await importCourse(page);
  await page.keyboard.press('d');
  await expect(page.locator('[data-distance-label]').filter({ hasText: 'Start:' })).toHaveCount(1);
  await expect(page.locator('[data-distance-label]').filter({ hasText: 'Mål:' })).toHaveCount(1);
  await page.getByRole('button', { name: /^Regelkontroll —/ }).click();
  await page.getByText(/^Kontrollera banlängden/).click();
  const table = page.getByTestId('course-measurements');
  await expect(table).toContainText('Start → 1'); await expect(table).toContainText('3 → Mål');
  const total = await table.locator('tbody tr').evaluateAll(rows => rows.reduce((sum, row) => sum + Number(row.lastElementChild?.textContent), 0));
  const shown = Number(await table.locator('tfoot tr td').last().textContent());
  expect(total).toBeCloseTo(shown, 8);
  await page.getByRole('button', { name: 'Stäng', exact: true }).click();
  await page.getByRole('button', { name: 'XS', exact: true }).click();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await stored(page))._editor?.future?.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('[data-distance-label]')).toHaveCount(4);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await stored(page)).sizeClass).toBe('XS');
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await stored(page)).sizeClass).toBe('L');
  await page.getByRole('button', { name: 'Ladda ner eller exportera bana' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Dela som bild', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByText('Banbilden är klar — PNG-nedladdningen har startat', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ladda ner eller exportera bana' }).click();
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Domar-PDF', exact: true }).click();
  const pdf = await pdfDownload;
  await pdf.saveAs(test.info().outputPath('domarbana.pdf'));
  await expect(page.getByText('Domar-PDF nedladdad', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Regelkontroll —/ }).click();
  await page.screenshot({ path: test.info().outputPath('planner-measurements.png') });
});

test('changing arena and planning settings updates the displayed checks without moving an obstacle', async ({ page }) => {
  test.skip(test.info().project.name === 'mobil', 'Desktop settings regression');
  await setup(page); await importCourse(page);
  await page.getByRole('button', { name: /^Regelkontroll —/ }).click();
  const measurements = page.getByTestId('course-measurements');
  const before = await measurements.locator('summary').textContent();
  await page.getByRole('textbox', { name: 'Bredd i meter' }).fill('15');
  await page.getByRole('textbox', { name: 'Bredd i meter' }).press('Enter');
  await expect(measurements.locator('summary')).not.toHaveText(before!);
  await page.getByRole('spinbutton', { name: 'Mål för banlängd', exact: true }).fill('200');
  await expect(page.getByText(/avviker från ditt mål 200 m/)).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Planeringshastighet', exact: true }).fill('4');
  await expect(page.getByText(/Standardloppstid \(uppsk\.\).*4 m\/s/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Regelkontroll —/ })).toContainText(/\d+ fel · \d+ varningar/);
});

test('sharing uses the visible obstacles, ignores the placement preview, and an edited copy survives reload', async ({ page, context }) => {
  test.skip(test.info().project.name === 'mobil', 'Desktop palette regression');
  await setup(page); await importCourse(page);
  await page.getByRole('button', { name: /^Placera tunnel/ }).click();
  await expect(page.getByText('Tunnel vald — klicka på banan för att placera', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dela banan via länk' }).click();
  const url = await page.getByRole('textbox', { name: 'Delningslänk' }).inputValue();
  const shared = JSON.parse(Buffer.from(new URL(url).searchParams.get('bana')!, 'base64url').toString());
  expect(shared.obstacles).toHaveLength(5);
  expect(shared.obstacles.filter((o: { type: string }) => o.type === 'tunnel')).toHaveLength(1);
  expect(shared.obstacles.map((o: { type: string }) => o.type).sort()).toEqual(course.obstacles.map(o => o.type).sort());
  const receiver = await context.newPage(); await receiver.goto(url);
  await expect(receiver.getByRole('textbox', { name: 'Banans namn' })).toHaveValue(course.name);
  await receiver.getByRole('textbox', { name: 'Banans namn' }).fill('Redigerad länkkopia');
  await expect.poll(() => receiver.url()).not.toContain('?bana=');
  await expect.poll(async () => (await stored(receiver)).name).toBe('Redigerad länkkopia');
  await receiver.reload();
  await expect(receiver.getByRole('textbox', { name: 'Banans namn' })).toHaveValue('Redigerad länkkopia');
});

test('404 routes resolve and expired confirmation offers a new link on desktop and mobile', async ({ page }) => {
  await page.goto('/villkor');
  await expect(page.getByRole('heading', { name: 'Villkor för AgilityManager', exact: true })).toBeVisible();
  await page.goto('/integritet'); await expect(page.getByRole('heading', { name: 'Integritet', exact: true })).toBeVisible();
  await page.goto('/om-oss'); await expect(page.getByRole('heading', { name: 'Om AgilityManager', exact: true })).toBeVisible();
  await page.goto('/cookieinstallningar');
  await expect(page.getByRole('dialog', { name: 'Valfri statistik' })).toBeVisible();
  await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
  await page.goto('/#error=access_denied&error_code=otp_expired');
  await expect(page.getByRole('alert')).toContainText('Bekräftelselänken har gått ut');
  await expect(page.getByRole('button', { name: 'Skicka ny bekräftelselänk' })).toBeVisible();
  await expect.poll(() => page.url()).not.toContain('otp_expired');
});

test('the course library searches, sorts, counts and pages on desktop and mobile', async ({ page }) => {
  await page.goto('/banor');
  await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
  const cards = page.locator('article');
  await expect(cards).toHaveCount(12);
  const paging = page.getByRole('navigation', { name: 'Sidor i banbiblioteket' });
  await paging.getByRole('button', { name: 'Nästa', exact: true }).click();
  await expect(paging).toContainText('Sida 2');
  await page.getByRole('combobox', { name: 'Sortera banbiblioteket' }).selectOption('name');
  await expect(paging).toContainText('Sida 1');
  const titles = await cards.locator('h3').allTextContents();
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'sv')));
  await page.getByRole('textbox', { name: 'Sök i banbiblioteket' }).fill(titles[0]);
  await expect(cards.first().locator('h3')).toHaveText(titles[0]);
  await page.getByRole('textbox', { name: 'Sök i banbiblioteket' }).fill('finns-inte-qa-9283');
  await expect(cards).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('0 banor');
  await expect(paging.getByRole('button', { name: 'Nästa', exact: true })).toBeDisabled();
});

test('Swedish auth errors, eight-character signup, resend and token confirmation use the intended endpoints', async ({ page, context }) => {
  const signupRequests: Record<string, unknown>[] = [];
  const resendRequests: Record<string, unknown>[] = [];
  let verified = 0;
  await context.route('**/*.supabase.co/auth/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/token')) return route.fulfill({ status: 400, json: { code: 'invalid_credentials', msg: 'Invalid login credentials' } });
    if (url.pathname.endsWith('/signup')) {
      expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:8080/auth/bekrafta');
      signupRequests.push(route.request().postDataJSON());
      return route.fulfill({ json: { id: userId, email: 'qa@example.test', identities: [{}] } });
    }
    if (url.pathname.endsWith('/resend')) {
      resendRequests.push(route.request().postDataJSON());
      return route.fulfill({ json: {} });
    }
    if (url.pathname.endsWith('/verify')) {
      expect(route.request().postDataJSON()).toMatchObject({ token_hash: 'test-email-token', type: 'email' });
      verified++;
      const token = `${Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
      return route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user: { id: userId, email: 'qa@example.test', identities: [], app_metadata: {}, user_metadata: {} } } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/mitt-agilitymanager');
  await page.getByRole('button', { name: 'Endast nödvändiga', exact: true }).click();
  await page.getByRole('button', { name: 'Logga in eller skapa konto', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('E-post', { exact: true }).fill('qa@example.test');
  await dialog.getByLabel('Lösenord', { exact: true }).fill('old123');
  await dialog.getByRole('button', { name: 'Logga in', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Fel e-postadress eller lösenord');
  await dialog.getByRole('button', { name: 'Inget konto? Skapa ett här' }).click();
  await dialog.getByLabel('Lösenord', { exact: true }).fill('1234567');
  await dialog.getByRole('button', { name: 'Skapa gratis konto', exact: true }).click();
  expect(signupRequests).toHaveLength(0);
  await dialog.getByLabel('Lösenord', { exact: true }).fill('12345678');
  await dialog.getByRole('button', { name: 'Skapa gratis konto', exact: true }).click();
  await expect(dialog.getByText('Kolla din e-post — bekräfta kontot och logga sedan in.')).toBeVisible();
  expect(signupRequests).toHaveLength(1);
  await page.goto('/auth/bekrafta?error_code=otp_expired');
  await page.getByLabel('E-post för ny bekräftelselänk').fill('qa@example.test');
  await page.getByRole('button', { name: 'Skicka ny bekräftelselänk' }).click();
  await expect(page.getByRole('status')).toContainText('Om kontot behöver bekräftas');
  expect(resendRequests).toEqual([expect.objectContaining({ type: 'signup', email: 'qa@example.test' })]);
  await page.goto('/auth/bekrafta?token_hash=test-email-token&type=email');
  await expect(page.getByRole('status')).toContainText('E-postadressen är bekräftad. Du är inloggad.');
  expect(verified).toBe(1);
  await expect.poll(() => page.url()).not.toContain('token_hash');
});

const userId = '00000000-0000-4000-8000-000000000123';
async function authenticate(context: BrowserContext) {
  await context.addInitScript(({ userId }) => {
    const token = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test-signature`;
    localStorage.setItem('sb-rcubbmnosawdtaupixnm-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: userId, email: 'qa@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } }));
  }, { userId });
}

test('account save, another device, versions, a stale tab and a failed save keep data safe', async ({ page, context, browser }) => {
  test.skip(test.info().project.name === 'mobil', 'Account/data contract is covered once on desktop');
  await authenticate(context);
  let current: Record<string, unknown> | null = null;
  const versions: Record<string, unknown>[] = [];
  let failSave = false;
  const backend = async (route: Route) => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname.endsWith('/saved_course_versions')) return route.fulfill({ json: [...versions].reverse(), headers: { 'content-range': `0-${versions.length - 1}/${versions.length}` } });
    if (!url.pathname.endsWith('/saved_courses')) return route.fulfill({ json: {} });
    if (req.method() === 'GET') return route.fulfill({ json: current ? [current] : [], headers: { 'content-range': current ? '0-0/1' : '*/0' } });
    if (failSave) return route.fulfill({ status: 503, json: { message: 'offline' } });
    if (req.method() === 'PATCH' && url.searchParams.get('revision') !== `eq.${current?.revision}`) return route.fulfill({ json: null });
    const payload = req.postDataJSON();
    if (req.method() === 'POST') { expect(payload.user_id).toBe(userId); expect(payload.is_public).toBe(false); }
    current = { id: '00000000-0000-4000-8000-000000000456', user_id: userId, description: '', is_public: false, public_slug: null, created_at: new Date().toISOString(), ...current, ...payload, revision: Number(current?.revision ?? 0) + 1, updated_at: new Date().toISOString() };
    versions.push({ course_id: current.id, revision: current.revision, name: current.name, course_data: current.course_data, created_at: current.updated_at });
    return route.fulfill({ json: current });
  };
  await context.route('**/*.supabase.co/**', backend);
  await setup(page); await importCourse(page); await save(page);
  await expect(page.getByRole('button', { name: /^Bana-meny/ })).toHaveAccessibleName(/Sparad på kontot · v1/);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Bana-meny/ })).toHaveAccessibleName(/Sparad på kontot · v1/);
  const secondContext = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await authenticate(secondContext); await secondContext.route('**/*.supabase.co/**', backend);
  const second = await secondContext.newPage(); await setup(second); await open(second);
  await second.getByRole('button', { name: new RegExp(`${course.name} · v1`) }).click();
  await expect(second.getByRole('textbox', { name: 'Banans namn' })).toHaveValue(course.name);
  await page.getByRole('textbox', { name: 'Banans namn' }).fill('Senaste bana'); await save(page);
  await expect(page.getByRole('button', { name: /^Bana-meny/ })).toHaveAccessibleName(/v2/);
  await second.getByRole('textbox', { name: 'Banans namn' }).fill('Min fliks ändring'); await save(second);
  await expect(second.getByText(/^Banan har ändrats på en annan enhet/)).toBeVisible();
  await expect(second.getByRole('button', { name: /^Bana-meny/ })).toHaveAccessibleName(/Osparade ändringar/);
  expect(current?.name).toBe('Senaste bana');
  failSave = true;
  await page.getByRole('textbox', { name: 'Banans namn' }).fill('Kvar vid nätfel'); await save(page);
  await expect(page.getByText(/^Molnsparningen misslyckades/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Banans namn' })).toHaveValue('Kvar vid nätfel');
  failSave = false;
  await open(page);
  await page.getByRole('button', { name: 'Visa versioner av Senaste bana' }).click();
  await page.getByRole('button', { name: new RegExp(`${course.name} · v1`) }).click();
  await page.getByRole('button', { name: 'Öppna banan', exact: true }).click();
  await save(page);
  await expect(page.getByRole('button', { name: /^Bana-meny/ })).toHaveAccessibleName(/v3/);
  expect(versions).toHaveLength(3);
  await secondContext.close();
});
