import { appRouter } from '../../src/index';

interface EventContext {
  request: Request;
  env: any;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, any>;
}

export async function onRequest(context: EventContext): Promise<Response> {
  return appRouter.handle(context.request, context.env);
}
