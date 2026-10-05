import React, { useState } from 'react'
import { sendMB } from '@/infrastructure/event-tracking'
import { useTranslation } from 'react-i18next'
import { Button, Container, Nav, Navbar } from 'react-bootstrap'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import AdminMenu from '@/shared/components/navbar/admin-menu'
import type { DefaultNavbarMetadata } from '@/shared/components/types/default-navbar-metadata'
import NavItemFromData from '@/shared/components/navbar/nav-item-from-data'
import LoggedInItems from '@/shared/components/navbar/logged-in-items'
import LoggedOutItems from '@/shared/components/navbar/logged-out-items'
import HeaderLogoOrTitle from '@/shared/components/navbar/header-logo-or-title'
import MaterialIcon from '@/shared/components/material-icon'
import { useContactUsModal } from '@/shared/hooks/use-contact-us-modal'
import { UserProvider } from '@/shared/context/user-context'
import { X } from '@phosphor-icons/react'
import type { CSSPropertiesWithVariables } from '../../../../../types/css-properties-with-variables'
import getMeta from '@/utils/meta'
import { UnderleafAppProviders } from '@/shared/components/underleaf/underleaf-app-shell'
import useThemedPage from '@/shared/hooks/use-themed-page'

function LegacyDefaultNavbar(
  props: DefaultNavbarMetadata & { overleafLogo?: string }
) {
  const {
    overleafLogo,
    customLogo,
    title,
    canDisplayAdminMenu,
    canDisplayAdminRedirect,
    canDisplayProjectUrlLookup,
    canDisplaySplitTestMenu,
    canDisplaySurveyMenu,
    canDisplayScriptLogMenu,
    enableUpgradeButton,
    suppressNavbarRight,
    suppressNavContentLinks,
    showCloseIcon = false,
    showSubscriptionLink,
    showSignUpLink,
    sessionUser,
    adminUrl,
    items,
  } = props
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  // The Contact us modal is rendered at this level rather than inside the nav
  // bar because otherwise the help wiki search results dropdown doesn't show up
  const { modal: contactUsModal, showModal: showContactUsModal } =
    useContactUsModal({
      autofillProjectUrl: false,
    })

  return (
    <>
      <Navbar
        className="navbar-default navbar-main"
        expand="lg"
        onToggle={expanded => setExpanded(expanded)}
        style={
          {
            '--navbar-brand-image-default-url': 'url("/underleaf-logo.png")',
            '--navbar-brand-image-redesign-url': 'url("/underleaf-logo.png")',
          } as CSSPropertiesWithVariables
        }
        aria-label={t('primary')}
      >
        <Container className="navbar-container" fluid>
          <div className="navbar-header">
            <HeaderLogoOrTitle
              title={title}
              overleafLogo={overleafLogo}
              customLogo={customLogo}
            />
            {enableUpgradeButton ? (
              <Button
                as="a"
                href="/user/subscription/plans"
                className="me-2 d-md-none"
                onClick={() => {
                  sendMB('upgrade-button-click', {
                    source: 'dashboard-top',
                    'project-dashboard-react': 'enabled',
                    'is-dashboard-sidebar-hidden': 'true',
                    'is-screen-width-less-than-768px': 'true',
                  })
                }}
              >
                {t('upgrade')}
              </Button>
            ) : null}
          </div>
          {suppressNavbarRight ? null : (
            <>
              <Navbar.Toggle
                aria-controls="navbar-main-collapse"
                aria-expanded="false"
                aria-label={t('primary')}
              >
                {showCloseIcon && expanded ? (
                  <X />
                ) : (
                  <MaterialIcon type="menu" />
                )}
              </Navbar.Toggle>
              <Navbar.Collapse
                id="navbar-main-collapse"
                className="justify-content-end"
              >
                <Nav as="ul" className="ms-auto" role="menubar">
                  {canDisplayAdminMenu ||
                  canDisplayAdminRedirect ||
                  canDisplaySplitTestMenu ? (
                    <AdminMenu
                      canDisplayAdminMenu={canDisplayAdminMenu}
                      canDisplayAdminRedirect={canDisplayAdminRedirect}
                      canDisplayProjectUrlLookup={canDisplayProjectUrlLookup}
                      canDisplaySplitTestMenu={canDisplaySplitTestMenu}
                      canDisplaySurveyMenu={canDisplaySurveyMenu}
                      canDisplayScriptLogMenu={canDisplayScriptLogMenu}
                      adminUrl={adminUrl}
                    />
                  ) : null}
                  {items.map((item, index) => {
                    const showNavItem =
                      (item.only_when_logged_in && sessionUser) ||
                      (item.only_when_logged_out && sessionUser) ||
                      (!item.only_when_logged_out &&
                        !item.only_when_logged_in &&
                        !item.only_content_pages) ||
                      (item.only_content_pages && !suppressNavContentLinks)

                    return showNavItem ? (
                      <NavItemFromData
                        item={item}
                        key={index}
                        showContactUsModal={showContactUsModal}
                      />
                    ) : null
                  })}
                  {sessionUser ? (
                    <LoggedInItems
                      sessionUser={sessionUser}
                      showSubscriptionLink={showSubscriptionLink}
                    />
                  ) : (
                    <LoggedOutItems showSignUpLink={showSignUpLink} />
                  )}
                </Nav>
              </Navbar.Collapse>
            </>
          )}
        </Container>
      </Navbar>
      <UserProvider>{contactUsModal}</UserProvider>
    </>
  )
}

function UnderleafNavbar({
  sessionUser,
  canDisplayAdminMenu,
  suppressNavbarRight,
}: DefaultNavbarMetadata) {
  const { t } = useTranslation()
  useThemedPage()
  return (
    <Navbar
      className="navbar-main underleaf-navbar"
      expand="lg"
      aria-label={t('primary')}
    >
      <Container fluid>
        <HeaderLogoOrTitle />
        {!suppressNavbarRight && (
          <>
            <Navbar.Toggle
              aria-controls="underleaf-navbar-links"
              aria-label={t('menu')}
            />
            <Navbar.Collapse
              id="underleaf-navbar-links"
              className="justify-content-end"
            >
              <Nav>
                {sessionUser ? (
                  <>
                    <Nav.Link href="/project">{t('projects')}</Nav.Link>
                    <Nav.Link href="/user/settings">
                      {t('account_settings')}
                    </Nav.Link>
                    {canDisplayAdminMenu && (
                      <>
                        <Nav.Link href="/admin">
                          {t('underleaf_administration')}
                        </Nav.Link>
                        <Nav.Link href="/admin/users">
                          {t('underleaf_users')}
                        </Nav.Link>
                        <Nav.Link href="/status">
                          {t('underleaf_system')}
                        </Nav.Link>
                      </>
                    )}
                    <Nav.Link href="/logout">{t('log_out')}</Nav.Link>
                  </>
                ) : (
                  <Nav.Link href="/login">{t('log_in')}</Nav.Link>
                )}
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  )
}

function DefaultNavbar(
  props: DefaultNavbarMetadata & { overleafLogo?: string }
) {
  return getMeta('ol-ExposedSettings').underleaf ? (
    <UnderleafAppProviders>
      <UnderleafNavbar {...props} />
    </UnderleafAppProviders>
  ) : (
    <LegacyDefaultNavbar {...props} />
  )
}

export const DefaultNavbarRoot = (props: DefaultNavbarMetadata) => {
  const { isReady } = useWaitForI18n()

  if (!isReady) {
    return null
  }

  return <DefaultNavbar {...props} />
}

export default DefaultNavbar
