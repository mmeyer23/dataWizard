import { redactLogEvent, redactSensitiveText } from './redaction.js';

describe('redaction', () => {
  it('redacts database URLs, password parameters, API keys, and bearer tokens', () => {
    const value =
      'postgres://user:secret@localhost/db?password=secret OPENAI_API_KEY=sk-secret Bearer abc.def';

    expect(redactSensitiveText(value)).not.toContain('secret');
    expect(redactSensitiveText(value)).toContain('postgres://[redacted]');
    expect(redactSensitiveText(value)).toContain('OPENAI_API_KEY=[redacted]');
    expect(redactSensitiveText(value)).toContain('Bearer [redacted]');
  });

  it('redacts string fields in structured log events', () => {
    expect(
      redactLogEvent({
        message: 'failed postgres://user:secret@localhost/db',
        status: 500,
      })
    ).toEqual({
      message: 'failed postgres://[redacted]',
      status: 500,
    });
  });
});
