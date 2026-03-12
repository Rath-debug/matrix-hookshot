import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

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
      // Suppress unresolved import warnings for compound packages
      if ((warning.code === 'UNRESOLVED_IMPORT' || warning.code === 'THIS_IS_UNDEFINED') &&
          (warning.source?.includes('@vector-im/') ||
           warning.importer?.includes('@vector-im/') ||
           warning.source?.includes('@vector-im/compound-design-tokens/assets/'))) {
        return
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