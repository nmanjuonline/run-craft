import { defineConfig } from 'vite';
import { appRouter } from './src/index';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/.vs/**', '**/.git/**', '**/dist/**', '**/*.vsidx'],
    },
  },
  plugins: [
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
                ENVIRONMENT: 'development' as const,
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
});
