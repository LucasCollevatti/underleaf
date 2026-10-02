import getMeta from '@/utils/meta'

export function DsNavOverleafLogo() {
  const appName = getMeta('ol-ExposedSettings')?.appName ?? 'Underleaf'

  return (
    <div className="ds-nav-page-switcher-logo">
      <a href="/" aria-label={appName}>
        <img
          src="/underleaf-logo.png"
          alt="Underleaf"
          height="59"
          width="59"
        />
      </a>
    </div>
  )
}
