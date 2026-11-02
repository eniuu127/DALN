
import { test, expect, type Page } from '@playwright/test';

const CHAT_URL_PATTERN = /\/api\/.*(chat|assistant|gemini|ai)(\/|$|\?)/i;

async function firstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if (await item.isVisible().catch(() => false)) {
      return item;
    }
  }
  return null;
}

test('CHATBOT-011 - Dịch vụ AI không phản hồi', async ({ page }) => {
  let intercepted = 0;

  // Giả lập lỗi từ API chatbot, không gọi dịch vụ AI thật
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());

    if (CHAT_URL_PATTERN.test(url.pathname)) {
      intercepted++;

      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Dịch vụ AI tạm thời không phản hồi'
        })
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');

  // Mở khung chatbot nếu chưa mở
  const inputSelectors = [
    process.env.JODOK_CHAT_INPUT_SELECTOR || '',
    '#chatInput',
    '#chatbotInput',
    '#chatbot-input',
    '#messageInput',
    'textarea[placeholder*="tin nhắn" i]',
    'input[placeholder*="nhắn" i]',
    'textarea[placeholder*="hỏi" i]',
    'input[placeholder*="hỏi" i]'
  ].filter(Boolean);

  let chatInput = await firstVisible(page, inputSelectors);

  if (!chatInput) {
    const openButton = page.getByRole('button', {
      name: /chatbot|trò chuyện|chat|hỗ trợ|tư vấn/i
    }).first();

    if (await openButton.isVisible().catch(() => false)) {
      await openButton.click();
    }

    chatInput = await firstVisible(page, inputSelectors);
  }

  expect(
    chatInput,
    'Không tìm thấy ô nhập chatbot. Cần cấu hình JODOK_CHAT_INPUT_SELECTOR.'
  ).not.toBeNull();

  await chatInput!.fill('Tôi muốn tìm áo nam khoảng 200k');

  const sendButton = await firstVisible(page, [
    process.env.JODOK_CHAT_SEND_SELECTOR || '',
    '#sendChatButton',
    '#chatSendButton',
    '#sendMessage',
    'button[aria-label*="Gửi" i]',
    'button[title*="Gửi" i]'
  ].filter(Boolean));

  if (sendButton) {
    await sendButton.click();
  } else {
    await chatInput!.press('Enter');
  }

  // Xác nhận request chatbot đã gặp lỗi giả lập
  await expect.poll(
    () => intercepted,
    {
      message: 'Không phát hiện request API chatbot để giả lập lỗi.',
      timeout: 10000
    }
  ).toBeGreaterThan(0);

  // Đợi frontend xử lý lỗi và kiểm tra thông báo hiển thị
  const errorMessage = page.getByText(
    /xin lỗi|thử lại|tạm thời|không thể|lỗi|không phản hồi|kết nối|gián đoạn/i
  ).last();

  await expect(
    errorMessage,
    'Chatbot chưa hiển thị thông báo lỗi phù hợp'
  ).toBeVisible({ timeout: 15000 });

  // Sau lỗi, người dùng vẫn có thể nhập tin nhắn
  await expect(chatInput!).toBeVisible();
  await expect(chatInput!).toBeEnabled();

  await chatInput!.fill('Tôi muốn hỏi lại');

  await expect(chatInput!).toHaveValue('Tôi muốn hỏi lại');

  console.log('CHATBOT-011: Đã giả lập lỗi AI thành công.');
  console.log('CHATBOT-011: Chatbot có phản hồi lỗi trên giao diện.');
  console.log('CHATBOT-011: Ô nhập tin nhắn vẫn hoạt động.');
});
