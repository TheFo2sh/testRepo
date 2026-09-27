import { expect, test } from '@playwright/test';
import { E2E_FRONTEND_URL, rooms, seaViewRooms } from './fixtures';

const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

test.use({ locale: 'en-US', timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  // Point BrowseRooms at the frontend origin so its GET /rooms also goes through the dev proxy.
  await page.route('**/appsettings.json', (route) =>
    route.fulfill({ json: { CatalogApi: { BaseUrl: E2E_FRONTEND_URL } } }),
  );
});

test('a public user searches "sea view" and sees only matching rooms with their details', async ({ page }) => {
  expect(seaViewRooms.length).toBeGreaterThan(0);
  expect(seaViewRooms.length).toBeLessThan(rooms.length);

  await page.goto('/');
  const search = page.getByRole('search', { name: 'Search rooms' });
  await search.getByLabel('Search text').fill('sea view');

  const [request, response] = await Promise.all([
    page.waitForRequest((req) => new URL(req.url()).pathname === '/rooms/search'),
    page.waitForResponse((res) => new URL(res.url()).pathname === '/rooms/search'),
    search.getByRole('button', { name: 'Search' }).click(),
  ]);

  expect(request.method()).toBe('GET');
  expect(new URL(request.url()).search).toBe('?text=sea%20view');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.rooms.total).toBe(seaViewRooms.length);
  expect(body.rooms.query.text).toBe('sea view');

  await expect(page.getByText(`${seaViewRooms.length} rooms found`)).toBeVisible();
  const results = page.getByRole('list', { name: 'Search results' }).getByRole('listitem');
  await expect(results).toHaveCount(seaViewRooms.length);

  for (const [index, room] of seaViewRooms.entries()) {
    const card = results.nth(index);
    await expect(card.getByRole('heading', { name: `Room ${room.room_id}` })).toBeVisible();
    await expect(card.getByText(room.hotel_id, { exact: true })).toBeVisible();
    await expect(card.getByText(String(room.number_of_beds), { exact: true })).toBeVisible();
    await expect(card.getByText(dateTimeFormat.format(new Date(room.available_from)))).toBeVisible();
    await expect(card.getByText(dateTimeFormat.format(new Date(room.available_to)))).toBeVisible();
    await expect(card.getByText(room.city, { exact: true })).toBeVisible();
    await expect(card.getByText(priceFormat.format(Number(room.price)), { exact: true })).toBeVisible();
    await expect(card.getByText(room.description)).toBeVisible();
  }

  for (const room of rooms.filter((r) => !seaViewRooms.includes(r))) {
    await expect(page.getByRole('list', { name: 'Search results' }).getByText(`Room ${room.room_id}`)).toHaveCount(0);
  }
});

test('filters combine against the real API, and a no-match search shows the empty state', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('search', { name: 'Search rooms' });

  await search.getByLabel('Search text').fill('sea view');
  await search.getByLabel('City').fill('Porto');
  await search.getByLabel('Min price').fill('200');
  await search.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText('1 room found')).toBeVisible();
  const results = page.getByRole('list', { name: 'Search results' }).getByRole('listitem');
  await expect(results).toHaveCount(1);
  await expect(results.first().getByRole('heading', { name: 'Room room-201' })).toBeVisible();

  await search.getByLabel('Max price').fill('205');
  await expect(page.getByText('No rooms match your search.')).toBeVisible();
  await expect(page.getByText('0 rooms found')).toBeVisible();
});
