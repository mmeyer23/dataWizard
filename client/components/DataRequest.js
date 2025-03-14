import React, { useState } from 'react';
import { TextField, Button, Typography, Container, Box } from '@mui/material';
import { errorMonitor } from 'events';
import dataWizardLogo from '../../public/assets/dataWizardLogo.png';

const DataRequest = () => {
  const [postgreSqlUri, setPostgreSqlUri] = useState('');
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverResponse, setServerResponse] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postgreSqlUri, naturalLanguageQuery }),
      });
      const responseData = await response.json();
      if (!responseData.ok) {
        setError(responseData);
      } else {
        setServerResponse(responseData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #2b2233, #2c3d50)',
        height: '100vh',
        padding: 4,
        color: '#fff',
      }}
    >
      <img
        src={dataWizardLogo}
        alt='Data Wizard Logo'
        style={{
          width: '200px',
          height: 'auto',
          marginBottom: '20px',
        }}
      />

      <Typography
        variant='h1'
        sx={{
          marginTop: 3,
          marginBottom: 5,
          fontSize: 36,
          fontFamily: "'Poppins', sans-serif",
          textAlign: 'center',
          color: '#fff',
        }}
      >
        Data Wizard
      </Typography>

      <Box sx={{ maxWidth: 600, width: '100%' }}>
        <TextField
          fullWidth
          sx={{
            marginTop: 2,
            marginBottom: 5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
            },
            '& .MuiInputLabel-root': {
              transition: 'all 0.2s ease',
              top: '-10px',
              fontSize: '14px',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              top: '-18px',
              fontSize: '12px',
              color: '#53e9ee',
            },
          }}
          id='postgreSqlUri'
          label='Enter PostgreSQL URI'
          variant='outlined'
          onChange={(e) => setPostgreSqlUri(e.target.value)}
        />
        <TextField
          fullWidth
          multiline
          minRows={5}
          sx={{
            marginBottom: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
            },
            '& .MuiInputLabel-root': {
              transition: 'all 0.2s ease',
              top: '-10px',
              fontSize: '14px',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              top: '-18px',
              fontSize: '12px',
              color: '#53e9ee',
            },
          }}
          id='naturalLanguageQuery'
          label='Description of table, columns, and number of rows'
          variant='outlined'
          onChange={(e) => setNaturalLanguageQuery(e.target.value)}
        />

        <Button
          onClick={() => {
            setError('');
            handleSubmit();
          }}
          variant='contained'
          sx={{
            width: '100%',
            backgroundColor: '#53e9ee',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#183451',
              transform: 'scale(1.05)',
              boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)',
            },
            '&:active': {
              transform: 'scale(0.98)',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
            },
            '&:focus': {
              outline: 'none',
            },
          }}
        >
          {loading ? 'Loading PostgreSQL Data...' : 'Populate Database'}
        </Button>
      </Box>

      {/* Error Message */}
      {error.length > 0 && (
        <Container
          sx={{
            marginTop: 2,
            padding: '16px',
            backgroundColor: '#ffcccc',
            borderRadius: '8px',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
            width: '100%',
          }}
        >
          <Typography
            sx={{ color: '#D32F2F', fontSize: '16px', textAlign: 'center' }}
          >
            {error}
          </Typography>
        </Container>
      )}

      {/* Server Response */}
      {serverResponse.length > 0 && (
        <Container
          sx={{
            marginTop: 2,
            padding: '16px',
            backgroundColor: '#e1f7d5',
            borderRadius: '8px',
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
            width: '100%',
          }}
        >
          <Typography
            sx={{ color: '#388E3C', fontSize: '16px', textAlign: 'center' }}
          >
            {serverResponse}
          </Typography>
        </Container>
      )}
    </Container>
  );
};

export default DataRequest;
