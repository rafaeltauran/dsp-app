'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CameraAlt as CameraIcon } from '@mui/icons-material';

export default function Home() {
  const [option, setOption] = useState<string>("Visualise");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (_event: React.MouseEvent<HTMLElement>, newOption: string | null) => {
    if (newOption === "Convert") {
      setIsDialogOpen(true); // Open the dialog for Convert
    }
    setOption(newOption || "Visualise");
  };

  // Close down dialog
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFile(null);
    setDownloadLink(null);
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
      setDownloadLink(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please upload a file to convert.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await fetch('http://insertyourIP/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process the file.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to process the file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        backgroundImage: "url('/images/andrew-stutesman-map.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
      }}
    >
      {/* Dark Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          opacity: 0.5,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
        }}
      >
        {/* Toggle Buttons */}
        <ToggleButtonGroup
          value={option}
          exclusive
          onChange={handleOptionChange}
          sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: 2,
            p: 0.5,
            mb: 2,
            opacity: 0.9,
          }}
        >
          <ToggleButton value="Convert">Convert</ToggleButton>
          <ToggleButton value="Visualise">Visualise</ToggleButton>
        </ToggleButtonGroup>

        {/* "Visualise" Placeholder */}
        {option === "Visualise" && (
          <Typography
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 2,
              boxShadow: 3,
            }}
          >
            Please login to continue
          </Typography>
        )}
      </Box>

      {/* Creator Button */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 2,
        }}
      >
        <Button
          variant="contained"
          startIcon={<CameraIcon />}
          href="https://unsplash.com/@drwmrk"
          target="_blank"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            color: 'black',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            },
          }}
        >
          Andrew Stutesman
        </Button>
      </Box>

      {/* Dialog for File Converter */}
      <Dialog open={isDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>File Converter</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            type="file"
            inputProps={{ accept: '.xlsx,.csv' }}
            onChange={handleFileChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={isLoading}
            fullWidth
            sx={{ mb: 2 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Upload & Convert'}
          </Button>
          {downloadLink && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              href={downloadLink}
              download="converted_file.csv"
            >
              Download File
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
