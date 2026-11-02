import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { login, clearCart, choose, add } from './helpers/jodok';

/**
 * JODOK – ORDER-001..016.
 * Chạy trên profile test / database fashionweb_test.
 * Những ca tạo đơn thực sự chỉ chạy khi JODOK_RUN_ORDER_WRITES=1.
 * Selector form thanh toán cần đối chiếu với HTML hiện hành trước khi bật.
 */
const runWrites = process.env.JODOK_RUN_ORDER_WRITES === '1';
const recipient = process.env.JODOK_ORDER_RECIPIENT || 'Khach hang kiem thu';
const phone = process.env.JODOK_ORDER_PHONE || '0912345678';
const address = process.env.JODOK_ORDER_ADDRESS || '123 Duong Kiem Thu, Quan 1, TP HCM';

const selectors = {
  recipient: '#fullName',
  phone: '#phone',
  province: '#checkoutProvince',
  ward: '#checkoutWard',
  address: '#checkoutStreet',
  placeOrder: process.env.JODOK_ORDER_SUBMIT_SELECTOR || '#placeOrderButton'
};

async function payment(page: Page, request: APIRequestContext, withProduct = true) {
  await login(page);
  await clearCart(page);
  if (withProduct) {
    const { p, vs } = await choose(request, (_, variants) =>
      variants.some(v => v.status === 'ACTIVE' && v.stock > 0));
    const variant = vs.find(v => v.status === 'ACTIVE' && v.stock > 0)!;
    await add(page, p.productId, variant);
  }
  await page.goto('/payment');
  return page;
}

async function fillAddress(
  page: Page,
  overrides: Partial<{
    name: string;
    phone: string;
    address: string;
  }> = {}
) {
  await expect(page.locator(selectors.recipient)).toBeVisible();

  await page.locator(selectors.recipient)
    .fill(overrides.name ?? recipient);

  await page.locator(selectors.phone)
    .fill(overrides.phone ?? phone);

  const province = page.locator(selectors.province);
  const ward = page.locator(selectors.ward);

  // Chọn tỉnh/thành phố có sẵn
  await expect.poll(async () =>
    province.locator('option:not([value=""])').count()
  ).toBeGreaterThan(0);

  const provinceValue = await province
    .locator('option:not([value=""])')
    .first()
    .getAttribute('value');

  if (!provinceValue) {
    throw new Error('Không tìm thấy tỉnh/thành phố hợp lệ');
  }

  await province.selectOption(provinceValue);

  // Chờ danh sách phường/xã được cập nhật
  await expect.poll(async () =>
    ward.locator('option:not([value=""])').count()
  ).toBeGreaterThan(0);

  const wardValue = await ward
    .locator('option:not([value=""])')
    .first()
    .getAttribute('value');

  if (!wardValue) {
    throw new Error('Không tìm thấy phường/xã hợp lệ');
  }

  await ward.selectOption(wardValue);

  await page.locator(selectors.address)
    .fill(overrides.address ?? address);
}

async function submit(page: Page) {
  const button = page.locator(selectors.placeOrder);
  await expect(button, `Không tìm thấy nút đặt hàng: ${selectors.placeOrder}`).toBeVisible();
  await button.click();
}

async function ensureNoOrderRequest(page: Page, action: () => Promise<void>) {
  const requests: string[] = [];
  const handler = (req: import('@playwright/test').Request) => {
    if (req.method() === 'POST' && /\/api\/(orders|order)(?:\/|\?|$)/.test(req.url())) requests.push(req.url());
  };
  page.on('request', handler);
  try {
    await action();
    await page.waitForTimeout(500);
    expect(requests, 'Không được gửi yêu cầu tạo đơn khi dữ liệu không hợp lệ').toHaveLength(0);
  } finally {
    page.off('request', handler);
  }
}

test.describe('Đặt hàng và thanh toán — ORDER Excel', () => {
  test.describe.configure({ mode: 'serial' });

  test('ORDER-001 - Đặt hàng COD thành công', async ({ page, request }) => {
    test.skip(!runWrites, 'Cần bật JODOK_RUN_ORDER_WRITES=1 khi đã đối chiếu selector và API tạo đơn.');
    await payment(page, request);
    await fillAddress(page);
    // TODO: Đối chiếu selector chọn COD, endpoint tạo đơn, trạng thái và tồn kho.
    test.skip(true, 'Chưa có mã giao diện/đường dẫn API để xác minh COD, đơn hàng và tồn kho chính xác.');
  });

  test('ORDER-002 - Bỏ trống người nhận', async ({ page, request }) => {
    await payment(page, request);
    await fillAddress(page, { name: '' });
    await ensureNoOrderRequest(page, async () => submit(page));
  });

  test('ORDER-003 - Số điện thoại chứa chữ', async ({ page, request }) => {
    await payment(page, request);
    await fillAddress(page, { phone: '09abc12345' });
    await ensureNoOrderRequest(page, async () => submit(page));
  });

  test('ORDER-004 - Bỏ trống địa chỉ', async ({ page, request }) => {
    await payment(page, request);
    await fillAddress(page, { address: '' });
    await ensureNoOrderRequest(page, async () => submit(page));
  });

  test('ORDER-005 - Không đặt hàng khi giỏ rỗng', async ({ page, request }) => {
    await payment(page, request, false);
    await ensureNoOrderRequest(page, async () => {
      const button = page.locator(selectors.placeOrder);
      if (await button.isVisible().catch(() => false) && await button.isEnabled()) await button.click();
    });
  });

  test('ORDER-006 - Hết hàng trước khi xác nhận', async () => {
    test.skip(true, 'Cần API quản trị tồn kho, API đặt hàng và dữ liệu riêng để cập nhật tồn từ 1 về 0 an toàn.');
  });

  test('ORDER-007 - Số tồn bằng số mua', async () => {
    test.skip(true, 'Cần seed biến thể tồn kho đúng 2, đặt 2 và xác minh số tồn qua API/DB.');
  });

  test('ORDER-008 - Đặt hàng với voucher', async () => {
    test.skip(true, 'Cần xác minh luồng lưu voucher và số tiền thực tế trong đơn sau khi đặt.');
  });

  test('ORDER-009 - Nhấn đặt hàng liên tục', async () => {
    test.skip(true, 'Cần endpoint tạo đơn và API truy vấn đơn để khẳng định không phát sinh đơn trùng.');
  });

  test('ORDER-010 - Lỗi lưu DB khi tạo đơn', async () => {
    test.skip(true, 'Cần cơ chế giả lập lỗi giao dịch có kiểm soát trong môi trường test.');
  });

  test('ORDER-011 - Thay đổi giá trước xác nhận', async () => {
    test.skip(true, 'Cần API cập nhật giá sản phẩm và xác minh tổng tiền được lưu ở backend.');
  });

  test('ORDER-012 - Mã đơn hàng duy nhất', async () => {
    test.skip(true, 'Cần tạo hai đơn bằng API hoặc UI và truy vấn lại mã đơn thực tế.');
  });

  test('ORDER-013 - Đơn xuất hiện trong lịch sử', async () => {
    test.skip(true, 'Cần hoàn thiện thao tác đặt đơn và selector lịch sử đơn hàng.');
  });

  test('ORDER-014 - Thông báo sau đặt hàng', async () => {
    test.skip(true, 'Cần xác định thông báo và mã đơn hiển thị sau khi đặt hàng thành công.');
  });

  test('ORDER-015 - Thanh toán trực tuyến thất bại', async () => {
    test.skip(true, 'Cần sandbox thanh toán và kịch bản trả trạng thái thất bại.');
  });

  test('ORDER-016 - Thanh toán trực tuyến thành công', async () => {
    test.skip(true, 'Cần sandbox và callback thành công có xác thực để kiểm tra thanh toán đúng một lần.');
  });
});
