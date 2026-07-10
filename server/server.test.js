import { startApplication, startServer } from './server.js';

describe('startServer', () => {
  it('starts the provided app on the configured port', () => {
    const server = { close: jest.fn() };
    const listen = jest.fn((_port, callback) => {
      callback();
      return server;
    });
    const logger = { log: jest.fn() };
    const processRef = { once: jest.fn() };

    expect(startServer({ app: { listen, locals: {} }, port: 4242, logger, processRef })).toBe(server);
    expect(listen).toHaveBeenCalledWith(4242, expect.any(Function));
    expect(logger.log).toHaveBeenCalledWith('Server listening on port: 4242');
    expect(processRef.once).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processRef.once).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('marks readiness false and closes the server on shutdown', () => {
    const close = jest.fn((callback) => callback());
    const server = { close };
    const app = {
      locals: { ready: true },
      listen: jest.fn((_port, callback) => {
        callback();
        return server;
      }),
    };
    const handlers = {};
    const processRef = {
      once: jest.fn((signal, handler) => {
        handlers[signal] = handler;
      }),
      exitCode: 0,
    };
    const logger = { log: jest.fn(), error: jest.fn() };

    startServer({
      app,
      port: 4242,
      logger,
      processRef,
      shutdownGraceMs: 1000,
    });
    handlers.SIGTERM('SIGTERM');

    expect(app.locals.ready).toBe(false);
    expect(close).toHaveBeenCalledWith(expect.any(Function));
    expect(logger.log).toHaveBeenCalledWith(
      'Received SIGTERM; shutting down gracefully.'
    );
  });
});

describe('startApplication', () => {
  it('validates configuration before constructing external clients', () => {
    const OpenAIClient = jest.fn();

    expect(() => startApplication({ env: {}, OpenAIClient })).toThrow(
      'OPENAI_API_KEY is required.'
    );
    expect(OpenAIClient).not.toHaveBeenCalled();
  });

  it('constructs OpenAI through injection without module cache mutation', () => {
    const server = { close: jest.fn() };
    const app = {
      listen: jest.fn((_port, callback) => {
        callback();
        return server;
      }),
    };
    const logger = { log: jest.fn() };
    const createAppFactory = jest.fn(() => app);
    const OpenAIClient = jest.fn(function MockOpenAI(config) {
      this.config = config;
      this.chat = {
        completions: {
          create: jest.fn(),
        },
      };
    });

    const result = startApplication({
      env: { OPENAI_API_KEY: 'test-key', PORT: '4545' },
      logger,
      OpenAIClient,
      createAppFactory,
    });

    expect(result).toBe(server);
    expect(OpenAIClient).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(createAppFactory).toHaveBeenCalledWith({
      generateDatasetPlan: expect.any(Function),
      populateDatabase: expect.any(Function),
      logger,
      security: expect.objectContaining({
        allowedOrigins: expect.any(Array),
        jsonBodyLimit: expect.any(String),
      }),
    });
  });

  it('starts demo mode without constructing OpenAI and disables execution', () => {
    const server = { close: jest.fn() };
    const app = { listen: jest.fn((_port, callback) => { callback(); return server; }) };
    const OpenAIClient = jest.fn();
    const createAppFactory = jest.fn(() => app);

    startApplication({
      env: { DEMO_MODE: 'true', PORT: '4545' },
      OpenAIClient,
      createAppFactory,
    });

    expect(OpenAIClient).not.toHaveBeenCalled();
    expect(createAppFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        populateDatabase: expect.any(Function),
        security: expect.objectContaining({ demoMode: true }),
      })
    );
  });
});
