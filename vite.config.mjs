import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

// Plugin to handle compound design token asset imports
const compoundAssetsPlugin = {
  name: 'resolve-compound-assets',
  resolveId(id) {
    // Intercept compound design token asset imports
    if (id.includes('@vector-im/compound-design-tokens/assets/')) {
      // Replace with virtual module
      return '\0compound-asset:' + id
    }
  },
  load(id) {
    if (id.startsWith('\0compound-asset:')) {
      // Return empty export - CSS is already loaded via the main import
      return 'export default undefined; export const icon = undefined;'
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact(), compoundAssetsPlugin],
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
      // Ignore unresolved imports for compound assets (handled by virtual modules)
      if (warning.code === 'UNRESOLVED_IMPORT' &&
          (warning.source?.includes('@vector-im/compound-design-tokens/assets/') ||
           warning.id?.includes('@vector-im/compound-design-tokens/assets/'))) {
        return
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