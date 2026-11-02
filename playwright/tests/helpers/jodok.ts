import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

export const env = {
  email: process.env.JODOK_TEST_EMAIL || '',
  password: process.env.JODOK_TEST_PASSWORD || '',
};
export type Product = {productId:number; productName:string; basePrice:number; status:string; category?:{categoryId:number;categoryName?:string}; categoryId?:number; imageUrl?:string};
export type Variant = {variantId:number; size:string; color:string; stock:number; price:number; status:string; product?:Product};
export async function products(request:APIRequestContext):Promise<Product[]> {
  const r=await request.get('/api/products'); expect(r.ok(), `GET /api/products: ${r.status()}`).toBeTruthy();
  return (await r.json()).filter((p:Product)=>p.status==='ACTIVE');
}
export async function variants(request:APIRequestContext,id:number):Promise<Variant[]> {
  const r=await request.get(`/api/variants/product/${id}`); expect(r.ok(),`GET variants: ${r.status()}`).toBeTruthy();return r.json();
}
export async function choose(request:APIRequestContext, predicate:(p:Product,v:Variant[])=>boolean) {
  for (const p of await products(request)) {const vs=await variants(request,p.productId); if(predicate(p,vs))return {p,vs};}
  test.skip(true,'Thiếu dữ liệu seed phù hợp tình huống trong cơ sở dữ liệu kiểm thử');
  throw Error('unreachable');
}
export async function openShop(page:Page, keyword?:string) {
  await page.goto(keyword===undefined?'/products':`/products?keyword=${encodeURIComponent(keyword)}`);
  await expect(
    page.getByRole('heading', {
      name: 'Danh sách sản phẩm'
    })
  ).toBeVisible();
}
export function cards(page:Page) {return page.locator('.jodok-product-card');}
export async function openDetail(page:Page,id:number) {
  await page.goto(`/detail?productId=${id}`);
  await expect(page.locator('#detailQty')).toBeVisible();
}
export async function selectVariant(page:Page,v:Variant) {
  await page.locator('.detail-option-row').first().getByRole('button',{name:v.size,exact:true}).click();
  await page.locator('.detail-option-row').nth(1).getByRole('button',{name:v.color,exact:true}).click();
}


export async function login(page: Page) {
  test.skip(
    !env.email || !env.password,
    'Chưa cấu hình tài khoản USER kiểm thử'
  );

  await page.goto('/auth');

  const emailInput = page.locator('#loginEmail');
  const passwordInput = page.locator('#loginPassword');

  await expect(emailInput).toBeVisible();

  await emailInput.fill(env.email);
  await passwordInput.fill(env.password);

  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/auth/login') &&
      response.request().method() === 'POST'
  );

  await page.locator('#loginSubmit').click();

  const response = await responsePromise;

  if (response.status() !== 200) {
    throw new Error(
      `Đăng nhập tài khoản kiểm thử thất bại. ` +
      `HTTP ${response.status()}`
    );
  }

  // Chờ JODOK hoàn tất điều hướng sau đăng nhập
  await page.waitForLoadState('domcontentloaded');

  // Đọc Local Storage; thử lại nếu trang đang chuyển hướng
  await expect.poll(
    async () => {
      try {
        return await page.evaluate(() => {
          const raw = localStorage.getItem('ha_user');

          if (!raw) return false;

          const user = JSON.parse(raw);

          return Boolean(
            user.token &&
            user.role === 'USER'
          );
        });
      } catch (error) {
        // Trang có thể đang điều hướng sau đăng nhập
        if (
          error instanceof Error &&
          /Execution context was destroyed|navigation/i.test(error.message)
        ) {
          return false;
        }

        throw error;
      }
    },
    {
      message: 'Chờ JODOK lưu phiên đăng nhập USER',
      timeout: 15000,
      intervals: [200, 500, 1000],
    }
  ).toBeTruthy();

  // Xác nhận phiên vẫn tồn tại sau khi tải lại
  await page.reload();

  await expect.poll(async () => {
    try {
      return await page.evaluate(() => {
        const raw = localStorage.getItem('ha_user');

        if (!raw) return false;

        const user = JSON.parse(raw);
        return Boolean(user.token && user.role === 'USER');
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /Execution context was destroyed|navigation/i.test(error.message)
      ) {
        return false;
      }
      throw error;
    }
  }).toBeTruthy();
}


export async function openCart(page:Page){await page.goto('/cart'); await expect(page.getByText('Giỏ hàng của bạn')).toBeVisible();}
export async function cartItems(page:Page){return page.locator('button[onclick^="removeItem("]').count();}
export async function add(page:Page,id:number,v:Variant,qty=1){await openDetail(page,id);await selectVariant(page,v);await page.locator('#detailQty').fill(String(qty));await page.locator('#detailQty').dispatchEvent('change'); const wait=page.waitForResponse(r=>r.url().includes('/api/cart/add')&&r.request().method()==='POST');await page.locator('.detail-add-cart').click();const response=await wait;expect(response.ok(),`Thêm giỏ trả ${response.status()}`).toBeTruthy();}
export async function clearCart(page: Page) {
  await openCart(page);
  const removeButtons = page.locator('button[onclick^="removeItem("]');

  for (let i = 0; i < 30; i++) {
    const beforeCount = await removeButtons.count();
    if (beforeCount === 0) return;

    await removeButtons.first().click();
    const confirmButton = page.locator('#okConfirm');
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
    await expect(removeButtons).toHaveCount(beforeCount - 1);
  }

  if (await removeButtons.count() > 0) {
    throw new Error('Không thể dọn sạch giỏ hàng sau 30 lần xóa.');
  }
}
