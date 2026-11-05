import type { FastifyRequest } from "fastify";

/**
 * Fastify's default request log, without the query string: it can hold signed email tokens
 * (`/unsubscribe?token=`) and OAuth codes, and logs are shipped to long-term storage.
 */
export function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    url: request.url.split("?", 1)[0],
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket.remotePort,
  };
}
