import { expect, test } from '@playwright/test';
import { E2E_FRONTEND_URL, viewedRoom as room } from './fixtures';

const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

test.use({ locale: 'en-US', timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  // Point BrowseRooms at the frontend origin so its GET /rooms also goes through the dev proxy.
  await page.route('**/appsettings.json', (route) =>
    route.fulfill({ json: { CatalogApi: { BaseUrl: E2E_FRONTEND_URL } } }),
  );
});

test('a user opens room RM-204 and sees its details returned by Catalog', async ({ page }) => {
  await page.goto('/');
  const card = page
    .getByRole('list', { name: 'Rooms' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: `Room ${room.room_id}` }) });
  await expect(card).toHaveCount(1);

  const isViewRoom = (url: string) => new URL(url).pathname === `/rooms/${room.room_id}`;
  const [request, response] = await Promise.all([
    page.waitForRequest((req) => isViewRoom(req.url())),
    page.waitForResponse((res) => isViewRoom(res.url())),
    card.getByRole('button', { name: `View details of room ${room.room_id}` }).click(),
  ]);

  expect(request.method()).toBe('GET');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({
    room: {
      roomId: room.room_id,
      hotelId: room.hotel_id,
      numberOfBeds: room.number_of_beds,
      availableFrom: room.available_from,
      availableTo: room.available_to,
      city: room.city,
      price: Number(room.price),
      description: room.description,
    },
  });

  const dialog = page.getByRole('dialog', { name: `Room ${room.room_id}` });
  const details = dialog.getByLabel('Room details');
  await expect(details).toBeVisible();

  const field = (label: string) => details.locator(`dt:text-is("${label}") + dd`);
  await expect(field('Room')).toHaveText(body.room.roomId);
  await expect(field('Hotel')).toHaveText(body.room.hotelId);
  await expect(field('Beds')).toHaveText(String(body.room.numberOfBeds));
  await expect(field('Available from')).toHaveText(dateTimeFormat.format(new Date(body.room.availableFrom)));
  await expect(field('Available to')).toHaveText(dateTimeFormat.format(new Date(body.room.availableTo)));
  await expect(field('City')).toHaveText(body.room.city);
  await expect(field('Price')).toHaveText(priceFormat.format(body.room.price));
  await expect(field('Description')).toHaveText(body.room.description);

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});
