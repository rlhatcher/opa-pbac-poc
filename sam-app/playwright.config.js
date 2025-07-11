import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    }
  },
  projects: [
    {
      name: 'local-sam',
      use: {
        baseURL: 'http://localhost:3001'
      }
    },
    {
      name: 'opa-direct',
      use: {
        baseURL: 'http://localhost:8181'
      }
    }
  ]
})
