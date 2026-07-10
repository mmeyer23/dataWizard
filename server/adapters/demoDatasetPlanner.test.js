import { createDemoDatasetPlanner } from './demoDatasetPlanner.js';

describe('demo dataset planner', () => {
  it('returns deterministic, labeled data without external calls', async () => {
    const planner = createDemoDatasetPlanner();

    const first = await planner.generate('Create any dataset');
    const second = await planner.generate('A different request');

    expect(first).toEqual(second);
    expect(first.model).toBe('demo-provider');
    expect(first.warnings).toContain('Demo mode is active; execution is disabled.');
    expect(first.sql).toContain('CREATE SCHEMA IF NOT EXISTS');
  });
});
