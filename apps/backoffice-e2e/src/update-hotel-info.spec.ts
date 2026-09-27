import { expect, test } from '@playwright/test';
import { hotelInfo } from './fixtures';
import { seedBackoffice, storedHotelInfo } from './mongo';

const isUpdateHotelInfo = (url: string) => new URL(url).pathname === `/hotel-infos/${hotelInfo.hotel_id}`;

test.beforeEach(() => {
  seedBackoffice();
});

async function submit(page: import('@playwright/test').Page, city: string) {
  await page.goto('/');
  await page.getByLabel(/Hotel ID/).fill(hotelInfo.hotel_id);
  await page.getByLabel('City').fill(city);
  const [request, response] = await Promise.all([
    page.waitForRequest((req) => isUpdateHotelInfo(req.url())),
    page.waitForResponse((res) => isUpdateHotelInfo(res.url())),
    page.getByRole('button', { name: 'Update' }).click(),
  ]);
  return { request, response };
}

test('a Manager updates H-101 to Amsterdam and sees the complete updated HotelInfo', async ({ page }) => {
  const { request, response } = await submit(page, 'Amsterdam');

  expect(request.method()).toBe('PUT');
  expect(request.postDataJSON()).toEqual({ city: 'Amsterdam' });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    hotelInfo: {
      hotelId: 'H-101',
      rooms: [
        { roomId: 'R-1', numberOfBeds: 2, price: 120, description: 'Double room' },
        { roomId: 'R-2', numberOfBeds: 1, price: 80, description: 'Single room' },
      ],
      city: 'Amsterdam',
      stars: 4,
      description: 'Canal-side boutique hotel',
    },
  });

  const result = page.getByLabel('Updated hotel info');
  await expect(result.getByText('Hotel H-101 updated.')).toBeVisible();
  await expect(result.getByText('City: Amsterdam')).toBeVisible();
  await expect(result.getByText('Stars: 4')).toBeVisible();
  await expect(result.getByRole('list', { name: 'Rooms' }).getByRole('listitem')).toHaveCount(2);

  expect(storedHotelInfo('H-101')).toEqual({ ...hotelInfo, city: 'Amsterdam' });
});

test('a blank city is rejected with 422 and the saved HotelInfo is unchanged', async ({ page }) => {
  const { request, response } = await submit(page, '');

  expect(request.method()).toBe('PUT');
  expect(request.postDataJSON()).toEqual({ city: '' });
  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ hotelId: 'H-101', reason: 'city is required' });

  await expect(page.getByText('city is required')).toBeVisible();
  await expect(page.getByLabel('Updated hotel info')).toHaveCount(0);
  await expect(page.getByLabel(/Hotel ID/)).toHaveValue('H-101');

  expect(storedHotelInfo('H-101')).toEqual(hotelInfo);
});
