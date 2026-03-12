import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

// Plugin to handle external compound asset imports
const compoundAssetsPlugin = {
  name: 'handle-compound-assets',
  resolveId(id) {
    if (id.includes('@vector-im/compound-design-tokens/assets/')) {
      // Return external module marker for these assets
      return { id, external: true }
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
    rollupOptions: {
      input: {
        main: resolve('web', 'index.html'),
        oauth: resolve('web', 'oauth.html'),
      },
      external: (id) => {
        // Externalize compound design token assets that are resolved at runtime
        if (id.includes('@vector-im/compound-design-tokens/assets/')) return true
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
      // Suppress warnings for externalized compound packages
      if (warning.code === 'UNRESOLVED_IMPORT') {
        if (warning.source?.includes('@vector-im/compound-design-tokens/assets/') ||
            warning.id?.includes('@vector-im/compound-design-tokens/assets/')) {
          return // Suppress - these are externalized and resolved at runtime
        }
      }
      warn(warning)
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