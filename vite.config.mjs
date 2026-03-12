import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

// Plugin to handle compound design token asset imports
const compoundAssetsPlugin = {
  name: 'handle-compound-assets',
  resolveId(id) {
    // Treat compound asset imports as external virtual modules
    if (id.includes('@vector-im/compound-design-tokens/assets/')) {
      return { id, external: true, moduleSideEffects: false }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  root: 'web',
  base: '',
  logLevel: 'warn',
  build: {
    sourcemap: 'inline',
    outDir: '../public',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve('web', 'index.html'),
        oauth: resolve('web', 'oauth.html'),
      },
      external: (id) => {
        // These are static asset imports that don't resolve to real modules
        if (id.includes('@vector-im/compound-design-tokens/assets/')) {
          return true
        }
        return false
      },
      plugins: [
        compoundAssetsPlugin,
        alias({
          entries: [
            { find: 'react', replacement: 'preact/compat' },
            { find: 'react-dom/test-utils', replacement: 'preact/test-utils' },
            { find: 'react-dom', replacement: 'preact/compat' },
            { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' }
          ]
        })
      ]
    },
    emptyOutDir: true,
    onwarn: (warning, warn) => {
      // Suppress warnings for compound asset imports
      if (warning.code === 'UNRESOLVED_IMPORT') {
        const source = warning.source || warning.id || ''
        if (source.includes('@vector-im/compound-design-tokens/assets/')) {
          return // These are handled as external virtual modules
        }
      }
      warn(warning)
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  }
})