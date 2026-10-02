import getMeta from '@/utils/meta'

export function DsNavOverleafLogo() {
  const appName = getMeta('ol-ExposedSettings')?.appName ?? 'Underleaf'

  return (
    <div className="ds-nav-page-switcher-logo">
      <a href="/" aria-label={appName}>
        <img
          src="/underleaf-logo.svg"
          alt="Underleaf"
          height="59"
          width="130"
        />
      </a>
    </div>
  )
}
