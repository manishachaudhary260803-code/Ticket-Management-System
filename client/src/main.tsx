import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: []
    },
  })
} else {
  console.log('VITE_SENTRY_DSN is not set — error reporting to Sentry is disabled')
}

// Redirect to /login on any 401 from the API (session expired / invalid).
// Auth-service endpoints (/api/auth/*) are excluded — they return 401 for
// wrong credentials and must not trigger a redirect.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/api/auth/')
    ) {
      window.location.replace('/login')
    }
    return Promise.reject(error)
  },
)

const queryClient = new QueryClient()

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="text-sm text-ink-muted">Something went wrong. Please refresh the page.</span>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
