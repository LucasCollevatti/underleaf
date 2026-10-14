export type Segmentation = Record<string, unknown>

export function send(..._args: unknown[]) {}
export function sendOnce(..._args: unknown[]) {}
export function sendMB(_key: string, _segmentation?: Segmentation) {}
export function sendMBOnce(_key: string, _segmentation?: Segmentation) {}
export function sendMBSampled(
  _key: string,
  _segmentation?: Segmentation,
  _rate?: number
) {}
export function sendMBOncePerPageLoad(
  _key: string,
  _segmentation?: Segmentation
) {}
export const isSmallDevice = false
