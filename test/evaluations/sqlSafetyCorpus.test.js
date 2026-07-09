import { validateSql } from '../../server/sqlPolicy/validateSql.js';
import { sqlSafetyEvaluationCorpus } from './sqlSafetyCorpus.js';

describe('SQL safety evaluation corpus', () => {
  it('covers valid, ambiguous, malformed, injected, and unsafe prompts', () => {
    expect(
      new Set(sqlSafetyEvaluationCorpus.map((entry) => entry.category))
    ).toEqual(
      new Set(['valid', 'ambiguous', 'malformed', 'injected', 'unsafe'])
    );
  });

  it.each(sqlSafetyEvaluationCorpus)(
    '$layer evaluation rejects or approves $id',
    ({ sql, expectedOk, expectedFinding }) => {
      const result = validateSql(sql);

      expect(result.ok).toBe(expectedOk);
      if (expectedFinding) {
        expect(result.findings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: expectedFinding }),
          ])
        );
      }
    }
  );
});
