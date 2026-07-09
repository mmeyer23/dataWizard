import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '../../shared/apiContracts.js';
import { redactLogEvent, redactSensitiveText } from '../observability/redaction.js';

export const DEFAULT_SECURITY_OPTIONS = Object.freeze({
  allowedOrigins: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  jsonBodyLimit: '100kb',
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 60,
});

export const createSecurityHeaders = () => (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'"
  );
  next();
};

export const createRequestContext = ({
  requestIdFactory = randomUUID,
  now = Date.now,
} = {}) => (req, res, next) => {
  const requestId =
    typeof req.get('x-request-id') === 'string' && req.get('x-request-id').trim()
      ? req.get('x-request-id').trim().slice(0, 128)
      : requestIdFactory();

  req.requestId = requestId;
  req.startedAt = now();
  res.setHeader('X-Request-Id', requestId);
  next();
};

export const createStructuredLogger = ({ logger = console, now = Date.now } = {}) =>
  (req, res, next) => {
    res.on('finish', () => {
      const event = redactLogEvent({
        event: 'http_request',
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.max(0, now() - (req.startedAt ?? now())),
      });

      logger.info?.(event);
    });

    next();
  };

export const createCorsOptions = (allowedOrigins = DEFAULT_SECURITY_OPTIONS.allowedOrigins) => ({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error('Origin is not allowed by CORS policy.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    error.safeMessage = 'Origin is not allowed.';
    callback(error);
  },
});

export const createRateLimiter = ({
  windowMs = DEFAULT_SECURITY_OPTIONS.rateLimitWindowMs,
  maxRequests = DEFAULT_SECURITY_OPTIONS.rateLimitMaxRequests,
  now = Date.now,
} = {}) => {
  const buckets = new Map();

  return (req, _res, next) => {
    const key = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const currentTime = now();
    const bucket = buckets.get(key);

    if (!bucket || currentTime >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return next({
        log: `rateLimit: ${key}`,
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: { err: 'Too many requests. Try again later.' },
      });
    }

    return next();
  };
};

export const createErrorLogger = ({ logger = console } = {}) => (err, req) => {
  logger.error?.(
    redactLogEvent({
      event: 'http_error',
      requestId: req.requestId,
      code: err.code ?? ERROR_CODES.internalServerError,
      status: err.status ?? 500,
      message: err.safeLog ?? err.log ?? err.message,
    })
  );
};

export const normalizeHttpError = (err) => {
  if (err?.type === 'entity.too.large') {
    return {
      status: 413,
      code: 'REQUEST_BODY_TOO_LARGE',
      message: { err: 'The request body is too large.' },
    };
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const safeMessage =
    err?.safeMessage ??
    (typeof err?.message?.err === 'string'
      ? err.message.err
      : typeof err?.message === 'string' && status < 500
        ? err.message
        : 'An unexpected error occurred.');

  return {
    status,
    code: err?.code ?? ERROR_CODES.internalServerError,
    message: { err: redactSensitiveText(safeMessage) },
    details: err?.details,
  };
};
