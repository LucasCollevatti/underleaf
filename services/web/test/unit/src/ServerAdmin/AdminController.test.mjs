import { beforeEach, describe, it, vi } from 'vitest'
import sinon from 'sinon'
import MockRequest from '../helpers/MockRequest.mjs'
import MockResponse from '../helpers/MockResponse.mjs'

const modulePath =
  '../../../../app/src/Features/ServerAdmin/AdminController.mjs'

describe('AdminController', function () {
  beforeEach(async function (ctx) {
    ctx.Settings = {}
    ctx.TpdsUpdateSender = { pollDropboxForUser: sinon.stub() }
    ctx.TpdsProjectFlusher = { flushProjectToTpds: sinon.stub() }
    ctx.EditorRealTimeController = { emitToAll: sinon.stub() }
    ctx.SystemMessageManager = {
      createMessage: sinon.stub(),
      clearMessages: sinon.stub(),
      promises: {
        getMessagesFromDB: sinon.stub().resolves([]),
      },
    }
    ctx.ProjectGetter = {
      promises: { findAllDebugProjects: sinon.stub().resolves([]) },
    }
    ctx.Modules = {
      promises: { hooks: { fire: sinon.stub().resolves([null]) } },
    }
    ctx.Features = { hasFeature: sinon.stub().returns(false) }

    vi.doMock('@overleaf/settings', () => ({ default: ctx.Settings }))
    vi.doMock(
      '../../../../app/src/Features/Editor/EditorRealTimeController',
      () => ({ default: ctx.EditorRealTimeController })
    )
    vi.doMock(
      '../../../../app/src/Features/SystemMessages/SystemMessageManager',
      () => ({ default: ctx.SystemMessageManager })
    )
    vi.doMock('../../../../app/src/Features/Project/ProjectGetter', () => ({
      default: ctx.ProjectGetter,
    }))
    vi.doMock('../../../../app/src/infrastructure/Modules', () => ({
      default: ctx.Modules,
    }))
    vi.doMock('../../../../app/src/infrastructure/Features', () => ({
      default: ctx.Features,
    }))

    ctx.controller = (await import(modulePath)).default
    ctx.req = new MockRequest(vi)
    ctx.res = new MockResponse(vi)
    ctx.res.redirect = sinon.stub()
    ctx.res.sendStatus = sinon.stub()
    ctx.res.render = sinon.stub()
    ctx.next = sinon.stub()
  })

  describe('index', function () {
    it('should render the admin page', async function (ctx) {
      await ctx.controller.index(ctx.req, ctx.res, ctx.next)
      ctx.res.render.calledWith('admin/index').should.equal(true)
    })

    it('should include debug projects when saas is enabled', async function (ctx) {
      ctx.Features.hasFeature.returns(true)
      await ctx.controller.index(ctx.req, ctx.res, ctx.next)
      ctx.ProjectGetter.promises.findAllDebugProjects.called.should.equal(true)
      ctx.res.render
        .calledWithMatch('admin/index', {
          debugProjects: [],
        })
        .should.equal(true)
    })
  })

  describe('disconnectAllUsers', function () {
    it('should use the default delay when none is given', function (ctx) {
      ctx.req.query = {}
      ctx.controller.disconnectAllUsers(ctx.req, ctx.res)
      ctx.EditorRealTimeController.emitToAll
        .calledWith('forceDisconnect', sinon.match.string, 10)
        .should.equal(true)
      ctx.res.redirect.calledWith('/admin#open-close-editor').should.equal(true)
    })

    it('should use the given delay', function (ctx) {
      ctx.req.query = { delay: '5000' }
      ctx.controller.disconnectAllUsers(ctx.req, ctx.res)
      ctx.EditorRealTimeController.emitToAll
        .calledWith('forceDisconnect', sinon.match.string, 5000)
        .should.equal(true)
    })
  })

  describe('openEditor', function () {
    it('should open the editor and redirect', function (ctx) {
      ctx.controller.openEditor(ctx.req, ctx.res)
      ctx.Settings.editorIsOpen.should.equal(true)
      ctx.res.redirect.calledWith('/admin#open-close-editor').should.equal(true)
    })
  })

  describe('closeEditor', function () {
    it('should close the editor and redirect', function (ctx) {
      ctx.req.body = {}
      ctx.controller.closeEditor(ctx.req, ctx.res)
      Boolean(ctx.Settings.editorIsOpen).should.equal(false)
      ctx.res.redirect.calledWith('/admin#open-close-editor').should.equal(true)
    })
  })



  describe('createMessage', function () {
    it('should create the message and redirect', function (ctx) {
      ctx.req.body = { content: 'a system message' }
      ctx.SystemMessageManager.createMessage.callsFake((content, cb) => cb())
      ctx.controller.createMessage(ctx.req, ctx.res, ctx.next)
      ctx.SystemMessageManager.createMessage
        .calledWith('a system message')
        .should.equal(true)
      ctx.res.redirect.calledWith('/admin#system-messages').should.equal(true)
    })
  })

  describe('clearMessages', function () {
    it('should clear messages and redirect', function (ctx) {
      ctx.SystemMessageManager.clearMessages.callsFake(cb => cb())
      ctx.controller.clearMessages(ctx.req, ctx.res, ctx.next)
      ctx.res.redirect.calledWith('/admin#system-messages').should.equal(true)
    })
  })
})
