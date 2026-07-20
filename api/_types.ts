/**
 * _types.ts — minimal request/response shapes for the Vercel-style handlers.
 *
 * Underscore-prefixed so Vercel does not expose this file as an endpoint.
 * Matches the Express-ish surface Vercel's Node runtime provides (and the
 * dev adapter in vite.config.ts replicates): `req.query`, `res.status().json()`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
}
