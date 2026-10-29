import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Les grosses bibliothèques dans des fichiers à part : téléchargés en parallèle,
        // et gardés en cache par le navigateur quand seul le code de l'application change.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|@reduxjs|react-redux|redux|immer|reselect|es-toolkit|decimal\.js-light)[\\/]/ },
          ],
        },
      },
    },
  },
})
