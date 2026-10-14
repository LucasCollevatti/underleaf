import { expect } from 'chai'
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { merge, cloneDeep } from 'lodash'
import {
  notificationDropboxDuplicateProjectNames,
  notificationGroupInviteDefault,
  notificationIPMatchedAffiliation,
  notificationsInstitution,
} from '../fixtures/notifications-data'
import Common from '../../../../../frontend/js/features/project-list/components/notifications/groups/common'
import Institution from '../../../../../frontend/js/features/project-list/components/notifications/groups/institution'
import { ProjectListProvider } from '../../../../../frontend/js/features/project-list/context/project-list-context'
import { SplitTestProvider } from '@/shared/context/split-test-context'
import {
  Notification,
  Institution as InstitutionType,
} from '../../../../../types/project/dashboard/notification'
import { DeepPartial } from '../../../../../types/utils'
import { Project } from '../../../../../types/project/dashboard/api'
import GroupsAndEnterpriseBanner from '../../../../../frontend/js/features/project-list/components/notifications/groups-and-enterprise-banner'
import GroupSsoSetupSuccess from '../../../../../frontend/js/features/project-list/components/notifications/groups/group-sso-setup-success'
import localStorage from '@/infrastructure/local-storage'
import getMeta from '@/utils/meta'

const renderWithinProjectListProvider = (
  Component: React.ComponentType<React.PropsWithChildren>
) => {
  render(<Component />, {
    wrapper: ({ children }) => (
      <ProjectListProvider>
        <SplitTestProvider>
          <ul className="list-unstyled">{children}</ul>
        </SplitTestProvider>
      </ProjectListProvider>
    ),
  })
}

describe('<UserNotifications />', function () {
  const exposedSettings = {
    samlInitPath: '/fakeSaml/',
    appName: 'Overleaf',
  }

  beforeEach(function () {
    fetchMock.removeRoutes().clearHistory()

    // at least one project is required to show some notifications
    const projects = [{}] as Project[]
    fetchMock.post(/\/api\/project/, {
      status: 200,
      body: {
        projects,
        totalSize: projects.length,
      },
    })
  })

  afterEach(function () {
    fetchMock.removeRoutes().clearHistory()
  })

  describe('<Common>', function () {
    beforeEach(function () {
      window.metaAttributesCache.set('ol-user', {})
      Object.assign(getMeta('ol-ExposedSettings'), exposedSettings)
    })

    afterEach(function () {
      fetchMock.removeRoutes().clearHistory()
    })



    it('shows WFH2020', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        templateKey: 'wfh_2020_upgrade_offer',
      }
      window.metaAttributesCache.set('ol-notifications', [
        merge(reconfiguredNotification),
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/your free WFH2020 upgrade came to an end on/i)

      const viewLink = screen.getByRole('link', { name: /view/i })
      expect(viewLink.getAttribute('href')).to.equal(
        'https://www.overleaf.com/events/wfh2020'
      )
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows IP matched affiliation with SSO enabled', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        templateKey: 'notification_ip_matched_affiliation',
        messageOpts: { ssoEnabled: true },
      }
      window.metaAttributesCache.set('ol-notifications', [
        merge(
          cloneDeep(notificationIPMatchedAffiliation),
          reconfiguredNotification
        ),
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/it looks like you’re at/i)
      screen.getByText(/you can now log in through your institution/i)
      screen.getByText(
        /link an institutional email address to your account to get started/i
      )

      const findOutMore = screen.getByRole('link', { name: /find out more/i })
      expect(findOutMore.getAttribute('href')).to.equal(
        'https://docs.overleaf.com/accounts-and-security/email-address-and-login-options/logging-in-with-institutional-sso'
      )
      const linkAccount = screen.getByRole('link', { name: /link account/i })
      expect(linkAccount.getAttribute('href')).to.equal(
        `${exposedSettings.samlInitPath}?university_id=${notificationIPMatchedAffiliation.messageOpts.institutionId}&auto=/project`
      )
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows IP matched affiliation with SSO disabled', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        templateKey: 'notification_ip_matched_affiliation',
        messageOpts: { ssoEnabled: false },
      }
      window.metaAttributesCache.set('ol-notifications', [
        merge(
          cloneDeep(notificationIPMatchedAffiliation),
          reconfiguredNotification
        ),
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/it looks like you’re at/i)
      screen.getByText(/did you know that/i)
      screen.getByText(
        /add your university email address to see if you qualify/i
      )

      const addAffiliation = screen.getByRole('link', {
        name: /add affiliation/i,
      })
      expect(addAffiliation.getAttribute('href')).to.equal(`/user/settings`)
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })


    it('shows dropbox duplicate project names warning', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        templateKey: 'notification_dropbox_duplicate_project_names',
      }
      window.metaAttributesCache.set('ol-notifications', [
        merge(
          cloneDeep(notificationDropboxDuplicateProjectNames),
          reconfiguredNotification
        ),
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/you have more than one project called/i)
      screen.getByText(/make your project names unique/i)

      const learnMore = screen.getByRole('link', { name: /learn more/i })
      expect(learnMore.getAttribute('href')).to.equal(
        'https://docs.overleaf.com/integrations-and-add-ons/dropbox'
      )
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows dropbox unlinked tue to lapsed reconfirmation', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        templateKey:
          'notification_dropbox_unlinked_due_to_lapsed_reconfirmation',
      }
      window.metaAttributesCache.set('ol-notifications', [
        merge(
          cloneDeep(notificationDropboxDuplicateProjectNames),
          reconfiguredNotification
        ),
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/your Dropbox account has been unlinked/i)
      screen.getByText(
        /confirm you are still at the institution and on their license, or upgrade your account in order to relink your dropbox account/i
      )

      const learnMore = screen.getByRole('link', { name: /learn more/i })
      expect(learnMore.getAttribute('href')).to.equal(
        'https://docs.overleaf.com/accounts-and-security/email-address-and-login-options/logging-in-with-institutional-sso/institutional-email-reconfirmation'
      )
      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows non specific notification', async function () {
      const reconfiguredNotification: DeepPartial<Notification> = {
        _id: 1,
        html: 'unspecific message',
      }
      window.metaAttributesCache.set('ol-notifications', [
        reconfiguredNotification,
      ])

      renderWithinProjectListProvider(Common)
      await fetchMock.callHistory.flush(true)
      fetchMock.delete(`/notifications/${reconfiguredNotification._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(reconfiguredNotification.html!)

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    describe('<GroupInvitation />', function () {
      describe('without existing personal subscription', function () {
        it('shows group invitation notification for user without personal subscription', async function () {
          const notificationGroupInvite: DeepPartial<Notification> = {
            _id: 1,
            templateKey: 'notification_group_invitation',
          }

          window.metaAttributesCache.set('ol-notifications', [
            merge(
              cloneDeep(notificationGroupInviteDefault),
              notificationGroupInvite
            ),
          ])

          renderWithinProjectListProvider(Common)
          await fetchMock.callHistory.flush(true)
          fetchMock.delete(`/notifications/${notificationGroupInvite._id}`, 200)
          screen.getByRole('alert')
          screen.getByText('inviter@overleaf.com')
          screen.getByText(
            /has invited you to join a group subscription on Overleaf/
          )
          screen.getByRole('button', { name: 'Join now' })
          screen.getByRole('button', { name: /close/i })
        })

        describe('with existing personal subscription', function () {
          it('shows group invitation notification for user with personal subscription', async function () {
            const notificationGroupInvite: DeepPartial<Notification> = {
              _id: 1,
              templateKey: 'notification_group_invitation',
            }

            window.metaAttributesCache.set('ol-notifications', [
              merge(
                cloneDeep(notificationGroupInviteDefault),
                notificationGroupInvite
              ),
            ])
            window.metaAttributesCache.set(
              'ol-hasIndividualPaidSubscription',
              true
            )

            renderWithinProjectListProvider(Common)
            await fetchMock.callHistory.flush(true)
            fetchMock.delete(
              `/notifications/${notificationGroupInvite._id}`,
              200
            )

            screen.getByRole('alert')
            screen.getByText('inviter@overleaf.com')
            screen.getByText(/has invited you to join a group subscription on Overleaf/)
            screen.getByRole('button', { name: 'Not now' })
            screen.getByRole('button', { name: 'Cancel my subscription' })
          })
        })
      })
    })
  })

  describe('<Institution>', function () {
    beforeEach(function () {
      Object.assign(getMeta('ol-ExposedSettings'), exposedSettings)
      fetchMock.removeRoutes().clearHistory()
    })

    afterEach(function () {
      fetchMock.removeRoutes().clearHistory()
    })

    it('shows sso available', function () {
      const institution: DeepPartial<InstitutionType> = {
        templateKey: 'notification_institution_sso_available',
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)

      screen.getByRole('alert')
      screen.getByText(/you can now link/i)
      screen.getByText(/doing this will allow you to log in/i)

      const learnMore = screen.getByRole('link', { name: /learn more/i })
      expect(learnMore.getAttribute('href')).to.equal(
        'https://docs.overleaf.com/accounts-and-security/email-address-and-login-options/logging-in-with-institutional-sso'
      )

      const action = screen.getByRole('link', { name: /link account/i })
      expect(action.getAttribute('href')).to.equal(
        `${exposedSettings.samlInitPath}?university_id=${notificationsInstitution.institutionId}&auto=/project&email=${notificationsInstitution.email}`
      )
    })

    it('shows sso linked', function () {
      const institution: DeepPartial<InstitutionType> = {
        _id: 1,
        templateKey: 'notification_institution_sso_linked',
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)
      fetchMock.delete(`/notifications/${institution._id}`, 200)

      const notificationEl = screen.getByRole('alert')
      expect(notificationEl.textContent).to.match(
        new RegExp(
          `your Overleaf account on ${notificationsInstitution.email} ` +
            `has been linked to your ${notificationsInstitution.institutionName} ` +
            `institutional account.`,
          'i'
        )
      )

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows sso linked to group with domain capture enabled', function () {
      const institution: DeepPartial<InstitutionType> = {
        _id: 1,
        templateKey: 'notification_group_sso_linked',
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)
      fetchMock.delete(`/notifications/${institution._id}`, 200)

      const notificationEl = screen.getByRole('alert')
      expect(notificationEl.textContent).to.match(
        new RegExp(
          `your Overleaf account on ${notificationsInstitution.email} ` +
            `has been linked to your ${notificationsInstitution.institutionName} ` +
            `account.`,
          'i'
        )
      )

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows sso non canonical', function () {
      const institution: DeepPartial<InstitutionType> = {
        _id: 1,
        templateKey: 'notification_institution_sso_non_canonical',
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)
      fetchMock.delete(`/notifications/${institution._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/you’ve tried to log in with/i)
      screen.getByText(
        /in order to match your institutional metadata, your account is associated with/i
      )

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows sso already registered', function () {
      const institution: DeepPartial<InstitutionType> = {
        _id: 1,
        templateKey: 'notification_institution_sso_already_registered',
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)
      fetchMock.delete(`/notifications/${institution._id}`, 200)

      screen.getByRole('alert')
      screen.getByText(/which is already registered with/i)

      const action = screen.getByRole('link', { name: /find out more/i })
      expect(action.getAttribute('href')).to.equal(
        'https://docs.overleaf.com/accounts-and-security/email-address-and-login-options/logging-in-with-institutional-sso'
      )

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(fetchMock.callHistory.called()).to.be.true
      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows sso error', function () {
      const institution: DeepPartial<InstitutionType> = {
        templateKey: 'notification_institution_sso_error',
        error: {
          message: 'fake message',
          tryAgain: true,
        },
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)

      screen.getByRole('alert')
      screen.getByText(/something went wrong/i)
      screen.getByText(institution.error!.message!)
      screen.getByText(/please try again/i)

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(screen.queryByRole('alert')).to.be.null
    })

    it('shows reconfirmation unable-to-find-user error content', function () {
      const institution: DeepPartial<InstitutionType> = {
        templateKey: 'notification_institution_sso_error',
        error: {
          name: 'SAMLCommonsReconfirmationUnableToFindUserError',
        },
      }
      window.metaAttributesCache.set('ol-notificationsInstitution', [
        { ...notificationsInstitution, ...institution },
      ])
      render(<Institution />)

      screen.getByRole('alert')
      screen.getByText(/unable to confirm your affiliation/i)

      const contactLink = screen.getByRole('link', { name: /contact us/i })
      expect(contactLink.getAttribute('href')).to.equal('/contact')
      expect(contactLink.getAttribute('target')).to.equal('_blank')

      const closeBtn = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeBtn)

      expect(screen.queryByRole('alert')).to.be.null
    })
  })

  describe('<GroupsAndEnterpriseBanner />', function () {
    beforeEach(function () {
      localStorage.clear()
      fetchMock.removeRoutes().clearHistory()

      // at least one project is required to show some notifications
      const projects = [{}] as Project[]
      fetchMock.post(/\/api\/project/, {
        status: 200,
        body: {
          projects,
          totalSize: projects.length,
        },
      })

      window.metaAttributesCache.set(
        'ol-groupsAndEnterpriseBannerVariant',
        'on-premise'
      )

      window.metaAttributesCache.set('ol-inactiveTutorials', '[]')
    })

    afterEach(function () {
      fetchMock.removeRoutes().clearHistory()
    })

    it('does not show the banner for users that are in group or are affiliated', async function () {
      window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', false)

      renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
      await fetchMock.callHistory.flush(true)

      expect(screen.queryByRole('link', { name: 'Contact sales' })).to.be.null
    })

    it('shows the banner for users that have dismissed the previous banners', async function () {
      window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', true)
      localStorage.setItem('has_dismissed_groups_and_enterprise_banner', true)

      renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
      await fetchMock.callHistory.flush(true)

      await screen.findByRole('link', { name: 'Contact sales' })
    })

    it('does not show the banner for users that have dismissed the banner within the last 30 days and before server-side state', async function () {
      const dismissed = new Date()
      dismissed.setDate(dismissed.getDate() - 29) // 29 days
      window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', true)
      localStorage.setItem(
        'has_dismissed_groups_and_enterprise_banner',
        dismissed
      )

      renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
      await fetchMock.callHistory.flush(true)

      expect(screen.queryByRole('link', { name: 'Contact sales' })).to.be.null
    })

    it('shows the banner for users who have not dismissed the repeat appearance', async function () {
      window.metaAttributesCache.set(
        'ol-inactiveTutorials',
        '["groups-enterprise-banner"]'
      )
      window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', true)

      renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
      await fetchMock.callHistory.flush(true)

      expect(screen.queryByRole('link', { name: 'Contact sales' })).to.be.null
    })

    it('does not show the banner for users with both inactive tutorials', async function () {
      window.metaAttributesCache.set(
        'ol-inactiveTutorials',
        '["groups-enterprise-banner", "groups-enterprise-banner-repeat"]'
      )
      window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', true)

      renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
      await fetchMock.callHistory.flush(true)

      expect(screen.queryByRole('link', { name: 'Contact sales' })).to.be.null
    })

    describe('users that are not in group and are not affiliated', function () {
      beforeEach(function () {
        localStorage.clear()
        fetchMock.removeRoutes().clearHistory()

        // at least one project is required to show some notifications
        const projects = [{}] as Project[]
        fetchMock.post(/\/api\/project/, {
          status: 200,
          body: {
            projects,
            totalSize: projects.length,
          },
        })

        window.metaAttributesCache.set('ol-showGroupsAndEnterpriseBanner', true)
      })

      afterEach(function () {
        fetchMock.removeRoutes().clearHistory()
      })

      after(function () {
        localStorage.clear()
      })

      it('will show the correct text for the `on-premise` variant', async function () {
        window.metaAttributesCache.set(
          'ol-groupsAndEnterpriseBannerVariant',
          'on-premise'
        )

        renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
        await fetchMock.callHistory.flush(true)

        await screen.findByText(
          'Overleaf On-Premises: Does your company want to keep its data within its firewall? Overleaf offers Server Pro, an on-premises solution for companies. Get in touch to learn more.'
        )
        const link = screen.getByRole('link', { name: 'Contact sales' })

        expect(link.getAttribute('href')).to.equal(`/for/contact-sales-2`)
      })

      it('will show the correct text for the `FOMO` variant', async function () {
        window.metaAttributesCache.set(
          'ol-groupsAndEnterpriseBannerVariant',
          'FOMO'
        )

        renderWithinProjectListProvider(GroupsAndEnterpriseBanner)
        await fetchMock.callHistory.flush(true)

        await screen.findByText(
          'Why do Fortune 500 companies and top research institutions trust Overleaf to streamline their collaboration? Get in touch to learn more.'
        )
        const link = screen.getByRole('link', { name: 'Contact sales' })

        expect(link.getAttribute('href')).to.equal(`/for/contact-sales-4`)
      })
    })
  })

  describe('GroupSsoSetupSuccess', function () {
    it('shows group SSO linked notification', function () {
      window.metaAttributesCache.set('ol-groupSsoSetupSuccess', true)
      renderWithinProjectListProvider(GroupSsoSetupSuccess)
      screen.getByText('Success! Single sign-on is all set up for you.')
    })

    it('does not show group SSO linked notification', function () {
      window.metaAttributesCache.set('ol-groupSsoSetupSuccess', false)
      renderWithinProjectListProvider(GroupSsoSetupSuccess)
      expect(
        screen.queryByText('Success! Single sign-on is all set up for you.')
      ).to.be.null
    })

    it('shows group SSO linked notification when joining via domain capture', function () {
      const groupName = 'Group Name'
      window.metaAttributesCache.set('ol-groupSsoSetupSuccess', true)
      window.metaAttributesCache.set('ol-viaDomainCapture', true)
      window.metaAttributesCache.set('ol-joinedGroupName', groupName)
      renderWithinProjectListProvider(GroupSsoSetupSuccess)
      const alert = screen.getByRole('alert')
      expect(alert.textContent).to.contain(
        `You’ve joined the ${groupName} group. SSO is enabled.`
      )
    })
  })
})
