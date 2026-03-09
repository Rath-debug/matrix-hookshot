import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  root: 'web',
  base: '',
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
    }
  },
  optimizeDeps: {
    include: ['@vector-im/compound-web', '@vector-im/compound-design-tokens'],
  },
  build: {
    sourcemap: 'inline',
    outDir: '../public',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        oauth: resolve(__dirname, 'oauth.html'),
      },
      // external: (id) => {
      //   // Mark compound-design-tokens icons as external since there are missing icons
      //   if (id.includes('@vector-im/compound-design-tokens/assets/')) {
      //     return true
      //   }
      //   return false
      // },
      onwarn: (warning, warn) => {
        // Suppress unresolved import warnings from compound-web
        if (warning.code === 'UNRESOLVED_IMPORT' &&
            warning.source?.includes('@vector-im/compound-web')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks: undefined,
      }
    },
    emptyOutDir: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  }
})
