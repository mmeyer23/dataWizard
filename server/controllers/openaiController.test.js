import { createQueryOpenai } from './openaiController.js';

const createResponse = () => ({ locals: { naturalLanguageQuery: 'test query' } });

describe('createQueryOpenai', () => {
  it('uses the injected client and prompt', async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: '```sql\nSELECT * FROM users;\n```',
          },
        },
      ],
    });
    const queryOpenai = createQueryOpenai({
      openai: { chat: { completions: { create } } },
      systemPrompt: 'Test system prompt',
    });
    const res = createResponse();
    const next = jest.fn();

    await queryOpenai({}, res, next);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'Test system prompt' },
          { role: 'user', content: 'test query' },
        ],
      })
    );
    expect(res.locals.databaseQuery).toEqual(['SELECT * FROM users;']);
    expect(next).toHaveBeenCalledWith();
  });

  it('reports a missing query without calling the client', async () => {
    const create = jest.fn();
    const queryOpenai = createQueryOpenai({
      openai: { chat: { completions: { create } } },
    });
    const next = jest.fn();

    await queryOpenai({}, { locals: {} }, next);

    expect(create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 })
    );
  });

  it('forwards provider failures through Express error handling', async () => {
    const create = jest.fn().mockRejectedValue(new Error('Provider failure'));
    const queryOpenai = createQueryOpenai({
      openai: { chat: { completions: { create } } },
    });
    const next = jest.fn();

    await queryOpenai({}, createResponse(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        message: { err: 'A server error occured while querying OpenAI' },
      })
    );
  });

  it('rejects a response with no choices', async () => {
    const create = jest.fn().mockResolvedValue({ choices: [] });
    const queryOpenai = createQueryOpenai({
      openai: { chat: { completions: { create } } },
    });
    const next = jest.fn();

    await queryOpenai({}, createResponse(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 })
    );
  });
});
