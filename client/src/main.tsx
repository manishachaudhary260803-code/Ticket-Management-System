import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
