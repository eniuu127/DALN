
import {
  test,
  expect,
  type APIRequestContext,
  type APIResponse
} from '@playwright/test';
import * as XLSX from 'xlsx';

const BASE = process.env.JODOK_BASE_URL || 'http://localhost:8080';

const API = {
  summary: process.env.JODOK_REPORT_SUMMARY_URL || '',
  orders: process.env.JODOK_REPORT_ORDERS_URL || '',
  products: process.env.JODOK_REPORT_TOP_PRODUCTS_URL || '',
  customers: process.env.JODOK_REPORT_TOP_CUSTOMERS_URL || '',
  export: process.env.JODOK_REPORT_EXPORT_URL || ''
};

const adminEmail = process.env.JODOK_ADMIN_EMAIL || '';
const adminPassword = process.env.JODOK_ADMIN_PASSWORD || '';

function required(url: string, name: string) {
  test.skip(!url, `Chưa cấu hình API ${name}`);
  return url;
}

function url(path: string, from?: string, to?: string) {
  const u = new URL(path, BASE);

  if (from) u.searchParams.set('fromDate', from);
  if (to) u.searchParams.set('toDate', to);

  return u.toString();
}

async function auth(request: APIRequestContext) {
  test.skip(
    !adminEmail || !adminPassword,
    'Chưa khai báo tài khoản ADMIN'
  );

  const response = await request.post(`${BASE}/api/auth/login`, {
    data: {
      email: adminEmail,
      password: adminPassword
    }
  });

  expect(response.ok(), 'Đăng nhập ADMIN thất bại').toBeTruthy();

  const body = await response.json();

  const token =
    body.token ??
    body.accessToken ??
    body.jwt ??
    body.data?.token;

  expect(token, 'Không tìm thấy JWT ADMIN').toBeTruthy();

  return { Authorization: `Bearer ${token}` };
}

async function get(
  request: APIRequestContext,
  path: string,
  from?: string,
  to?: string
) {
  const headers = await auth(request);
  return request.get(url(path, from, to), { headers });
}

async function json(response: APIResponse) {
  expect(
    response.ok(),
    `API trả HTTP ${response.status()}: ${await response.text()}`
  ).toBeTruthy();

  return response.json();
}

function records(body: any): any[] {
  if (Array.isArray(body)) return body;

  for (const key of ['content', 'items', 'rows', 'orders', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }

  throw new Error('Không tìm thấy mảng dữ liệu trong phản hồi API');
}

function number(value: unknown) {
  if (typeof value === 'number') return value;
  return Number(String(value ?? '').replace(/[^\d.-]/g, ''));
}

function dateOf(row: any) {
  const raw =
    row.createdAt ??
    row.orderDate ??
    row.date ??
    row.completedAt;

  return raw ? String(raw).slice(0, 10) : '';
}

function orderTotal(order: any) {
  return number(
    order.totalAmount ??
    order.finalAmount ??
    order.total ??
    order.totalPrice
  );
}

function orderStatus(order: any) {
  return String(
    order.status ??
    order.orderStatus ??
    ''
  ).toUpperCase();
}

async function excel(
  request: APIRequestContext,
  from?: string,
  to?: string
) {
  const endpoint = required(API.export, 'xuất Excel');
  const response = await get(request, endpoint, from, to);

  expect(response.ok(), `Xuất Excel HTTP ${response.status()}`)
    .toBeTruthy();

  const buffer = await response.body();

  expect(buffer.length).toBeGreaterThan(100);

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true
  });

  expect(workbook.SheetNames.length).toBeGreaterThan(0);

  return {
    workbook,
    sheets: workbook.SheetNames.map(name => ({
      name,
      rows: XLSX.utils.sheet_to_json<any>(
        workbook.Sheets[name],
        { defval: '' }
      )
    }))
  };
}

test.describe('Báo cáo thống kê và Excel — REPORT Excel', () => {

  test('REPORT-001 - Lọc báo cáo theo ngày', async ({ request }) => {
    const endpoint = required(API.orders, 'danh sách đơn hàng');

    const from = '2026-01-01';
    const to = '2026-12-31';

    const body = await json(await get(request, endpoint, from, to));
    const orders = records(body);

    test.skip(orders.length === 0, 'Khoảng ngày chưa có đơn mẫu');

    for (const order of orders) {
      const date = dateOf(order);
      expect(date, 'Đơn hàng thiếu ngày').toBeTruthy();
      expect(date >= from && date <= to).toBeTruthy();
    }
  });

  test('REPORT-002 - Ngày bắt đầu sau ngày kết thúc', async ({ request }) => {
    const endpoint = required(API.summary, 'thống kê tổng hợp');

    const response = await get(
      request,
      endpoint,
      '2026-12-31',
      '2026-01-01'
    );

    expect(
      [400, 422],
      'API phải từ chối khoảng ngày không hợp lệ'
    ).toContain(response.status());
  });

  test('REPORT-003 - Thống kê doanh thu', async ({ request }) => {
    const endpoint = required(API.orders, 'danh sách đơn hàng');

    const body = await json(await get(request, endpoint));
    const orders = records(body);

    test.skip(orders.length === 0, 'Chưa có dữ liệu đơn hàng');

    const completed = orders.filter(order =>
      ['COMPLETED', 'DELIVERED'].includes(orderStatus(order))
    );

    const cancelled = orders.filter(order =>
      ['CANCELLED', 'CANCELED'].includes(orderStatus(order))
    );

    test.skip(
      !completed.length || !cancelled.length,
      'Cần cả đơn hoàn thành và đã hủy để đối chiếu'
    );

    const expected = completed.reduce(
      (sum, order) => sum + orderTotal(order),
      0
    );

    const summary = await json(
      await get(request, required(API.summary, 'tổng doanh thu'))
    );

    const revenue = summary.totalRevenue ?? summary.revenue;

    expect(revenue, 'Không có trường doanh thu').toBeDefined();
    expect(number(revenue)).toBe(expected);
  });

  test('REPORT-004 - Top sản phẩm bán chạy', async ({ request }) => {
    const endpoint = required(API.products, 'top sản phẩm');
    const rows = records(await json(await get(request, endpoint)));

    test.skip(rows.length < 2, 'Cần ít nhất hai sản phẩm');

    const quantities = rows.map(row =>
      number(row.totalSold ?? row.soldQuantity ?? row.quantitySold)
    );

    quantities.forEach(q => expect(Number.isFinite(q)).toBeTruthy());

    for (let i = 1; i < quantities.length; i++) {
      expect(quantities[i - 1]).toBeGreaterThanOrEqual(quantities[i]);
    }
  });

  test('REPORT-005 - Top khách hàng', async ({ request }) => {
    const endpoint = required(API.customers, 'top khách hàng');
    const rows = records(await json(await get(request, endpoint)));

    test.skip(rows.length < 2, 'Cần ít nhất hai khách hàng');

    const totals = rows.map(row =>
      number(row.totalSpent ?? row.totalAmount ?? row.totalPurchase)
    );

    totals.forEach(total =>
      expect(Number.isFinite(total)).toBeTruthy()
    );

    for (let i = 1; i < totals.length; i++) {
      expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
    }
  });

  test('REPORT-006 - Xuất Excel tổng hợp', async ({ request }) => {
    const result = await excel(request);

    const allRows = result.sheets.flatMap(sheet => sheet.rows);

    expect(allRows.length, 'File Excel chưa có dữ liệu')
      .toBeGreaterThan(0);

    expect(
      Object.keys(allRows[0]).length,
      'File Excel không có các cột dữ liệu'
    ).toBeGreaterThan(0);
  });

  test('REPORT-007 - Excel theo bộ lọc ngày', async ({ request }) => {
    const from = '2026-01-01';
    const to = '2026-12-31';

    const result = await excel(request, from, to);

    const rows = result.sheets.flatMap(sheet => sheet.rows);

    const dates = rows
      .map(row => row['Ngày đặt'] ?? row['Ngày'] ?? row['Order Date'])
      .filter(Boolean)
      .map(value => {
        if (value instanceof Date) {
          return value.toISOString().slice(0, 10);
        }
        return String(value).slice(0, 10);
      });

    test.skip(
      !dates.length,
      'Không tìm thấy cột ngày để đối chiếu bộ lọc Excel'
    );

    for (const date of dates) {
      expect(date >= from && date <= to).toBeTruthy();
    }
  });

  test('REPORT-008 - Khoảng ngày không có dữ liệu', async ({ request }) => {
    const endpoint = required(API.orders, 'danh sách đơn hàng');

    const body = await json(
      await get(request, endpoint, '2099-01-01', '2099-01-02')
    );

    expect(records(body)).toHaveLength(0);
  });

  test('REPORT-009 - Phân quyền xem doanh thu', async ({ request }) => {
    const endpoint = required(API.summary, 'thống kê tổng hợp');

    const response = await request.get(url(endpoint));

    expect(
      [401, 403],
      'Không được công khai dữ liệu doanh thu'
    ).toContain(response.status());
  });

  test('REPORT-010 - Số liệu sau cập nhật đơn', async ({ request }) => {
    test.skip(
      true,
      'Cần tạo đơn kiểm thử riêng và xác định API chuyển trạng thái, hoàn nguyên dữ liệu sau test'
    );
  });

  test('REPORT-011 - Định dạng tiền tệ', async ({ request }) => {
    const endpoint = required(API.summary, 'thống kê tổng hợp');

    const body = await json(await get(request, endpoint));

    const revenue = body.totalRevenue ?? body.revenue;

    expect(revenue, 'Chưa tìm thấy trường doanh thu').toBeDefined();

    const amount = number(revenue);

    expect(Number.isFinite(amount)).toBeTruthy();
    expect(amount).toBeGreaterThanOrEqual(0);

    // Kiểm tra dữ liệu số, chưa thay thế kiểm thử định dạng giao diện
  });

  test('REPORT-012 - Unicode tiếng Việt trong Excel', async ({ request }) => {
    const result = await excel(request);

    const rows = result.sheets.flatMap(sheet => sheet.rows);

    const texts = rows.flatMap(row =>
      Object.values(row).map(String)
    );

    const vietnamese = texts.filter(text =>
      /[àáạảãăắằặẳẵâấầậẩẫđèéẹẻẽêếềệểễìíịỉĩòóọỏõôốồộổỗơớờợởỡùúụủũưứừựửữỳýỵỷỹ]/i.test(text)
    );

    test.skip(
      vietnamese.length === 0,
      'Excel hiện chưa có dữ liệu tiếng Việt có dấu'
    );

    expect(
      vietnamese.every(text => !text.includes('\uFFFD')),
      'Phát hiện ký tự lỗi font trong dữ liệu'
    ).toBeTruthy();
  });

});
