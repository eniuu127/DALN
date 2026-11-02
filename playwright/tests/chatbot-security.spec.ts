
import { test, expect } from '@playwright/test';

test('CHATBOT-012 - Kiểm tra bảo vệ API key trên frontend', async ({ page, request }) => {
  await page.goto('/');

  const resources = await page.locator('script[src]').evaluateAll(elements =>
    elements.map(el => (el as HTMLScriptElement).src)
  );

  const secrets: string[] = [];
  const patterns = [
    /sk-proj-[A-Za-z0-9_-]{20,}/g,
    /sk-[A-Za-z0-9_-]{30,}/g,
    /AIza[0-9A-Za-z_-]{35}/g,
    /xai-[A-Za-z0-9_-]{20,}/g
  ];

  for (const url of resources) {
    const response = await request.get(url);
    if (!response.ok()) continue;

    const source = await response.text();

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        secrets.push(`${url}: ${match[0].slice(0, 8)}...`);
      }
    }
  }

  expect(
    secrets,
    'Phát hiện chuỗi có định dạng API key trong JavaScript frontend'
  ).toEqual([]);
});
