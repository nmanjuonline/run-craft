/**
 * Zero-Dependency Modular Edge Router
 * Pure Web Standards (Request / Response / Headers)
 * Conforms to edge-app-architecture
 */

import type { Env } from '../types.js';

export type RouteHandler = (
  request: Request,
  env: Env,
  params: Record<string, string>,
  url: URL
) => Promise<Response> | Response;

interface RouteDefinition {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: RouteDefinition[] = [];

  private add(method: string, path: string, handler: RouteHandler) {
    const paramNames: string[] = [];
    const regexPath = path
      .replace(/\/+$/, '')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    const pattern = new RegExp(`^${regexPath || '/'}$`);
    this.routes.push({ method: method.toUpperCase(), pattern, paramNames, handler });
  }

  get(path: string, handler: RouteHandler) {
    this.add('GET', path, handler);
  }

  post(path: string, handler: RouteHandler) {
    this.add('POST', path, handler);
  }

  put(path: string, handler: RouteHandler) {
    this.add('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler) {
    this.add('DELETE', path, handler);
  }

  options(path: string, handler: RouteHandler) {
    this.add('OPTIONS', path, handler);
  }

  mount(prefix: string, subRouter: Router) {
    const cleanPrefix = prefix.replace(/\/+$/, '');
    for (const route of subRouter.routes) {
      // Re-map pattern with prefix
      const source = route.pattern.source.replace(/^\^/, '').replace(/\$$/, '');
      const newPattern = new RegExp(`^${cleanPrefix}${source === '/' ? '' : source}$`);
      this.routes.push({
        method: route.method,
        pattern: newPattern,
        paramNames: route.paramNames,
        handler: route.handler,
      });
    }
  }

  async handle(request: Request, env: Env = {}): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // Global CORS Preflight handling
    if (method === 'OPTIONS') {
      return this.cors(new Response(null, { status: 204 }));
    }

    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') continue;
      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        try {
          const res = await route.handler(request, env, params, url);
          return this.cors(res);
        } catch (err: any) {
          return this.cors(
            Router.json({ error: err.message || 'Internal Edge Server Error' }, { status: 500 })
          );
        }
      }
    }

    return this.cors(Router.json({ error: 'Endpoint Not Found', path: pathname }, { status: 404 }));
  }

  private cors(res: Response): Response {
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  }

  static json(data: any, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(data), {
      ...init,
      headers,
    });
  }

  static redirect(url: string, status = 302): Response {
    return new Response(null, {
      status,
      headers: { Location: url },
    });
  }
}
