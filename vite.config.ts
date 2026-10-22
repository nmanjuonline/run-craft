import { defineConfig, Plugin } from 'vite';
import { execSync } from 'child_process';
import { appRouter } from './src/index';

function detectIsStage(mode: string): boolean {
  if (process.env.CF_PAGES_BRANCH === 'stage' || process.env.VITE_APP_ENV === 'stage') return true;
  if (process.env.CF_PAGES_BRANCH === 'master' || process.env.CF_PAGES_BRANCH === 'main' || process.env.VITE_APP_ENV === 'production') return false;
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    if (branch === 'stage') return true;
    if (branch === 'master' || branch === 'main') return false;
  } catch {}
  if (mode === 'stage') return true;
  return false;
}

function pwaManifestPlugin(isStage: boolean): Plugin {
  return {
    name: 'pwa-manifest-generator',
    transformIndexHtml(html) {
      if (isStage) {
        return html
          .replace(
            '<title>RunCraft — Workout Photo Overlay Studio</title>',
            '<title>RunCraft [Stage] — Workout Photo Overlay Studio</title>'
          )
          .replace(
            '<meta name="theme-color" content="#0b0f17" />',
            '<meta name="theme-color" content="#d97706" />'
          )
          .replace(/href="\/icon-192\.png"/g, 'href="/icon-192-stage.png"');
      }
      return html;
    },
    generateBundle() {
      const manifest = {
        name: isStage ? 'RunCraft [Stage]' : 'RunCraft',
        short_name: isStage ? 'RunCraft [Stage]' : 'RunCraft',
        description: isStage
          ? 'Create stunning workout photo overlays with Strava and Garmin metrics (Stage Environment).'
          : 'Create stunning workout photo overlays with Strava and Garmin metrics.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b0f17',
        theme_color: isStage ? '#d97706' : '#0b0f17',
        icons: [
          {
            src: isStage ? '/icon-192-stage.png' : '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: isStage ? '/icon-512-stage.png' : '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: isStage ? '/icon-maskable-192-stage.png' : '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: isStage ? '/icon-maskable-512-stage.png' : '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      };

      const manifestContent = JSON.stringify(manifest, null, 2);
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: manifestContent
      });
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: manifestContent
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const isStage = detectIsStage(mode);

  return {
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(isStage ? 'stage' : 'production'),
    },
    server: {
      port: 5173,
      host: true,
      watch: {
        ignored: ['**/.vs/**', '**/.git/**', '**/dist/**', '**/*.vsidx'],
      },
    },
    plugins: [
      pwaManifestPlugin(isStage),
      {
        name: 'edge-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              try {
                const url = `http://${req.headers.host || 'localhost:5173'}${req.url}`;
                const method = req.method || 'GET';

                let body: string | undefined = undefined;
                if (method !== 'GET' && method !== 'HEAD') {
                  body = await new Promise((resolve) => {
                    let data = '';
                    req.on('data', (chunk) => (data += chunk));
                    req.on('end', () => resolve(data));
                  });
                }

                const webReq = new Request(url, {
                  method,
                  headers: req.headers as any,
                  body,
                });

                const env = {
                  ENVIRONMENT: (isStage ? 'stage' : 'development') as any,
                  SITE_URL: 'http://localhost:5173',
                };

                const webRes = await appRouter.handle(webReq, env);
                res.statusCode = webRes.status;
                webRes.headers.forEach((val, key) => {
                  res.setHeader(key, val);
                });

                const resText = await webRes.text();
                res.end(resText);
                return;
              } catch (err: any) {
                console.error('Edge dev middleware error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
  };
});
