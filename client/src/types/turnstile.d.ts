declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback?: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
      }) => string | number
      reset: (widgetId: string | number) => void
      remove: (widgetId: string | number) => void
    }
  }
}

export {}
