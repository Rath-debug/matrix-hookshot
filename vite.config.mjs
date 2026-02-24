import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  root: 'web',
  base: '',
  resolve: {
    alias: [
      // Alias missing icon variants to standard versions
      { find: /^@vector-im\/compound-design-tokens\/assets\/web\/icons\/error-solid$/, replacement: resolve('node_modules/@vector-im/compound-design-tokens/assets/web/icons/error.js') },
      { find: /^@vector-im\/compound-design-tokens\/assets\/web\/icons\/warning-solid$/, replacement: resolve('node_modules/@vector-im/compound-design-tokens/assets/web/icons/warning.js') },
    ]
  },
  optimizeDeps: {
    include: ['@vector-im/compound-web', '@vector-im/compound-design-tokens'],
  },
  build: {
    sourcemap: 'inline',
    outDir: '../public',
    rollupOptions: {
      input: {
        main: resolve('web', 'index.html'),
        oauth: resolve('web', 'oauth.html'),
      },
      external: (id) => {
        // Mark compound-design-tokens icons as external since there are missing icons
        if (id.includes('@vector-im/compound-design-tokens/assets/')) {
          return true
        }
        return false
      },
      onwarn: (warning, warn) => {
        // Suppress unresolved import warnings from compound-web
        if (warning.code === 'UNRESOLVED_IMPORT' &&
            warning.source?.includes('@vector-im/compound-web')) {
          return
        }
        warn(warning)
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
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  }
})
