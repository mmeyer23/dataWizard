import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import dataWizardLogo from '../../public/assets/dataWizardLogo.webp';
import {
  createExecuteQueryRequest,
  createQueryPlanRequest,
  getApiErrorMessage,
  isQueryPlanResponse,
  isQuerySuccessResponse,
  QUERY_EXECUTE_ENDPOINT,
  QUERY_PLAN_ENDPOINT,
} from '../../shared/apiContracts.js';

export const MAX_PREVIEW_ROWS = 25;
export const MAX_RESULT_ROWS = 50;

const DataRequest = () => {
  const [postgreSqlUri, setPostgreSqlUri] = useState('');
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [planResponse, setPlanResponse] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [executionResponse, setExecutionResponse] = useState(null);
  const [executionConfirmed, setExecutionConfirmed] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [showPostgreSqlUri, setShowPostgreSqlUri] = useState(false);

  const canGenerate =
    loadingStep.length === 0 &&
    naturalLanguageQuery.trim().length > 0;
  const validationPassed = planResponse?.validation?.ok === true;
  const canExecute =
    loadingStep.length === 0 &&
    validationPassed &&
    executionConfirmed &&
    postgreSqlUri.trim().length > 0;

  const rowCountLabel = useMemo(() => {
    const totalRows = planResponse?.plan?.rows?.length ?? 0;
    const visibleRows = previewRows.length;
    if (visibleRows < totalRows) {
      return `Showing ${visibleRows} of ${totalRows} sample rows`;
    }
    return `${totalRows} sample row${totalRows === 1 ? '' : 's'}`;
  }, [planResponse, previewRows.length]);

  const handleGenerate = async () => {
    setError('');
    setCopyMessage('');
    setPlanResponse(null);
    setPreviewRows([]);
    setExecutionResponse(null);
    setExecutionConfirmed(false);
    setLoadingStep('generate');

    try {
      const response = await fetch(QUERY_PLAN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          createQueryPlanRequest({ naturalLanguageQuery })
        ),
      });
      const responseData = await response.json();

      if (!response.ok) {
        setError(
          getApiErrorMessage(
            responseData,
            'The plan could not be generated.'
          )
        );
        return;
      }

      if (!isQueryPlanResponse(responseData)) {
        setError('The server returned an invalid plan response.');
        return;
      }

      setPlanResponse(responseData);
      setPreviewRows(responseData.plan.rows.slice(0, MAX_PREVIEW_ROWS));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStep('');
    }
  };

  const handleExecute = async () => {
    if (!planResponse || !executionConfirmed) return;

    setError('');
    setCopyMessage('');
    setExecutionResponse(null);
    setLoadingStep('execute');

    try {
      const response = await fetch(QUERY_EXECUTE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          createExecuteQueryRequest({
            postgreSqlUri,
            approvedSql: planResponse.sql,
            confirmed: executionConfirmed,
          })
        ),
      });
      const responseData = await response.json();

      if (!response.ok) {
        setError(
          getApiErrorMessage(responseData, 'The SQL could not be executed.')
        );
        return;
      }

      if (!isQuerySuccessResponse(responseData)) {
        setError('The server returned an invalid execution response.');
        return;
      }

      setExecutionResponse(responseData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStep('');
    }
  };

  const handlePreviewCellChange = (rowIndex, columnIndex, value) => {
    setPreviewRows((rows) =>
      rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? value : cell
            )
          : row
      )
    );
  };

  const handleCopySql = async () => {
    if (!planResponse?.sql) return;

    try {
      await navigator.clipboard.writeText(planResponse.sql);
      setCopyMessage('SQL copied to clipboard.');
    } catch {
      setCopyMessage('Copy failed. Select the SQL text manually.');
    }
  };

  const handleDownloadSql = () => {
    if (!planResponse?.sql) return;

    try {
      const blob = new Blob([planResponse.sql], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'datawizard-generated.sql';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCopyMessage('SQL download started.');
    } catch {
      setCopyMessage('Download failed. Copy the SQL text manually.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f6f8fb, #e8eef8)',
        color: '#152238',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth='lg'>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
          }}
        >
          <Stack spacing={4}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent='space-between'
            >
              <Stack direction='row' spacing={2} alignItems='center'>
                <img
                  src={dataWizardLogo}
                  alt='Data Wizard Logo'
                  style={{ width: '72px', height: 'auto' }}
                />
                <Box>
                  <Typography variant='h1' sx={{ fontSize: 34, fontWeight: 800 }}>
                    Data Wizard
                  </Typography>
                  <Typography color='text.secondary'>
                    Generate, inspect, approve, and execute PostgreSQL seed data.
                  </Typography>
                </Box>
              </Stack>
              <Chip
                color='primary'
                label='Preview-first database seeding'
                sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
              />
            </Stack>

            <Box component='section' aria-labelledby='request-heading'>
              <Typography id='request-heading' variant='h2' sx={sectionHeadingSx}>
                1. Describe the dataset
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  id='postgreSqlUri'
                  label='PostgreSQL connection URI'
                  type={showPostgreSqlUri ? 'text' : 'password'}
                  autoComplete='off'
                  helperText='Only needed for execution. Keep it out of screenshots, browser history, and shared machines.'
                  value={postgreSqlUri}
                  variant='outlined'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label={
                            showPostgreSqlUri
                              ? 'Hide database URI'
                              : 'Show database URI'
                          }
                          onClick={() =>
                            setShowPostgreSqlUri((visible) => !visible)
                          }
                        >
                          {showPostgreSqlUri ? 'Hide' : 'Show'}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) => setPostgreSqlUri(e.target.value)}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  id='naturalLanguageQuery'
                  label='Dataset description'
                  helperText='Example: Create 10 support tickets with realistic priorities and statuses.'
                  value={naturalLanguageQuery}
                  variant='outlined'
                  onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    variant='contained'
                    size='large'
                  >
                    {loadingStep === 'generate'
                      ? 'Generating preview...'
                      : 'Generate preview'}
                  </Button>
                  <Button
                    onClick={handleClearWorkspace}
                    disabled={loadingStep.length > 0}
                    variant='outlined'
                    size='large'
                  >
                    Clear workspace
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {error.length > 0 && (
              <Alert severity='error' role='alert'>
                {error}
              </Alert>
            )}

            {planResponse ? (
              <Box component='section' aria-labelledby='preview-heading'>
                <Typography id='preview-heading' variant='h2' sx={sectionHeadingSx}>
                  2. Preview and approve
                </Typography>
                <Stack spacing={3}>
                  <SchemaPreview plan={planResponse.plan} rowCountLabel={rowCountLabel} />
                  <EditableRowsPreview
                    columns={planResponse.plan.columns}
                    rows={previewRows}
                    totalRowCount={planResponse.plan.rows.length}
                    onChange={handlePreviewCellChange}
                  />
                  <FindingsPanel
                    assumptions={planResponse.plan.assumptions}
                    warnings={[...planResponse.warnings, ...planResponse.plan.warnings]}
                    findings={planResponse.validation.findings}
                  />
                  <SqlPreview
                    sql={planResponse.sql}
                    onCopy={handleCopySql}
                    onDownload={handleDownloadSql}
                    copyMessage={copyMessage}
                  />
                  <Paper variant='outlined' sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={executionConfirmed}
                            onChange={(event) =>
                              setExecutionConfirmed(event.target.checked)
                            }
                            inputProps={{
                              'aria-label':
                                'I reviewed the generated SQL and approve execution',
                            }}
                          />
                        }
                        label='I reviewed the generated SQL and approve execution against this database.'
                      />
                      <Button
                        onClick={handleExecute}
                        disabled={!canExecute}
                        color='success'
                        variant='contained'
                        size='large'
                      >
                        {loadingStep === 'execute'
                          ? 'Executing approved SQL...'
                          : 'Execute approved SQL'}
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </Box>
            ) : (
              <Paper variant='outlined' sx={{ p: 3 }}>
                <Typography variant='h2' sx={sectionHeadingSx}>
                  2. Preview and approve
                </Typography>
                <Typography color='text.secondary'>
                  Generate a preview to inspect the schema, rows, validation
                  findings, and SQL before anything touches your database.
                </Typography>
              </Paper>
            )}

            {executionResponse && (
              <Box component='section' aria-labelledby='results-heading'>
                <Typography id='results-heading' variant='h2' sx={sectionHeadingSx}>
                  3. Review execution results
                </Typography>
                <Alert severity='success' sx={{ mb: 2 }}>
                  Successfully inserted {executionResponse.rowCount} row
                  {executionResponse.rowCount === 1 ? '' : 's'}.
                </Alert>
                <RowsResult
                  rows={executionResponse.rows}
                  totalRowCount={executionResponse.rowCount}
                />
              </Box>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );

  function handleClearWorkspace() {
    setPostgreSqlUri('');
    setNaturalLanguageQuery('');
    setPlanResponse(null);
    setPreviewRows([]);
    setExecutionResponse(null);
    setExecutionConfirmed(false);
    setError('');
    setCopyMessage('');
    setShowPostgreSqlUri(false);
  }
};

const SchemaPreview = ({ plan, rowCountLabel }) => (
  <Paper variant='outlined' sx={{ p: 2 }}>
    <Typography variant='h3' sx={subHeadingSx}>
      Schema and table
    </Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
      <Chip label={`Schema: ${plan.schemaName}`} />
      <Chip label={`Table: ${plan.tableName}`} />
      <Chip label={rowCountLabel} />
    </Stack>
    <TableContainer sx={{ maxHeight: 300, overflow: 'auto' }}>
      <Table stickyHeader size='small' aria-label='Schema columns preview'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ backgroundColor: 'background.paper' }}>Column</TableCell>
            <TableCell sx={{ backgroundColor: 'background.paper' }}>Type</TableCell>
            <TableCell sx={{ backgroundColor: 'background.paper' }}>Nullable</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plan.columns.map((column) => (
            <TableRow key={column.name}>
              <TableCell>{column.name}</TableCell>
              <TableCell>{column.type}</TableCell>
              <TableCell>{column.nullable ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const EditableRowsPreview = ({ columns, rows, totalRowCount, onChange }) => (
  <Paper variant='outlined' sx={{ p: 2 }}>
    <Typography variant='h3' sx={subHeadingSx}>
      Editable sample rows
    </Typography>
    <Typography color='text.secondary' sx={{ mb: 2 }}>
      Use this grid to review and mark up sample values before approving the SQL.
      Regenerate the preview to apply material changes to generated SQL.
      {totalRowCount > rows.length && (
        <> Showing the first {rows.length} of {totalRowCount} rows.</>
      )}
    </Typography>
    <TableContainer sx={{ maxHeight: 360, overflow: 'auto' }}>
      <Table stickyHeader size='small' aria-label='Editable sample rows'>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.name} sx={{ backgroundColor: 'background.paper' }}>
                {column.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {columns.map((column, columnIndex) => (
                <TableCell key={`${rowIndex}-${column.name}`}>
                  <TextField
                    fullWidth
                    size='small'
                    variant='standard'
                    slotProps={{
                      htmlInput: {
                        'aria-label': `Row ${rowIndex + 1} ${column.name}`,
                      },
                    }}
                    value={row[columnIndex] ?? ''}
                    onChange={(event) =>
                      onChange(rowIndex, columnIndex, event.target.value)
                    }
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const FindingsPanel = ({ assumptions, warnings, findings }) => (
  <Paper variant='outlined' sx={{ p: 2 }}>
    <Typography variant='h3' sx={subHeadingSx}>
      Assumptions, warnings, and validation
    </Typography>
    <Stack spacing={1}>
      <FindingGroup title='Assumptions' values={assumptions} empty='No assumptions returned.' />
      <FindingGroup title='Warnings' values={warnings} empty='No warnings returned.' />
      <FindingGroup
        title='Validation findings'
        values={findings.map((finding) => `${finding.code}: ${finding.message}`)}
        empty='No validation findings returned.'
      />
    </Stack>
  </Paper>
);

const FindingGroup = ({ title, values, empty }) => (
  <Box>
    <Typography component='h4' sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    {values.length > 0 ? (
      <Box component='ul' sx={{ mt: 0.5, mb: 1.5 }}>
        {values.map((value, index) => (
          <li key={`${title}-${index}`}>{value}</li>
        ))}
      </Box>
    ) : (
      <Typography color='text.secondary' sx={{ mb: 1.5 }}>
        {empty}
      </Typography>
    )}
  </Box>
);

const SqlPreview = ({ sql, onCopy, onDownload, copyMessage }) => (
  <Paper variant='outlined' sx={{ p: 2 }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent='space-between'
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 2 }}
    >
      <Typography variant='h3' sx={subHeadingSx}>
        Generated SQL
      </Typography>
      <Button onClick={onCopy} variant='outlined'>
        Copy SQL
      </Button>
      <Button onClick={onDownload} variant='outlined'>
        Download SQL
      </Button>
    </Stack>
    {copyMessage && <Alert severity='info' sx={{ mb: 2 }}>{copyMessage}</Alert>}
    <Box
      component='pre'
      aria-label='Generated SQL with syntax highlighting'
      sx={{
        backgroundColor: '#101828',
        color: '#e6edf3',
        borderRadius: 2,
        overflow: 'auto',
        maxHeight: 360,
        p: 2,
        m: 0,
        whiteSpace: 'pre',
      }}
    >
      <HighlightedSql sql={sql} />
    </Box>
  </Paper>
);

const HighlightedSql = ({ sql }) => {
  const keywords = new Set([
    'CREATE',
    'SCHEMA',
    'TABLE',
    'IF',
    'NOT',
    'EXISTS',
    'INSERT',
    'INTO',
    'VALUES',
    'RETURNING',
    'TEXT',
    'INTEGER',
    'NUMERIC',
    'BOOLEAN',
    'DATE',
    'TIMESTAMP',
    'NULL',
  ]);

  return sql.split(/(\s+|[,();])/).map((token, index) =>
    keywords.has(token.toUpperCase()) ? (
      <Box component='span' key={`${token}-${index}`} sx={{ color: '#7dd3fc' }}>
        {token}
      </Box>
    ) : (
      <React.Fragment key={`${token}-${index}`}>{token}</React.Fragment>
    )
  );
};

const RowsResult = ({ rows, totalRowCount }) => {
  const visibleRows = rows.slice(0, MAX_RESULT_ROWS);
  const truncated = visibleRows.length < totalRowCount;

  return (
    <Box>
      {truncated && (
        <Alert severity='info' sx={{ mb: 2 }}>
          Showing the first {visibleRows.length} of {totalRowCount} inserted rows.
        </Alert>
      )}
      <Box
        component='pre'
        aria-label='Inserted rows'
        sx={{
          backgroundColor: '#f8fafc',
          border: '1px solid #d0d7de',
          borderRadius: 2,
          maxHeight: 360,
          overflow: 'auto',
          p: 2,
          whiteSpace: 'pre',
        }}
      >
        {JSON.stringify(visibleRows, null, 2)}
      </Box>
    </Box>
  );
};

const sectionHeadingSx = {
  fontSize: 24,
  fontWeight: 800,
  mb: 2,
};

const subHeadingSx = {
  fontSize: 18,
  fontWeight: 800,
  mb: 1.5,
};

export default DataRequest;
