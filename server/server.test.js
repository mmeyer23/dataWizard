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
});
