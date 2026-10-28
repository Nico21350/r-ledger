import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'

// Les données restent "fraîches" 5 minutes avant d'être rechargées en arrière-plan.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* reducedMotion="user" : animations coupées si l'ordinateur demande moins de mouvements. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
