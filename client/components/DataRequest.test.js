/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataRequest from './DataRequest';

jest.mock('../../public/assets/dataWizardLogo.png', () => 'data-wizard-logo.png');

const validSql = `CREATE SCHEMA IF NOT EXISTS "test_data";
CREATE TABLE IF NOT EXISTS "test_data"."tests" ("name" TEXT NOT NULL);
INSERT INTO "test_data"."tests" ("name") VALUES ('Ada') RETURNING *;`;

const planResponse = {
  sql: validSql,
  warnings: ['Review generated names before executing.'],
  plan: {
    schemaName: 'test_data',
    tableName: 'tests',
    columns: [{ name: 'name', type: 'text', nullable: false }],
    rows: [['Ada']],
    assumptions: ['One row is enough for the preview.'],
    warnings: [],
    model: 'test-model',
    promptVersion: 'test-prompt',
  },
  validation: {
    ok: true,
    findings: [
      {
        severity: 'info',
        code: 'SQL_POLICY_APPROVED',
        message: 'Approved 1 table, 1 columns, and 1 rows.',
      },
    ],
    summary: {
      statementCount: 3,
      tableCount: 1,
      columnCount: 1,
      rowCount: 1,
      schemaName: 'test_data',
      tableName: 'tests',
    },
  },
};

const executionResponse = {
  sql: validSql,
  rows: [{ name: 'Ada' }],
  rowCount: 1,
  warnings: [],
  validation: planResponse.validation,
};

describe('DataRequest', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(planResponse),
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('updates state for URI and dataset description on user input', () => {
    render(<DataRequest />);

    const uriInput = screen.getByLabelText(/PostgreSQL connection URI/i);
    const queryInput = screen.getByLabelText(/Dataset description/i);

    fireEvent.change(uriInput, {
      target: { value: 'postgres://localhost/test' },
    });
    fireEvent.change(queryInput, {
      target: { value: 'Create one row' },
    });

    expect(uriInput.value).toBe('postgres://localhost/test');
    expect(queryInput.value).toBe('Create one row');
  });

  test('generate preview calls the generate-only endpoint and does not execute SQL', async () => {
    render(<DataRequest />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));

    expect(
      screen.getByRole('button', { name: /Generating preview/i })
    ).toBeDisabled();

    expect(await screen.findByText(/Schema: test_data/i)).toBeInTheDocument();
    expect(screen.getByText(/Table: tests/i)).toBeInTheDocument();
    expect(screen.getByText(/SQL_POLICY_APPROVED/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Generated SQL with syntax highlighting/i))
      .toHaveTextContent('CREATE SCHEMA');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/query/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postgreSqlUri: 'postgres://localhost/test',
        naturalLanguageQuery: 'Create one row',
      }),
    });
  });

  test('execution is disabled until validation is visible and the user confirms', async () => {
    render(<DataRequest />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));

    const executeButton = await screen.findByRole('button', {
      name: /Execute approved SQL/i,
    });
    expect(executeButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/I reviewed the generated SQL and approve execution/i)
    );
    expect(executeButton).toBeEnabled();
  });

  test('executes approved SQL and displays inserted rows', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(planResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(executionResponse),
      });

    render(<DataRequest />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));
    await screen.findByText(/Schema: test_data/i);
    fireEvent.click(
      screen.getByLabelText(/I reviewed the generated SQL and approve execution/i)
    );
    fireEvent.click(screen.getByRole('button', { name: /Execute approved SQL/i }));

    expect(
      await screen.findByText(/Successfully inserted 1 row/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Inserted rows/i)).toHaveTextContent('Ada');
    expect(fetch).toHaveBeenLastCalledWith('/api/query/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postgreSqlUri: 'postgres://localhost/test',
        approvedSql: validSql,
        confirmed: true,
      }),
    });
  });

  test('sample row grid is keyboard reachable and editable', async () => {
    render(<DataRequest />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));

    const cellInput = await screen.findByLabelText(/Row 1 name/i);
    expect(cellInput.tagName).toBe('INPUT');
    expect(cellInput).toBeEnabled();

    fireEvent.change(cellInput, { target: { value: 'Grace' } });
    expect(cellInput).toHaveValue('Grace');
  });

  test('copies SQL for generate-only workflows', async () => {
    render(<DataRequest />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));
    await screen.findByText(/Schema: test_data/i);
    fireEvent.click(screen.getByRole('button', { name: /Copy SQL/i }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(validSql)
    );
    expect(screen.getByText(/SQL copied to clipboard/i)).toBeInTheDocument();
  });

  test('displays an API error response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            code: 'POSTGRESQL_URI_REQUIRED',
            message: 'A PostgreSQL connection URI is required.',
          },
        }),
    });

    render(<DataRequest />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Generate preview/i }));

    expect(
      await screen.findByText('A PostgreSQL connection URI is required.')
    ).toBeInTheDocument();
  });

  test('disables generation until both inputs have values', () => {
    render(<DataRequest />);

    const generateButton = screen.getByRole('button', {
      name: /Generate preview/i,
    });
    expect(generateButton).toBeDisabled();

    fillRequiredFields();

    expect(generateButton).toBeEnabled();
  });
});

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/PostgreSQL connection URI/i), {
    target: { value: 'postgres://localhost/test' },
  });
  fireEvent.change(screen.getByLabelText(/Dataset description/i), {
    target: { value: 'Create one row' },
  });
};
