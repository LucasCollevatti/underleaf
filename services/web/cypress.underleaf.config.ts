import { randomBytes } from 'node:crypto'
import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  retries: 0, // Bootstrap is intentionally not repeatable on the same installation.
  viewportWidth: 1280,
  viewportHeight: 900,
  defaultCommandTimeout: 30000,
  pageLoadTimeout: 120000,
  responseTimeout: 180000,
  screenshotsFolder: 'cypress/results/underleaf-product',
  e2e: {
    baseUrl: process.env.UNDERLEAF_E2E_BASE_URL || 'http://localhost:8080',
    specPattern: 'test/e2e/underleaf/**/*.cy.js',
    supportFile: 'test/e2e/underleaf/support.js',
    setupNodeEvents(on) {
      if (process.env.UNDERLEAF_E2E_ALLOW_BOOTSTRAP !== '1') {
        throw new Error(
          'Use a disposable, uninitialized Underleaf installation and set UNDERLEAF_E2E_ALLOW_BOOTSTRAP=1. This suite creates an administrator, accounts and a project.'
        )
      }
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family !== 'chromium') {
          throw new Error(
            'The product suite requires Chromium for operating-system theme emulation.'
          )
        }
        launchOptions.args.push('--lang=en-US')
        return launchOptions
      })
      on('task', {
        productCredentials() {
          const suffix = randomBytes(6).toString('hex')
          return {
            admin: {
              username: `e2e-admin-${suffix}`,
              password: randomBytes(24).toString('hex'),
            },
            user: {
              username: `e2e-user-${suffix}`,
              password: randomBytes(24).toString('hex'),
            },
            resetPassword: randomBytes(24).toString('hex'),
            projectName: `Underleaf product ${suffix}`,
          }
        },
      })
    },
  },
})
