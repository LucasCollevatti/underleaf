import { useState, type ContextType } from 'react'
import { expect } from 'chai'
import sinon from 'sinon'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import ShareProjectModal from '@/features/share-project-modal/components/share-project-modal'
import { ProjectContext } from '@/shared/context/project-context'
import { EditorContext } from '@/shared/context/editor-context'
import { SplitTestProvider } from '@/shared/context/split-test-context'
import type {
  ProjectMetadata,
  ProjectUpdate,
  ProjectMember,
} from '@/shared/context/types/project-metadata'
import type { ProjectSnapshot } from '@/infrastructure/project-snapshot'
import type { UserId } from '@ol-types/user'
import getMeta from '@/utils/meta'

const member: ProjectMember = {
  _id: 'member-id' as UserId,
  username: 'marina',
  displayName: 'Marina',
  first_name: 'Marina',
  last_name: '',
  privileges: 'readOnly',
}
const baseProject: ProjectMetadata = {
  _id: 'project-id',
  name: 'Research',
  compiler: 'pdflatex',
  imageName: 'default',
  rootDocId: 'doc-id',
  spellCheckLanguage: 'en',
  members: [member],
  invites: [],
  publicAccessLevel: 'private',
  owner: {
    _id: 'owner-id' as UserId,
    username: 'lucas',
    displayName: 'Lucas',
    first_name: 'Lucas',
    last_name: '',
    privileges: 'owner',
    signUpDate: '',
  },
  features: { collaborators: 1 },
}
function renderModal({
  owner = true,
  project = baseProject,
  hide = sinon.spy(),
} = {}) {
  function Providers() {
    const [value, setValue] = useState(project)
    const editor: NonNullable<ContextType<typeof EditorContext>> = {
      isProjectOwner: owner,
      isPendingEditor: false,
      isRestrictedTokenMember: false,
      renameProject: () => {},
      hasSuggestionsLeft: false,
      suggestionsLeft: 0,
      setSuggestionsLeft: () => {},
      premiumSuggestionResetDate: new Date(),
      setPremiumSuggestionResetDate: () => {},
      hasTokensLeft: false,
      tokensLeft: 0,
      setTokensLeft: () => {},
      tokenResetDate: new Date(),
      setTokenResetDate: () => {},
      writefullInstance: null,
      setWritefullInstance: () => {},
      upgradeTrackChangesModal: { show: false },
      setUpgradeTrackChangesModal: () => {},
    }
    return (
      <ProjectContext.Provider
        value={{
          projectId: value._id,
          project: value,
          name: value.name,
          features: value.features,
          joinedOnce: true,
          joinProject: setValue,
          tags: [],
          projectSnapshot: {} as ProjectSnapshot,
          updateProject: (update: ProjectUpdate) =>
            setValue(previous => ({ ...previous, ...update })),
        }}
      >
        <EditorContext.Provider value={editor}>
          <SplitTestProvider>
            <ShareProjectModal
              show
              animation={false}
              handleHide={hide}
              handleOpen={() => {}}
            />
          </SplitTestProvider>
        </EditorContext.Provider>
      </ProjectContext.Provider>
    )
  }
  render(<Providers />)
  return hide
}
describe('<ShareProjectModal /> Underleaf username collaboration', function () {
  beforeEach(function () {
    Object.assign(getMeta('ol-ExposedSettings'), { underleaf: true })
    window.metaAttributesCache.set('ol-capabilities', [])
    window.metaAttributesCache.set('ol-splitTestVariants', {
      'sharing-updates': 'enabled',
      'sharing-updates-new-link': 'enabled',
      'sharing-updates-group-sharing': 'enabled',
    })
  })
  afterEach(function () {
    cleanup()
    sinon.restore()
    fetchMock.removeRoutes().clearHistory()
  })
  it('shows username roles without SaaS limits, groups or email invites', async function () {
    renderModal()
    expect(await screen.findByRole('heading', { name: /Share Project/ })).to
      .exist
    expect(screen.getByText('Lucas (lucas)')).to.exist
    expect(screen.getByText('Marina (marina)')).to.exist
    expect(screen.getByLabelText('Permission for marina')).to.have.property(
      'value',
      'readOnly'
    )
    expect(
      screen.getByRole('button', { name: 'Add collaborator' })
    ).to.have.property('disabled', true)
    expect(screen.queryByText(/upgrade/i)).to.be.null
    expect(screen.queryByLabelText(/email/i)).to.be.null
    expect(fetchMock.callHistory.called('/project/project-id/sharing-link')).to
      .be.false
    expect(fetchMock.callHistory.called('/user/contacts')).to.be.false
    expect(fetchMock.callHistory.called('/project/project-id/invite')).to.be
      .false
  })
  it('searches active usernames and grants access directly with no invitation', async function () {
    fetchMock.get('/underleaf/users/search?username=ma', {
      users: [{ id: 'other-id', username: 'maria', displayName: 'Maria' }],
    })
    fetchMock.get('/underleaf/users/search?username=maria', {
      users: [{ id: 'other-id', username: 'maria', displayName: 'Maria' }],
    })
    fetchMock.put('/project/project-id/users/by-username', {
      member: {
        ...member,
        _id: 'other-id',
        username: 'maria',
        displayName: 'Maria',
        privileges: 'readAndWrite',
      },
    })
    renderModal()
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'ma' },
    })
    await userEvent.click(
      await screen.findByRole('button', { name: 'Maria (maria)' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Add collaborator' })
    )
    await screen.findByText('maria now has access.')
    expect(
      fetchMock.callHistory.called('/project/project-id/users/by-username', {
        body: { username: 'maria', permission: 'editor' },
      })
    ).to.be.true
    expect(screen.getByLabelText('Permission for maria')).to.exist
  })
  it('reports no matching local users', async function () {
    fetchMock.get('/underleaf/users/search?username=unknown', { users: [] })
    renderModal()
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'unknown' },
    })
    await screen.findByText(/No matching users available/)
  })
  it('shows a missing account error from a direct grant', async function () {
    fetchMock.get('/underleaf/users/search?username=unknown', { users: [] })
    fetchMock.put('/project/project-id/users/by-username', {
      status: 404,
      body: { message: 'User not found' },
    })
    renderModal()
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'unknown' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Add collaborator' })
    )
    await screen.findByText('User not found')
  })
  it('changes a member to editor by username', async function () {
    fetchMock.put('/project/project-id/users/by-username', {
      member: { ...member, privileges: 'readAndWrite' },
    })
    renderModal()
    fireEvent.change(screen.getByLabelText('Permission for marina'), {
      target: { value: 'readAndWrite' },
    })
    await screen.findByText('Access updated for marina.')
    expect(
      fetchMock.callHistory.called('/project/project-id/users/by-username', {
        body: { username: 'marina', permission: 'editor' },
      })
    ).to.be.true
  })
  it('confirms removal before revoking access by username', async function () {
    fetchMock.delete('/project/project-id/users/by-username/marina', 204)
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Remove marina' }))
    expect(
      fetchMock.callHistory.called(
        '/project/project-id/users/by-username/marina'
      )
    ).to.be.false
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm removal' })
    )
    await screen.findByText('marina no longer has access.')
    expect(screen.queryByLabelText('Permission for marina')).to.be.null
  })
  it('allows cancelling removal without a request', async function () {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Remove marina' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Remove marina' })).to.exist
    expect(
      fetchMock.callHistory.called(
        '/project/project-id/users/by-username/marina'
      )
    ).to.be.false
  })
  it('provides ownership transfer with the username confirmation', async function () {
    renderModal()
    await userEvent.click(
      screen.getByRole('button', { name: 'Make marina owner' })
    )
    expect(await screen.findByRole('heading', { name: 'Change project owner' }))
      .to.exist
    expect(screen.getByRole('button', { name: 'Change owner' })).to.exist
    expect(
      fetchMock.callHistory.called('/project/project-id/transfer-ownership')
    ).to.be.false
  })
  it('keeps membership visible to a viewer without management controls', async function () {
    renderModal({ owner: false })
    expect(await screen.findByText('Marina (marina)')).to.exist
    expect(screen.queryByLabelText('Username')).to.be.null
    expect(screen.queryByLabelText('Permission for marina')).to.be.null
    expect(screen.queryByRole('button', { name: 'Remove marina' })).to.be.null
  })
  it('grants a pending edit request without email notification', async function () {
    const project = {
      ...baseProject,
      editAccessRequests: [
        {
          ...member,
          privilegeLevel: 'readAndWrite' as const,
          currentPrivilegeLevel: 'readOnly' as const,
          requestedAt: '',
        },
      ],
    }
    fetchMock.post('/project/project-id/access-requests/member-id/grant', 204)
    renderModal({ project })
    await userEvent.click(
      screen.getByRole('button', { name: 'Grant editor access' })
    )
    await screen.findByText('Access request accepted for marina.')
    expect(
      fetchMock.callHistory.called(
        '/project/project-id/access-requests/member-id/grant',
        {
          body: { privilegeLevel: 'readAndWrite', notify: false },
        }
      )
    ).to.be.true
    expect(screen.queryByRole('button', { name: 'Grant editor access' })).to.be
      .null
  })
  it('closes through the existing modal callback', async function () {
    const hide = renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => sinon.assert.calledOnce(hide))
  })
})
