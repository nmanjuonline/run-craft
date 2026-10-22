/**
 * Authentication Provider Abstractions
 * Supports Strava OAuth, API Key, and Open Dev access
 */

import type { Env } from '../types.js';

export interface AuthResult {
  authenticated: boolean;
  athleteId?: string;
  athleteName?: string;
  accessToken?: string;
  error?: string;
}

export interface AuthProvider {
  verify(request: Request, env: Env): Promise<AuthResult>;
}

export class StravaOAuthProvider implements AuthProvider {
  async verify(request: Request, _env: Env): Promise<AuthResult> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing or malformed Authorization header' };
    }
    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    if (!token) {
      return { authenticated: false, error: 'Empty access token' };
    }
    return {
      authenticated: true,
      accessToken: token,
    };
  }
}

export class OpenDevAuthProvider implements AuthProvider {
  async verify(_request: Request, _env: Env): Promise<AuthResult> {
    return {
      authenticated: true,
      athleteId: 'dev_runner',
      athleteName: 'Dev Runner',
    };
  }
}
