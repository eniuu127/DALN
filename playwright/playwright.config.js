// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Chạy lần lượt để tránh trùng dữ liệu đăng ký
  fullyParallel: false,
  workers: 1,

  // Chưa tự chạy lại khi test lỗi
  retries: 0,

  // Thời gian tối đa mỗi test
  timeout: 30000,

  expect: {
    timeout: 10000,
  },

  // Báo cáo kiểm thử
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    // Địa chỉ website JODOK
    baseURL: 'http://localhost:8080',

    // Lưu bằng chứng khi kiểm thử thất bại
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',

    // Thời gian chờ thao tác
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  // Chỉ chạy Chromium trước
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1366,
          height: 768,
        },
      },
    },
  ],
});