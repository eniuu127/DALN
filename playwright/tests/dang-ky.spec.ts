import { test, expect, type Page } from '@playwright/test';

// Tên trường và nội dung thông báo lấy từ src/main/resources/static/js/auth.js
const PASSWORD = 'Testabc123!';
const accountEmail = (label: string) => `e2e.${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
const apiRegister = (url: string) => url.includes('/api/auth/register');

type RegisterData = { name?: string; email?: string; password?: string; confirm?: string };

async function openRegister(page: Page) {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Đăng ký ngay' }).click();
  await expect(page.locator('#regFullname')).toBeVisible();
}

async function fillRegister(page: Page, data: RegisterData = {}) {
  await page.locator('#regFullname').fill(data.name ?? 'Nguyen Van Test');
  await page.locator('#regEmail').fill(data.email ?? accountEmail('valid'));
  await page.locator('#regPassword').fill(data.password ?? PASSWORD);
  await page.locator('#regConfirm').fill(data.confirm ?? data.password ?? PASSWORD);
}

async function expectClientRejected(page: Page, message: RegExp, field: string) {
  // Với dữ liệu sai được kiểm tra ở JavaScript, không có request đăng ký gửi đi.
  let requests = 0;
  const listener = (request: import('@playwright/test').Request) => {
    if (request.method() === 'POST' && apiRegister(request.url())) requests++;
  };
  page.on('request', listener);
  await page.locator('#registerSubmit').click();
  await expect(page.locator('#authMsgText')).toContainText(message);
  await expect(page.locator(field)).toHaveAttribute('aria-invalid', 'true');
  expect(requests).toBe(0);
  page.off('request', listener);
}

async function expectRegistrationSuccess(page: Page) {
  await expect(page.locator('#loginEmail')).toBeVisible();
  await expect(page.locator('#regEmail')).toHaveCount(0);
}

test.describe('Đăng ký JODOK — đối chiếu AUTH trong Excel', () => {
  test('AUTH-001 - Đăng ký với thông tin hợp lệ', async ({ page }) => {
    await openRegister(page);
    const email = accountEmail('auth001');
    await fillRegister(page, { email });
    const responsePromise = page.waitForResponse(r => apiRegister(r.url()) && r.request().method() === 'POST');
    await page.locator('#registerSubmit').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const saved = await response.json();
    expect(saved.email).toBe(email);
    await expectRegistrationSuccess(page);
  });

  test('AUTH-002 - Bỏ trống email, các trường còn lại hợp lệ', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { email: '' });
    await expectClientRejected(page, /đúng định dạng email/i, '#regEmail');
  });

  test('AUTH-003 - Email sai định dạng', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { email: 'abc@' });
    await expectClientRejected(page, /đúng định dạng email/i, '#regEmail');
  });

  test('AUTH-004 - Email đã tồn tại', async ({ page }) => {
    // Tạo trước tài khoản bằng API thật để chắc chắn email đã có trong DB test.
    const email = accountEmail('auth004');
    const created = await page.request.post('/api/auth/register', {
      data: { fullname: 'Nguyen Van Test', email, password: PASSWORD }
    });
    expect(created.status()).toBe(200);
    await openRegister(page);
    await fillRegister(page, { email });
    const responsePromise = page.waitForResponse(r => apiRegister(r.url()) && r.request().method() === 'POST');
    await page.locator('#registerSubmit').click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    await expect(page.locator('#authMsgText')).toContainText(/email.*(sử dụng|tồn tại)|đã.*email/i);
    await expect(page.locator('#regEmail')).toBeVisible();
  });

  test('AUTH-005 - Mật khẩu quá ngắn', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { password: 'Abc123', confirm: 'Abc123' });
    await expectClientRejected(page, /8.72 ký tự/i, '#regPassword');
  });

  test('AUTH-006 - Mật khẩu xác nhận không khớp', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { confirm: 'Khac12345!' });
    await expectClientRejected(page, /chưa trùng/i, '#regConfirm');
  });

  test('AUTH-007 - Họ tên chỉ nhập dấu cách', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { name: '     ' });
    await expectClientRejected(page, /họ tên phải có/i, '#regFullname');
  });

  test.skip('AUTH-008 - Số điện thoại sai định dạng (form đăng ký hiện không có ô SĐT)', async () => {
    // Cần sửa lại test case Excel hoặc bổ sung trường vào form JODOK trước khi tự động hóa.
  });

  test('AUTH-009 - Nhấn Đăng ký hai lần liên tiếp', async ({ page }) => {
    await openRegister(page);
    const email = accountEmail('auth009');
    await fillRegister(page, { email });
    let requestCount = 0;
    page.on('request', request => {
      if (request.method() === 'POST' && apiRegister(request.url())) requestCount++;
    });
    // Giữ response chưa trả về để bảo đảm hai lần click xảy ra trong lúc đang gửi.
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/auth/register', async route => {
      await gate;
      await route.continue();
    });
    await page.locator('#registerSubmit').click();
    await expect(page.locator('#registerSubmit')).toBeDisabled();
    // Thao tác click thứ hai qua UI khi button đã disabled là không thể thực hiện.
    await expect(page.locator('#registerSubmit')).toBeDisabled();
    release();
    await expectRegistrationSuccess(page);
    expect(requestCount).toBe(1);
  });

  test('AUTH-010 - Họ tên dài quá giới hạn', async ({ page }) => {
    await openRegister(page);
    await fillRegister(page, { name: 'A'.repeat(256) });
    await expectClientRejected(page, /2 đến 255 ký tự/i, '#regFullname');
  });

  test.skip('AUTH-011 - Mật khẩu được băm trong CSDL (cần quyền đọc DB test)', async () => {
    // Playwright browser không chứng minh được dữ liệu đã băm trong MySQL.
  });

  test('AUTH-012 - Đăng ký xong đăng nhập ngay', async ({ page }) => {
    await openRegister(page);
    const email = accountEmail('auth012');
    await fillRegister(page, { email });
    const registerResponse = page.waitForResponse(r => apiRegister(r.url()) && r.request().method() === 'POST');
    await page.locator('#registerSubmit').click();
    expect((await registerResponse).status()).toBe(200);
    await expectRegistrationSuccess(page);
    await page.locator('#loginEmail').fill(email);
    await page.locator('#loginPassword').fill(PASSWORD);
    const loginResponse = page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
    await page.locator('#loginSubmit').click();
    expect((await loginResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('ha_user')))).toBe(true);
  });
});
