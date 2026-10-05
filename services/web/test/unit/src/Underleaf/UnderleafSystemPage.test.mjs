import { beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from '@overleaf/settings'
import {
  renderErrorPage,
  renderMaintenance,
  renderSessionExpired,
  renderSystemPage,
} from '../../../../app/src/Features/Underleaf/UnderleafSystemPage.mjs'
import HttpErrorHandler from '../../../../app/src/Features/Errors/HttpErrorHandler.mjs'

vi.mock('@overleaf/settings', () => ({
  default: { underleaf: true, appName: 'Underleaf' },
}))

describe('Underleaf system-page contracts', () => {
  let req, res
  beforeEach(() => {
    delete Settings.maintenanceMessage
    delete Settings.maintenanceMessageHTML
    req = {
      session: {},
      url: '/example',
      accepts: vi.fn().mockReturnValue('html'),
      logger: { addFields: vi.fn(), setLevel: vi.fn() },
    }
    res = {
      locals: { ExposedSettings: { underleaf: true } },
      set: vi.fn(),
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      header: vi.fn(),
      setHeader: vi.fn(),
      contentType: vi.fn(),
      send: vi.fn(),
    }
  })

  function renderedPage() {
    return res.render.mock.lastCall[1].systemPage
  }

  it.each([403, 404, 500])(
    'preserves status %i and uses the shared shell without internal details',
    code => {
      HttpErrorHandler.handleErrorByStatusCode(
        req,
        res,
        new Error('passwordHash=internal-secret'),
        code
      )
      expect(res.status).toHaveBeenCalledWith(code)
      expect(res.render).toHaveBeenCalledWith(
        'underleaf/system',
        expect.objectContaining({
          metadata: expect.objectContaining({ robotsNoindexNofollow: true }),
        })
      )
      expect(renderedPage()).toMatchObject({
        kind: 'error',
        code,
        signedIn: false,
        backPath: '/login',
      })
      expect(JSON.stringify(res.render.mock.lastCall)).not.toContain(
        'internal-secret'
      )
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
    }
  )

  it('renders early session errors before frontend metadata and translations exist', () => {
    req.session = undefined
    res.locals = {}
    renderSessionExpired(req, res)
    expect(res.render.mock.lastCall[0]).toBe('underleaf/system-static')
    expect(renderedPage()).toMatchObject({
      title: 'Session expired',
      kind: 'session-expired',
      signedIn: false,
      canAdmin: false,
    })
    expect(res.render.mock.lastCall[1].translate('log_in')).toBe('Log in')
  })

  it('uses a valid canonical session for private navigation', () => {
    req.session.passport = {
      user: {
        _id: 'admin-id',
        username: 'administrator',
        role: 'admin',
        status: 'active',
        identityVersion: 1,
      },
    }
    renderErrorPage(req, res, 404)
    expect(renderedPage()).toMatchObject({
      signedIn: true,
      canAdmin: true,
      backPath: '/project',
    })
  })

  it('does not turn a legacy email session into authenticated or administrator navigation', () => {
    req.session.passport = {
      user: {
        _id: 'legacy-id',
        email: 'legacy@example.invalid',
        isAdmin: true,
      },
    }
    renderErrorPage(req, res, 403)
    expect(renderedPage()).toMatchObject({
      signedIn: false,
      canAdmin: false,
      backPath: '/login',
    })
  })

  it('keeps JSON and plaintext error responses outside the HTML shell', () => {
    req.accepts.mockReturnValue('json')
    HttpErrorHandler.badRequest(req, res, 'Invalid username', {
      code: 'invalid_username',
    })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid username',
      code: 'invalid_username',
    })
    expect(res.render).not.toHaveBeenCalled()
    req.accepts.mockReturnValue(false)
    HttpErrorHandler.notFound(req, res)
    expect(res.status).toHaveBeenLastCalledWith(404)
    expect(res.send).toHaveBeenCalledWith('not found')
    expect(res.render).not.toHaveBeenCalled()
  })

  it('preserves maintenance health status and trusted administrator messages', () => {
    Settings.maintenanceMessage = 'Upgrade in progress'
    Settings.maintenanceMessageHTML = '<p>Upgrade in progress</p>'
    HttpErrorHandler.maintenance(req, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(renderedPage()).toMatchObject({
      kind: 'maintenance',
      description: 'Upgrade in progress',
      descriptionHtml: '<p>Upgrade in progress</p>',
    })
    req.url = '/'
    HttpErrorHandler.maintenance(req, res)
    expect(res.status).toHaveBeenLastCalledWith(200)
  })

  it('keeps server preferences authoritative and uses localized copy when available', () => {
    res.locals.translate = key => (key === 'log_in' ? 'Entrar' : key)
    renderSystemPage(
      req,
      res,
      { kind: 'logout', title: 'Sair?', description: 'Salve suas alterações.' },
      { initialTheme: 'light', userSettings: { overallTheme: 'light-' } }
    )
    expect(renderedPage().backLabel).toBe('Entrar')
    expect(res.render.mock.lastCall[1]).toMatchObject({
      initialTheme: 'light',
      userSettings: { overallTheme: 'light-' },
    })
  })

  it('offers a readable maintenance fallback without configuration or translation services', () => {
    renderMaintenance(req, res)
    expect(renderedPage().description).toContain('Underleaf installation')
    expect(renderedPage().descriptionHtml).toBeUndefined()
  })
})
