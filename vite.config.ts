import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const modulePath = id.replace(/\\/g, '/');
            if (/\/node_modules\/(recharts)\//.test(modulePath)) return 'charts-recharts';
            if (/\/node_modules\/(d3-[^/]+|victory-vendor)\//.test(modulePath)) return 'charts-data';
            if (/\/node_modules\/(react|react-dom|react-is|scheduler)\//.test(modulePath)) return 'vendor-react';
            if (/\/node_modules\/lucide-react\//.test(modulePath)) return 'vendor-icons';
          },
        },
      },
    },
  };
});
