const { chromium } = require('playwright')

async function inspectPage(page, path, selectors, screenshotPath) {
  await page.goto(`http://127.0.0.1:8080${path}`, {
    waitUntil: 'networkidle',
  })
  await page.locator(selectors.title).waitFor({ state: 'visible' })

  const metrics = {}
  for (const [name, selector] of Object.entries(selectors)) {
    const locator = page.locator(selector).first()
    metrics[name] = {
      box: await locator.boundingBox(),
      styles: await locator.evaluate(element => {
        const styles = getComputedStyle(element)
        return {
          display: styles.display,
          fontSize: styles.fontSize,
          lineHeight: styles.lineHeight,
          margin: styles.margin,
          padding: styles.padding,
        }
      }),
    }
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  return metrics
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
  })
  await context.addCookies([
    {
      name: 'overleaf.sid',
      value: process.env.UNDERLEAF_VISUAL_SESSION,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  const page = await context.newPage()
  const administration = await inspectPage(
    page,
    '/admin',
    {
      main: '.underleaf-admin-main',
      header: '.underleaf-admin-heading',
      title: '.underleaf-admin-heading h1',
      subtitle: '.underleaf-admin-heading p',
      content: '.underleaf-admin-stats',
    },
    '/artifacts/administration.png'
  )
  const projects = await inspectPage(
    page,
    '/project',
    {
      main: '.underleaf-projects-main',
      header: '.underleaf-projects-header',
      title: '.underleaf-projects-heading h1',
      subtitle: '.underleaf-projects-heading p',
      content: '.underleaf-project-table-container',
    },
    '/artifacts/projects.png'
  )

  console.log(JSON.stringify({ administration, projects }, null, 2))
  await browser.close()
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
