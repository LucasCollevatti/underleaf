import getMeta from '@/utils/meta'

type LoadingBrandedTypes = {
  loadProgress: number // Percentage
  label?: string
  hasError?: boolean
}

export default function LoadingBranded({
  loadProgress,
  label,
  hasError = false,
}: LoadingBrandedTypes) {
  const isUnderleaf = getMeta('ol-ExposedSettings').underleaf
  const progress = Number.isFinite(loadProgress)
    ? Math.max(0, Math.min(100, loadProgress))
    : 0
  return (
    <>
      {isUnderleaf ? (
        <div className="underleaf-loading-brand">
          <div
            className="underleaf-loading-mark"
            role="img"
            aria-label="Underleaf"
          />
          <div className="underleaf-loading-wordmark" aria-hidden="true" />
          <div
            className="underleaf-loading-progress"
            role="progressbar"
            aria-label={label || 'Underleaf'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="loading-screen-brand-container">
          <div
            className="loading-screen-brand"
            style={{ height: `${progress}%` }}
          />
        </div>
      )}

      {!hasError && (
        <div className="h3 loading-screen-label" aria-live="polite">
          {label}
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
        </div>
      )}
    </>
  )
}
