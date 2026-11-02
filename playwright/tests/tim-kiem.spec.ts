import { test, expect, type Page } from '@playwright/test';
import { openShop, cards, products } from './helpers/jodok';

const nameSelector = '.jodok-product-name';
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

async function names(page: Page): Promise<string[]> {
  return page.locator(`.jodok-product-card ${nameSelector}`).allTextContents().then(a => a.map(normalize));
}
async function visibleProduct(page: Page, productName: string) {
  await expect(cards(page).filter({ has: page.locator(nameSelector).filter({ hasText: productName }) }).first()).toBeVisible();
  expect((await names(page)).includes(normalize(productName)), `Không tìm thấy đúng tên: ${productName}`).toBeTruthy();
}
async function setPrice(page: Page, min: string, max: string) {
  await page.locator('#shopMinPrice').fill(min);
  await page.locator('#shopMaxPrice').fill(max);
  await page.locator('.shop-price-filter button[type="submit"]').click();
  await expect(page.locator('.shop-result-count')).toBeVisible();
}
// Đọc GIÁ ĐANG HIỂN THỊ, không lấy giá gốc khi sản phẩm có giảm giá.
// Nếu mỗi thẻ có nhiều mức giá, chọn mức giá đầu tiên được hiển thị.
async function displayedPrices(page: Page): Promise<number[]> {
  return cards(page).evaluateAll(els => els.map(card => {
    // JODOK hiển thị giá gốc trong <del> trước giá thực bán trong <strong>.
    // Bộ lọc và sắp xếp dùng jodokSalePrice(), tức giá thực bán.
    const el = card.querySelector('.jodok-product-price strong');
    if (!el) throw new Error('Không thấy giá đang bán trên thẻ sản phẩm');
    const priceText = (el.textContent || '').match(/[\d.,]+\s*đ/i)?.[0];
    if (!priceText) throw new Error(`Không đọc được giá: ${el.textContent}`);
    return Number(priceText.replace(/[^\d]/g, ''));
  }));
}
async function categories(page: Page) {
  const response = await page.request.get('/api/categories');
  expect(response.ok()).toBeTruthy();
  return await response.json() as Array<{ categoryId: number; categoryName?: string; name?: string }>;
}

test.describe('Danh mục và tìm kiếm — SEARCH trong Excel', () => {
  test('SEARCH-001 - Tìm đúng tên đầy đủ', async ({ page, request }) => {
    const p = (await products(request))[0];
    test.skip(!p, 'Chưa có sản phẩm');
    await openShop(page, p.productName);
    await visibleProduct(page, p.productName);
    // Có thể nhiều sản phẩm cùng tên, không ép số lượng đúng bằng 1.
    const resultNames = await names(page);
    expect(resultNames.length).toBeGreaterThan(0);
    for (const name of resultNames) expect(name).toContain(normalize(p.productName));
  });

  test('SEARCH-002 - Tìm tên một phần', async ({ page, request }) => {
    const p = (await products(request)).find(p => p.productName.trim().split(/\s+/).length >= 2);
    test.skip(!p, 'Thiếu sản phẩm có tên nhiều từ');
    const term = p!.productName.trim().split(/\s+/)[0];
    await openShop(page, term);
    const resultNames = await names(page);
    expect(resultNames.length).toBeGreaterThan(0);
    for (const name of resultNames) expect(name).toContain(normalize(term));
  });

  test('SEARCH-003 - Không phân biệt chữ hoa và thường', async ({ page, request }) => {
    const p = (await products(request)).find(p => /áo thun/i.test(p.productName));
    test.skip(!p, 'Chưa có sản phẩm áo thun');
    await openShop(page, 'ÁO THUN');
    const upper = await names(page);
    await openShop(page, 'áo thun');
    const lower = await names(page);
    expect(lower.length).toBeGreaterThan(0);
    expect(lower).toEqual(upper);
  });

  test('SEARCH-004 - Từ khóa không tồn tại', async ({ page }) => {
    await openShop(page, 'chuoi-khong-co-san-pham-xyz');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('.shop-result-count')).toContainText('0 sản phẩm');
  });

  test('SEARCH-005 - Tìm kiếm chuỗi rỗng', async ({ page, request }) => {
    await openShop(page, '');
    const all = await products(request);
    const resultNames = await names(page);
    expect(resultNames.length).toBeGreaterThan(0);
    // Dùng tên thay vì đòi số thẻ == tổng API (API có thể trả dữ liệu ẩn/phân trang).
    const dataNames = new Set(all.map(p => normalize(p.productName)));
    for (const name of resultNames) expect(dataNames.has(name), `Sản phẩm bất thường: ${name}`).toBeTruthy();
  });

  test('SEARCH-006 - Bỏ khoảng trắng thừa', async ({ page, request }) => {
    const p = (await products(request)).find(p => /áo thun/i.test(p.productName));
    test.skip(!p, 'Chưa có áo thun');
    await openShop(page, 'áo thun');
    const expected = await names(page);
    await openShop(page, '   áo thun   ');
    expect(await names(page)).toEqual(expected);
  });

  test('SEARCH-007 - Tìm tên tiếng Việt có dấu', async ({ page, request }) => {
    const p = (await products(request)).find(p => p.productName.includes('Áo khoác nữ'));
    test.skip(!p, 'Chưa có Áo khoác nữ');
    await openShop(page, 'Áo khoác nữ');
    await visibleProduct(page, p!.productName);
  });

  test('SEARCH-008 - Lọc theo danh mục Áo nam', async ({ page, request }) => {
    const cs = await categories(page);
    const c = cs.find(x => /áo nam/i.test(x.categoryName || x.name || ''));
    test.skip(!c, 'Không có danh mục Áo nam');
    await page.goto(`/products?categoryId=${c!.categoryId}`);
    await expect(page.locator('.shop-result-count')).toBeVisible();
    // Xác nhận bộ lọc đã chọn, không sử dụng assertion vô nghĩa >= 0.
    await expect(page).toHaveURL(new RegExp(`categoryId=${c!.categoryId}`));
    const subset = (await products(request)).filter(p => Number(p.category?.categoryId ?? p.categoryId) === Number(c!.categoryId));
    if (subset.length) await visibleProduct(page, subset[0].productName);
  });

  test('SEARCH-009 - Lọc giá 100000 đến 300000', async ({ page }) => {
    await openShop(page);
    await setPrice(page, '100000', '300000');
    const prices = await displayedPrices(page);
    for (const price of prices) {
      expect(price).toBeGreaterThanOrEqual(100000);
      expect(price).toBeLessThanOrEqual(300000);
    }
    // Nếu không có kết quả, phải có thông báo 0 sản phẩm.
    if (!prices.length) await expect(page.locator('.shop-result-count')).toContainText('0 sản phẩm');
  });

  test('SEARCH-010 - Khoảng giá đảo ngược', async ({ page }) => {
    await openShop(page);
    await page.locator('#shopMinPrice').fill('500000');
    await page.locator('#shopMaxPrice').fill('100000');
    const original = await names(page);
    let dialogMessage: string | undefined;
    // Phải xử lý dialog ngay khi xuất hiện, trước khi click() kết thúc.
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    await page.locator('.shop-price-filter button[type="submit"]').click();
    expect(dialogMessage, 'Không nhận được cảnh báo khoảng giá đảo ngược')
      .toMatch(/giá từ.*lớn hơn giá đến/i);
    expect(await names(page)).toEqual(original);
  });

  test('SEARCH-011 - Kết hợp danh mục Áo nữ và giá tối đa', async ({ page }) => {
    const cs = await categories(page);
    const c = cs.find(x => /áo nữ/i.test(x.categoryName || x.name || ''));
    test.skip(!c, 'Chưa có danh mục Áo nữ');
    await page.goto(`/products?categoryId=${c!.categoryId}`);
    await expect(page.locator('#shopMaxPrice')).toBeVisible();
    await setPrice(page, '', '300000');
    for (const price of await displayedPrices(page)) expect(price).toBeLessThanOrEqual(300000);
    await expect(page).toHaveURL(new RegExp(`categoryId=${c!.categoryId}`));
  });

  test('SEARCH-012 - Phân trang danh sách', async ({ page }) => {
    await openShop(page);
    const next = page.getByRole('button', { name: /trang tiếp|tiếp theo|next/i });
    test.skip(!(await next.count()), 'Website chưa có nút phân trang');
    const previous = await names(page);
    await next.first().click();
    expect(await names(page)).not.toEqual(previous);
  });

  test('SEARCH-013 - Sắp xếp giá tăng dần', async ({ page }) => {
    await openShop(page);
    await page.locator('select[onchange*="sortProducts"]').selectOption('asc');
    const prices = await displayedPrices(page);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('SEARCH-014 - Xóa bộ lọc', async ({ page }) => {
    await openShop(page);
    const before = await names(page);
    await setPrice(page, '100000', '');
    await expect(page.locator('.shop-price-clear')).toBeVisible();
    await page.locator('.shop-price-clear').click();
    await expect(page.locator('#shopMinPrice')).toHaveValue('');
    expect(await names(page)).toEqual(before);
  });
});
