export {}

declare global {
  interface Window {
    electronAPI?: {
      getLicenseInfo?: () => Promise<any>
      [key: string]: any
    }
  }
}
