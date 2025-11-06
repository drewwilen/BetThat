import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite plugin to suppress WebSocket proxy errors
const suppressWebSocketErrors = () => {
  return {
    name: 'suppress-websocket-errors',
    configureServer(server: any) {
      // Intercept and suppress EPIPE/ECONNRESET/socket ended errors
      const originalError = server.ws.on.bind(server.ws)
      const originalLog = console.error
      
      // Suppress console errors for EPIPE/ECONNRESET/socket ended
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || ''
        if (message.includes('EPIPE') || 
            message.includes('ECONNRESET') || 
            message.includes('ws proxy socket error') ||
            message.includes('write EPIPE') ||
            message.includes('read ECONNRESET') ||
            message.includes('socket has been ended')) {
          return // Silently ignore
        }
        originalLog.apply(console, args)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    suppressWebSocketErrors(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req: any, _res: any) => {
            // Suppress EPIPE, ECONNRESET, ECONNREFUSED, and socket ended errors
            // These are common when WebSocket connections close during hot-reload or normal disconnections
            if (err.code === 'EPIPE' || 
                err.code === 'ECONNRESET' || 
                err.code === 'ECONNREFUSED' ||
                err.message?.includes('socket has been ended')) {
              // Silently ignore - these are harmless development-only errors
              return;
            }
            // Only log actual errors
            console.error('WebSocket proxy error:', err);
          });
          // Also suppress proxy errors on the WebSocket upgrade
          proxy.on('proxyReqWs', (_proxyReq: any, _req: any, _socket: any) => {
            _socket.on('error', (err: any) => {
              if (err.code === 'EPIPE' || 
                  err.code === 'ECONNRESET' || 
                  err.message?.includes('socket has been ended')) {
                return; // Suppress
              }
            });
          });
          // Handle socket end gracefully
          proxy.on('proxyReq', (_proxyReq: any, _req: any, _res: any) => {
            _req.on('error', (err: any) => {
              if (err.message?.includes('socket has been ended')) {
                return; // Suppress
              }
            });
          });
        },
      },
    },
  },
})

