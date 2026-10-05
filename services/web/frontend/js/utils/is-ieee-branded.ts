import getMeta from '@/utils/meta'

export function isIEEEBranded() {
  const brandVariation = getMeta('ol-brandVariation')
  const { ieeeBrandId, underleaf } = getMeta('ol-ExposedSettings')
  if (underleaf) return false

  return brandVariation?.brand_id === ieeeBrandId
}
