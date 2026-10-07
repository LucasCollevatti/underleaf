import getMeta from "@/utils/meta";

type LoadingBrandedTypes = {
  loadProgress: number; // Percentage
  label?: string;
  hasError?: boolean;
};

export default function LoadingBranded({
  loadProgress,
  label,
  hasError = false,
}: LoadingBrandedTypes) {
  const isUnderleaf = getMeta("ol-ExposedSettings").underleaf;
  const progress = Number.isFinite(loadProgress)
    ? Math.max(0, Math.min(100, loadProgress))
    : 0;
  return (
    <>
      {isUnderleaf ? (
        <div className="underleaf-loading-brand">
          <svg
            className="underleaf-loading-mark"
            role="img"
            aria-label="Underleaf"
            viewBox="320 318 615 663"
          >
            <path
              className="underleaf-loading-mark-base"
              d="M326 327 H420 C500 327 550 385 550 452 V758 C550 805 578 842 622 846 C590 900 545 945 492 952 C395 930 326 840 326 730 Z"
            />
            <path
              className="underleaf-loading-mark-leaf"
              d="M929 323 V715 C929 860 805 975 625 975 C585 975 548 970 515 965 C575 945 612 905 645 848 C690 760 750 630 873 492 C770 572 690 690 603 838 V652 C603 505 735 425 929 323 Z"
            />
          </svg>
          <div className="underleaf-loading-wordmark" aria-hidden="true" />
          <div
            className="underleaf-loading-progress"
            role="progressbar"
            aria-label={label || "Underleaf"}
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
  );
}
