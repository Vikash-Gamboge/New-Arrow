import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function serveApkPlugin(): Plugin {
  const sendApk = (req: any, res: any, next: () => void) => {
    const url = req.url?.split('?')[0];
    if (
      url === '/arrow-master.apk' ||
      url === '/download/arrow-master.apk' ||
      url === '/download' ||
      url === '/api/download' ||
      url === '/app-debug.apk' ||
      url === '/public/arrow-master.apk'
    ) {
      const candidates = [
        path.resolve(__dirname, 'arrow-master.apk'),
        path.resolve(__dirname, 'public/arrow-master.apk'),
        path.resolve(__dirname, 'android/app/build/outputs/apk/debug/app-debug.apk'),
        '/tmp/arrow-master.apk',
      ];
      const apkPath = candidates.find((p) => fs.existsSync(p)) || '';

      if (apkPath) {
        const stat = fs.statSync(apkPath);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="arrow-master.apk"',
          'Content-Length': stat.size,
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length',
        });
        const readStream = fs.createReadStream(apkPath);
        readStream.pipe(res);
        return;
      }
    }
    next();
  };

  return {
    name: 'serve-apk-middleware',
    configureServer(server) {
      server.middlewares.use(sendApk);
    },
    configurePreviewServer(server) {
      server.middlewares.use(sendApk);
    },
    closeBundle() {
      if (process.env.SKIP_APK_DIST === '1') return;
      const rootApk = path.resolve(__dirname, 'arrow-master.apk');
      const distDir = path.resolve(__dirname, 'dist');
      if (fs.existsSync(rootApk) && fs.existsSync(distDir)) {
        fs.copyFileSync(rootApk, path.resolve(distDir, 'arrow-master.apk'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      serveApkPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Arrow Master: Puzzle Escape',
          short_name: 'Arrow Master',
          description: 'Untangle intricate labyrinth paths, escape the grid, and tap away arrows in this satisfying logic puzzle game.',
          theme_color: '#1e3a8a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/assets/aistudio/**', '**/*.apk', '**/download/**'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
