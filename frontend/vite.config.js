import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true, // Expose on LAN for mobile testing
        proxy: {
            // Dev only: proxy /api/* to local backend
            // In production, VITE_API_URL points directly to Render
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
    },
})
