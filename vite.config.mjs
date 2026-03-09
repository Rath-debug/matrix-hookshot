import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Create __dirname for ESM (Vite standard)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [preact()],
  // 'web' is the root for the frontend source files
  root: resolve(__dirname, 'web'),
  base: '',
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
      // CRITICAL: Bridge to the root node_modules for icons/tokens
      '@vector-im/compound-design-tokens': resolve(__dirname, 'node_modules/@vector-im/compound-design-tokens'),
    }
  },
  optimizeDeps: {
    include: ['@vector-im/compound-web', '@vector-im/compound-design-tokens'],
  },
  build: {
    sourcemap: 'inline',
    // Moves finished build from /web/dist to the root /public folder
    outDir: resolve(__dirname, 'public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'web/index.html'),
        oauth: resolve(__dirname, 'web/oauth.html'),
      },
      external: (id) => {
        // Mark compound-design-tokens icons as external since some are missing
        if (id.includes('@vector-im/compound-design-tokens/assets/')) {
          return true
        }
        return false
      },
      onwarn: (warning, warn) => {
        if (warning.code === 'UNRESOLVED_IMPORT' &&
            warning.source?.includes('@vector-im/compound-web')) {
          return
        }
        warn(warning)
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  }
})