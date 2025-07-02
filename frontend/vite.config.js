import { defineConfig } from 'vite';

export default defineConfig({
  // No plugins needed for Monaco Editor
  build: {
    rollupOptions: {
      external: [
        '@tauri-apps/api',
        '@tauri-apps/api/shell'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      '@tauri-apps/api',
      '@tauri-apps/api/shell'
    ]
  },
  resolve: {
    conditions: ['tauri']
  }
}); 