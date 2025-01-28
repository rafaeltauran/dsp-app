'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';

import { CameraAlt as CameraIcon } from '@mui/icons-material';

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open/close the dialog
  const handleDialogOpen = () => setIsDialogOpen(true);
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFile(null);
    setDownloadLink(null);
    setError(null);
  };

  // Handle file input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
      setDownloadLink(null);
    }
  };

  // Upload to Flask backend, receive HDF5
  const handleUpload = async () => {
    if (!file) {
      setError('Please upload an Excel file.');
      return;
    }

    // We only allow .xlsx
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx files are accepted.');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      // Replace with your Flask server IP/URL
      const response = await fetch('http://127.0.0.1:5000/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process the file.');
      }

      // We expect the backend to return an .h5 file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to convert the Excel file. Please try again.');
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

      {/* White Box */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 3,
          textAlign: 'center',
          p: 4,
          width: '400px',
          zIndex: 2,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, color: 'blue' }}>
          Welcome to Group E4's Demo
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Pick one of the following options:
        </Typography>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleDialogOpen}
          sx={{ mb: 2 }}
        >
          Convert file to S100 standard
        </Button>

        <Divider sx={{ mb: 2 }}>OR</Divider>

        {/* Link to your dashboard */}
        <Link href="/dashboard">
          <Button variant="outlined" color="primary" fullWidth>
            Login to view visualiser
          </Button>
        </Link>

        {/* Link to the documentation */}
        <Link href="/documentation">
          <Button variant="outlined" color="primary" fullWidth>
            View Documentation
          </Button>
        </Link>
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
            inputProps={{ accept: '.xlsx' }}
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
              download="converted_file.h5"
            >
              Download Converted HDF5
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Acknowledgment Button */}
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
    </Box>
  );
}
