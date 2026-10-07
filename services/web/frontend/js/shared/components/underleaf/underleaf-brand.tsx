import { useActiveOverallTheme } from "@/shared/hooks/use-active-overall-theme";

const UNDERLEAF_BRAND_ASSET_VERSION = "2026-10-07-brand-5";

export function UnderleafBrand({
  variant = "lockup",
  colorScheme = "theme",
}: {
  variant?: "mark" | "wordmark" | "lockup";
  colorScheme?: "theme" | "light" | "dark";
}) {
  const theme = useActiveOverallTheme();
  const suffix =
    colorScheme === "dark" || (colorScheme === "theme" && theme === "dark")
      ? "-dark"
      : "";

  return (
    <img
      className={`underleaf-brand underleaf-brand-${variant}`}
      src={`/underleaf-${variant}${suffix}.svg?v=${UNDERLEAF_BRAND_ASSET_VERSION}`}
      alt="Underleaf"
      width={variant === "mark" ? 40 : variant === "wordmark" ? 190 : 238}
      height={variant === "mark" ? 40 : 48}
    />
  );
}
