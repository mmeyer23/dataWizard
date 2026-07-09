import { startApplication, startServer } from './server.js';

describe('startServer', () => {
  it('starts the provided app on the configured port', () => {
    const server = { close: jest.fn() };
    const listen = jest.fn((_port, callback) => {
      callback();
      return server;
    });
    const logger = { log: jest.fn() };

    expect(startServer({ app: { listen }, port: 4242, logger })).toBe(server);
    expect(listen).toHaveBeenCalledWith(4242, expect.any(Function));
    expect(logger.log).toHaveBeenCalledWith('Server listening on port: 4242');
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
    });
  });
});
