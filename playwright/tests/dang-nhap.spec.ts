import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const PASSWORD = 'Testabc123!';
const uniqueEmail = (tag: string) => `e2e.login.${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 9)}@example.com`;
const isLogin = (url: string) => url.includes('/api/auth/login');

async function registerUser(request: APIRequestContext, name = 'Nguyen Van Test') {
  const email = uniqueEmail('user');
  const response = await request.post('/api/auth/register', {data: {fullname: name, email, password: PASSWORD}});
  expect(response.status(), `Không tạo được tài khoản test: ${await response.text()}`).toBe(200);
  return { email, password: PASSWORD, name };
}
async function openLogin(page: Page) {
  await page.goto('/auth');
  await expect(page.locator('#loginEmail')).toBeVisible();
}
async function enterLogin(page: Page, email: string, password: string) {
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill(password);
}
async function clickLoginAndResponse(page: Page) {
  const pending = page.waitForResponse(r => isLogin(r.url()) && r.request().method() === 'POST');
  await page.locator('#loginSubmit').click();
  return pending;
}
async function loginSuccess(page: Page, email: string, password = PASSWORD) {
  await openLogin(page);
  await enterLogin(page, email, password);
  const response = await clickLoginAndResponse(page);
  expect(response.status()).toBe(200);
  await expect.poll(() => page.evaluate(() => {
    const stored = localStorage.getItem('ha_user');
    return stored ? JSON.parse(stored).email : null;
  })).toBe(email);
  await expect(page).toHaveURL(/\/$/);
}
async function expectNotLoggedIn(page: Page) {
  expect(await page.evaluate(() => localStorage.getItem('ha_user'))).toBeNull();
}

// Chạy từng ca trên DB test; đăng ký tài khoản thật trong DB được cấu hình cho website.
test.describe('Đăng nhập JODOK — đối chiếu LOGIN trong Excel', () => {
  test('LOGIN-001 - Đăng nhập đúng', async ({page, request}) => {
    const user = await registerUser(request);
    await loginSuccess(page, user.email);
    await page.goto('/auth');
    await expect(page.getByText(user.email, {exact: false})).toBeVisible();
  });
  test('LOGIN-002 - Nhập mật khẩu sai', async ({page, request}) => {
    const user = await registerUser(request);
    await openLogin(page);
    await enterLogin(page, user.email, 'Sai@12345');
    const response = await clickLoginAndResponse(page);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expect(page.locator('#authMsgText')).not.toBeEmpty();
    await expectNotLoggedIn(page);
  });
  test('LOGIN-003 - Tài khoản không tồn tại', async ({page}) => {
    await openLogin(page);
    await enterLogin(page, uniqueEmail('missing'), PASSWORD);
    const response = await clickLoginAndResponse(page);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expect(page.locator('#authMsgText')).not.toBeEmpty();
    await expectNotLoggedIn(page);
  });
  test('LOGIN-004 - Bỏ trống email', async ({page}) => {
    await openLogin(page);
    await enterLogin(page, '', PASSWORD);
    let sent = 0;
    page.on('request', req => { if (isLogin(req.url()) && req.method() === 'POST') sent++; });
    await page.locator('#loginSubmit').click();
    await expect(page.locator('#authMsgText')).toContainText('Vui lòng nhập email và mật khẩu');
    await expect(page.locator('#loginEmail')).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toBe(0);
    await expectNotLoggedIn(page);
  });
  test('LOGIN-005 - Bỏ trống mật khẩu', async ({page, request}) => {
    const user = await registerUser(request);
    await openLogin(page);
    await enterLogin(page, user.email, '');
    let sent = 0;
    page.on('request', req => { if (isLogin(req.url()) && req.method() === 'POST') sent++; });
    await page.locator('#loginSubmit').click();
    await expect(page.locator('#authMsgText')).toContainText('Vui lòng nhập email và mật khẩu');
    await expect(page.locator('#loginPassword')).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toBe(0);
    await expectNotLoggedIn(page);
  });
  test('LOGIN-006 - Đăng xuất', async ({page, request}) => {
    const user = await registerUser(request);
    await loginSuccess(page, user.email);
    await page.goto('/auth');
    await page.getByRole('button', {name: 'Đăng xuất'}).click();
    await expectNotLoggedIn(page);
    await expect(page.locator('#loginEmail')).toBeVisible();
  });
  test('LOGIN-007 - Quay lại sau đăng xuất', async ({page, request}) => {
    const user = await registerUser(request);
    await loginSuccess(page, user.email);
    await page.goto('/auth');
    await page.getByRole('button', {name: 'Đăng xuất'}).click();
    await page.goBack();
    await page.reload();
    await expectNotLoggedIn(page);
    await page.goto('/auth');
    await expect(page.locator('#loginEmail')).toBeVisible();
  });
  test('LOGIN-008 - Truy cập trang tài khoản khi chưa đăng nhập', async ({page}) => {
    await page.goto('/account');
    await expectNotLoggedIn(page);
    // Trang bảo vệ không được tiết lộ thông tin cá nhân/đơn hàng khi chưa đăng nhập.
    await expect(page.locator('#accountFullname, #accountEmail, .account-profile-form input[value*="@"]')).toHaveCount(0);
  });
  test.skip('LOGIN-009 - Phiên hết hạn (chưa có cơ chế tạo token hết hạn kiểm chứng được)', async () => {});
  test.skip('LOGIN-010 - Sai mật khẩu nhiều lần (chưa xác định chính sách giới hạn/khóa tài khoản)', async () => {});
  test('LOGIN-011 - Đăng nhập ở hai tab', async ({context, page, request}) => {
    const user = await registerUser(request);
    await loginSuccess(page, user.email);
    const second = await context.newPage();
    await second.goto('/auth');
    await expect(second.getByText(user.email, {exact: false})).toBeVisible();
    const saved = await second.evaluate(() => JSON.parse(localStorage.getItem('ha_user') || 'null'));
    expect(saved?.email).toBe(user.email);
    await second.close();
  });
  test('LOGIN-012 - Tên tài khoản có dấu tiếng Việt', async ({page, request}) => {
    const user = await registerUser(request, 'Nguyễn Văn Ánh');
    await loginSuccess(page, user.email);
    await page.goto('/auth');
    await expect(page.getByRole('heading', {name: /Nguyễn Văn Ánh/})).toBeVisible();
  });
});
