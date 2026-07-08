import prompt from '../prompt.js';

export const createQueryOpenai = ({ openai, systemPrompt = prompt }) => async (
  _req,
  res,
  next
) => {
  const { naturalLanguageQuery } = res.locals;
  if (!naturalLanguageQuery) {
    const error = {
      log: 'OpenAI query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occured before querying OpenAI' },
    };
    return next(error);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 1,
      n: 1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: naturalLanguageQuery },
      ],
    });
    if (completion.choices.length === 0) {
      const error = {
        log: 'OpenAI did not recieve a completion',
        status: 500,
        message: { err: 'An error occured while querying OpenAI' },
      };
      return next(error);
    }
    res.locals.aiQueryString = completion.choices[0].message.content;

    const unModifiedQuery =
      completion.choices.map((choice) => choice.message.content || '') ||
      undefined;
    // then pull out the sql code from the markdown formatting for each code block, and trim excess whitespace
    const SQLMarkdownMatch = unModifiedQuery
      .map((openaiResponseText) =>
        (openaiResponseText.match(/```sql([\s\S]*?)```/) || ['', ''])[1].trim()
      )
      .filter((sqlQuery) => sqlQuery.length > 0);

    // save the sql statement, or the whole response if the sql part couldn't be found
    res.locals.databaseQuery = SQLMarkdownMatch || [
      unModifiedQuery || 'no Query',
    ];
    return next();
  } catch (error) {
    return next({
      log: 'openaiController.queryOpenAi: ' + error,
      status: 500,
      message: {
        err: 'A server error occured while querying OpenAI',
      },
    });
  }
};
