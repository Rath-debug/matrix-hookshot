const { defineConfig } = require('vite')
const preact = require('@preact/preset-vite')
const { resolve } = require('path')
const alias = require('@rollup/plugin-alias')

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [preact()],
  root: 'web',
  base: '',
  logLevel: 'warn',
  optimizeDeps: {
    exclude: [
      '@vector-im/compound-web',
      '@vector-im/compound-design-tokens'
    ],
  },
  build: {
    sourcemap: 'inline',
    outDir: '../public',
    rollupOptions: {
      input: {
        main: resolve('web', 'index.html'),
        oauth: resolve('web', 'oauth.html'),
      },
      external: (id) => id.startsWith('@'),
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
      if (warning.code === 'UNRESOLVED_IMPORT' &&
          (warning.source?.includes('@vector-im/') ||
           warning.importer?.includes('@vector-im/'))) {
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