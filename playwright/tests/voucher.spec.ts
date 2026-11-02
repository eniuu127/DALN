
import {
  test,
  expect,
  type Page,
  type APIRequestContext
} from '@playwright/test';

import {
  login,
  clearCart,
  choose,
  add
} from './helpers/jodok';

type Voucher = {
  voucherId?: number;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  endDate: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

const adminEmail = process.env.JODOK_ADMIN_EMAIL || '';
const adminPassword = process.env.JODOK_ADMIN_PASSWORD || '';
const allowSeed = process.env.JODOK_SEED_VOUCHERS === '1';

const money = (s: string) =>
  Number(
    (s.match(/[\d.,]+/)?.[0] || '0')
      .replace(/[^\d]/g, '')
  );

const value = async (page: Page, selector: string) =>
  money(await page.locator(selector).innerText());

const dateAfter = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const valid = (v: Voucher, sub: number) =>
  v.status === 'ACTIVE' &&
  (!v.endDate || v.endDate >= today()) &&
  sub >= Number(v.minOrderValue || 0);

const discount = (v: Voucher, sub: number) =>
  Math.min(
    sub,
    Math.max(
      0,
      v.discountType === 'PERCENT'
        ? sub * Number(v.discountValue) / 100
        : Number(v.discountValue)
    )
  );

// ==============================
// ĐĂNG NHẬP ADMIN VÀ LẤY JWT
// ==============================

async function getAdminToken(
  request: APIRequestContext
): Promise<string> {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      'Chưa cấu hình JODOK_ADMIN_EMAIL hoặc JODOK_ADMIN_PASSWORD'
    );
  }

  const response = await request.post('/api/auth/login', {
    data: {
      email: adminEmail,
      password: adminPassword
    }
  });

  if (!response.ok()) {
    throw new Error(
      `Đăng nhập ADMIN thất bại: HTTP ${response.status()}`
    );
  }

  const body = await response.json();

  const token =
    body.token ??
    body.accessToken ??
    body.jwt ??
    body.data?.token ??
    body.data?.accessToken;

  if (!token || typeof token !== 'string') {
    throw new Error(
      'Đăng nhập ADMIN thành công nhưng không tìm thấy JWT trong phản hồi'
    );
  }

  return token;
}

// ==============================
// LẤY DANH SÁCH VOUCHER
// ==============================

async function all(
  request: APIRequestContext
): Promise<Voucher[]> {
  const response = await request.get('/api/vouchers');

  expect(
    response.ok(),
    `GET /api/vouchers: HTTP ${response.status()}`
  ).toBeTruthy();

  const body = await response.json();

  if (!Array.isArray(body)) {
    throw new Error(
      'API /api/vouchers không trả về danh sách dạng mảng'
    );
  }

  return body;
}

// ==============================
// TỰ SEED VOUCHER
// ==============================

async function fixture(
  request: APIRequestContext,
  code: string,
  minOrderValue: number,
  percentage = 10
): Promise<Voucher | undefined> {

  const existing = (await all(request)).find(
    v => v.code === code
  );

  // Không bật seed thì chỉ lấy voucher có sẵn
  if (!allowSeed) {
    return existing;
  }

  const adminToken = await getAdminToken(request);

  const data: Voucher = {
    code,
    discountType: 'PERCENT',
    discountValue: percentage,
    minOrderValue,
    endDate: dateAfter(30),
    status: 'ACTIVE'
  };

  const headers = {
    Authorization: `Bearer ${adminToken}`
  };

  const response = existing?.voucherId
    ? await request.put(
        `/api/vouchers/${existing.voucherId}`,
        { headers, data }
      )
    : await request.post(
        '/api/vouchers',
        { headers, data }
      );

  if (!response.ok()) {
    const body = await response.text();

    throw new Error(
      `Không thể seed voucher ${code}.\n` +
      `HTTP: ${response.status()}\n` +
      `Response: ${body.slice(0, 300)}`
    );
  }

  // Đọc lại dữ liệu đã lưu
  const vouchers = await all(request);

  const saved = vouchers.find(
    v => v.code === code
  );

  expect(
    saved,
    `Không tìm thấy voucher ${code} sau khi seed`
  ).toBeDefined();

  return saved;
}

// ==============================
// CHUẨN BỊ GIỎ HÀNG
// ==============================

async function prepare(
  page: Page,
  request: APIRequestContext
) {
  await login(page);

  await clearCart(page);

  const { p, vs } = await choose(
    request,
    (_, variants) =>
      variants.some(
        v => v.status === 'ACTIVE' && v.stock > 0
      )
  );

  const variant = vs.find(
    v => v.status === 'ACTIVE' && v.stock > 0
  );

  if (!variant) {
    throw new Error(
      'Không có biến thể phù hợp để chuẩn bị giỏ hàng'
    );
  }

  await add(
    page,
    p.productId,
    variant
  );

  await page.goto('/payment');

  await expect(
    page.locator('#voucherCode')
  ).toBeVisible();

  const sub = await value(
    page,
    '#paymentSubtotal'
  );

  const before = await value(
    page,
    '#paymentTotal'
  );

  expect(sub).toBeGreaterThan(0);

  return { sub, before };
}

// ==============================
// ÁP DỤNG VOUCHER
// ==============================

async function apply(
  page: Page,
  code: string
) {
  await page.locator('#voucherCode').fill(code);

  const button = page.locator(
    '#applyVoucherButton'
  );

  await button.click();

  await expect(button).toBeEnabled();
}

// ==============================
// KIỂM TRA KHÔNG GIẢM GIÁ
// ==============================

async function noDiscount(
  page: Page,
  original: number
) {
  expect(
    await value(page, '#paymentDiscount')
  ).toBe(0);

  expect(
    await value(page, '#paymentTotal')
  ).toBe(original);
}

// ==============================
// 14 TEST CASE VOUCHER
// ==============================

test.describe(
  'Voucher và khuyến mãi — VOUCH Excel (auto seed)',
  () => {

    test.describe.configure({ mode: 'serial' });

    test(
      'VOUCH-001 - Áp dụng voucher 10% hợp lệ',
      async ({ page, request }) => {

        const { sub, before } =
          await prepare(page, request);

        const v = await fixture(
          request,
          'E2E-VOUCH10',
          0
        );

        test.skip(
          !v || !valid(v, sub),
          'Chưa có voucher 10% hợp lệ'
        );

        await apply(page, v!.code);

        expect(
          await value(page, '#paymentDiscount')
        ).toBeCloseTo(discount(v!, sub), 0);

        expect(
          await value(page, '#paymentTotal')
        ).toBeCloseTo(
          before - discount(v!, sub),
          0
        );
      }
    );

    test(
      'VOUCH-002 - Voucher hết hạn',
      async ({ page, request }) => {

        const { before } =
          await prepare(page, request);

        const v = (await all(request)).find(
          x =>
            x.status === 'ACTIVE' &&
            !!x.endDate &&
            x.endDate < today()
        );

        test.skip(
          !v,
          'Chưa có voucher hết hạn'
        );

        await apply(page, v!.code);

        await noDiscount(page, before);
      }
    );

    test(
      'VOUCH-003 - Voucher chưa bắt đầu',
      async () => {
        test.skip(
          true,
          'Hệ thống chưa hỗ trợ ngày bắt đầu voucher'
        );
      }
    );

    test(
      'VOUCH-004 - Mã không tồn tại',
      async ({ page, request }) => {

        const { before } =
          await prepare(page, request);

        await apply(page, 'INVALID-XYZ');

        await noDiscount(page, before);
      }
    );

    test(
      'VOUCH-005 - Đơn dưới ngưỡng voucher',
      async ({ page, request }) => {

        const { sub, before } =
          await prepare(page, request);

        const v = await fixture(
          request,
          'E2E-VOUCH-MIN-ABOVE',
          sub + 100000
        );

        test.skip(
          !v ||
          Number(v.minOrderValue) <= sub,
          'Thiếu voucher có ngưỡng cao hơn tổng giỏ'
        );

        await apply(page, v!.code);

        await noDiscount(page, before);
      }
    );

    test(
      'VOUCH-006 - Đơn bằng ngưỡng tối thiểu',
      async ({ page, request }) => {

        const { sub, before } =
          await prepare(page, request);

        const v = await fixture(
          request,
          'E2E-VOUCH-MIN-EQUAL',
          sub
        );

        test.skip(
          !v ||
          !valid(v, sub) ||
          Number(v.minOrderValue) !== sub,
          'Chưa có voucher đúng ngưỡng giỏ hàng'
        );

        await apply(page, v!.code);

        expect(
          await value(page, '#paymentDiscount')
        ).toBeCloseTo(discount(v!, sub), 0);

        expect(
          await value(page, '#paymentTotal')
        ).toBeCloseTo(
          before - discount(v!, sub),
          0
        );
      }
    );

    test(
      'VOUCH-007 - Trần giảm tối đa',
      async () => {
        test.skip(
          true,
          'Voucher chưa hỗ trợ mức giảm tối đa'
        );
      }
    );

    test(
      'VOUCH-008 - Voucher hết lượt sử dụng',
      async () => {
        test.skip(
          true,
          'Voucher chưa hỗ trợ giới hạn lượt sử dụng'
        );
      }
    );

    test(
      'VOUCH-009 - Giới hạn lượt theo khách',
      async () => {
        test.skip(
          true,
          'Voucher chưa hỗ trợ giới hạn lượt theo khách hàng'
        );
      }
    );

    test(
      'VOUCH-010 - Xóa voucher đã áp dụng',
      async ({ page, request }) => {

        const { sub } =
          await prepare(page, request);

        const v = await fixture(
          request,
          'E2E-VOUCH10',
          0
        );

        test.skip(
          !v || !valid(v, sub),
          'Thiếu voucher hợp lệ'
        );

        await apply(page, v!.code);

        const remove = page.getByRole(
          'button',
          {
            name: /bỏ áp dụng|xóa voucher|hủy voucher/i
          }
        );

        test.skip(
          (await remove.count()) === 0,
          'Giao diện chưa có nút bỏ áp dụng voucher'
        );

        await remove.first().click();

        expect(
          await value(page, '#paymentDiscount')
        ).toBe(0);
      }
    );

    test(
      'VOUCH-011 - Thay đổi giỏ sau áp mã',
      async () => {
        test.skip(
          true,
          'Cần kiểm tra lại voucher ở bước tạo đơn hàng'
        );
      }
    );

    test(
      'VOUCH-012 - Mã có khoảng trắng',
      async ({ page, request }) => {

        const { sub } =
          await prepare(page, request);

        const v = await fixture(
          request,
          'E2E-VOUCH10',
          0
        );

        test.skip(
          !v || !valid(v, sub),
          'Thiếu voucher hợp lệ'
        );

        await apply(
          page,
          `  ${v!.code}  `
        );

        expect(
          await value(page, '#paymentDiscount')
        ).toBeCloseTo(discount(v!, sub), 0);
      }
    );

    test(
      'VOUCH-013 - Giảm giá âm',
      async () => {
        test.skip(
          true,
          'Cần kiểm thử validation API riêng'
        );
      }
    );

    test(
      'VOUCH-014 - Hai đơn dùng lượt cuối đồng thời',
      async () => {
        test.skip(
          true,
          'Hệ thống chưa hỗ trợ giới hạn lượt sử dụng'
        );
      }
    );

  }
);
