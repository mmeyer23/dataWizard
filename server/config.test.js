import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('loads validated startup configuration', () => {
    expect(
      loadConfig({ OPENAI_API_KEY: 'test-key', PORT: '4242' })
    ).toEqual({
      openAiApiKey: 'test-key',
      port: 4242,
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
});
