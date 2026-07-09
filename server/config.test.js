import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('loads validated startup configuration', () => {
    expect(
      loadConfig({
        OPENAI_API_KEY: 'test-key',
        PORT: '4242',
        CORS_ALLOWED_ORIGINS: 'https://app.example, https://admin.example',
        JSON_BODY_LIMIT: '10kb',
        RATE_LIMIT_WINDOW_MS: '5000',
        RATE_LIMIT_MAX_REQUESTS: '10',
        SHUTDOWN_GRACE_MS: '2000',
      })
    ).toEqual({
      openAiApiKey: 'test-key',
      port: 4242,
      allowedOrigins: ['https://app.example', 'https://admin.example'],
      jsonBodyLimit: '10kb',
      rateLimitWindowMs: 5000,
      rateLimitMaxRequests: 10,
      shutdownGraceMs: 2000,
    });
  });

  it('uses the default port', () => {
    expect(loadConfig({ OPENAI_API_KEY: 'test-key' }).port).toBe(3000);
  });

  it('rejects a missing API key', () => {
    expect(() => loadConfig({})).toThrow('OPENAI_API_KEY is required.');
  });

  it.each(['0', '65536', 'not-a-number', '3.14'])(
    'rejects invalid port %s',
    (port) => {
      expect(() =>
        loadConfig({ OPENAI_API_KEY: 'test-key', PORT: port })
      ).toThrow('PORT must be an integer between 1 and 65535.');
    }
  );

  it.each(['0', '-1', '3.14', 'not-a-number'])(
    'rejects invalid positive integer security config %s',
    (value) => {
      expect(() =>
        loadConfig({
          OPENAI_API_KEY: 'test-key',
          RATE_LIMIT_MAX_REQUESTS: value,
        })
      ).toThrow('RATE_LIMIT_MAX_REQUESTS must be a positive integer.');
    }
  );
});
