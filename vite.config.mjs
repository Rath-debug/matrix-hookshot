import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

// Custom plugin to rewrite compound-design-tokens imports in node_modules
const rewriteCompoundImports = () => {
  return {
    name: 'rewrite-compound-imports',
    async resolveId(id, importer) {
      // Handle compound-design-tokens asset imports
      if (id.startsWith('@vector-im/compound-design-tokens/assets')) {
        // Return as external - don't try to resolve
        return { id, external: 'relative' }
      }
      // Return null to let other plugins handle it
      return null
// https://vitejs.dev/config/
export default defineConfig({
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