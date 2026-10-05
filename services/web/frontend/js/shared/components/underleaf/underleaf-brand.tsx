import { useActiveOverallTheme } from '@/shared/hooks/use-active-overall-theme'

export function UnderleafBrand({
  variant = 'lockup',
}: {
  variant?: 'mark' | 'wordmark' | 'lockup'
}) {
  const theme = useActiveOverallTheme()
  const suffix = theme === 'dark' ? '-dark' : ''

  return (
    <img
      className={`underleaf-brand underleaf-brand-${variant}`}
      src={`/underleaf-${variant}${suffix}.svg`}
      alt="Underleaf"
      width={variant === 'mark' ? 40 : variant === 'wordmark' ? 190 : 238}
      height={variant === 'mark' ? 40 : 48}
    />
  )
}
