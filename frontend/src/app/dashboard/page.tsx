"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Material UI Imports
import {
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

// Types and interfaces
import type { CableLine } from "@/components/map/";

// Dynamically import the Leaflet map
const MapDashboard = dynamic(() => import("@/components/map/"), {
  ssr: false, // Leaflet must be client-side
  loading: () => <p>Loading map...</p>,
});

export default function DashboardPage() {
  // State to store cable lines
  const [lines, setLines] = useState<CableLine[]>([]);

  // State for the right-hand Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Error state for handling invalid input, etc.
  const [error, setError] = useState<string | null>(null);

  // For "Remove line" dialog, store which line to remove
  const [lineToRemove, setLineToRemove] = useState<string>("");

  // For "Add line" dialog, store input fields
  const [lineName, setLineName] = useState("");
  const [description, setDescription] = useState("");
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");
  const [endLat, setEndLat] = useState("");
  const [endLng, setEndLng] = useState("");

  // Toggle drawer
  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  // ---- ADD LINE LOGIC ----
  const openAddDialog = () => {
    // Clear out any old data
    setError(null);
    setLineName("");
    setDescription("");
    setStartLat("");
    setStartLng("");
    setEndLat("");
    setEndLng("");
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
  };

  const handleAddLine = () => {
    // Validate input
    if (!lineName || !description || !startLat || !startLng || !endLat || !endLng) {
      setError("All fields are required!");
      return;
    }

    // Convert strings to numbers
    const lat1 = parseFloat(startLat);
    const lng1 = parseFloat(startLng);
    const lat2 = parseFloat(endLat);
    const lng2 = parseFloat(endLng);

    // Basic input checks
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      setError("Invalid latitude/longitude values.");
      return;
    }

    // Create a new line
    const newLine: CableLine = {
      id: `${Date.now()}`, // simplistic unique ID
      name: lineName,
      coordinates: [
        [lat1, lng1],
        [lat2, lng2],
      ],
      description,
    };

    // Update state
    setLines((prev) => [...prev, newLine]);
    closeAddDialog();
  };

  // ---- REMOVE LINE LOGIC ----
  const openRemoveDialog = () => {
    setError(null);
    setLineToRemove("");
    setRemoveDialogOpen(true);
  };

  const closeRemoveDialog = () => {
    setRemoveDialogOpen(false);
  };

  const handleRemoveLine = () => {
    if (!lineToRemove) {
      setError("Please select a line to remove.");
      return;
    }
    setLines((prev) => prev.filter((line) => line.name !== lineToRemove));
    closeRemoveDialog();
  };

  return (
    <div className="relative w-full h-screen">
      {/* Top-right corner user icon */}
        <div className="absolute top-2 right-2 z-[1000]">
            <IconButton
                onClick={toggleDrawer(true)}
                sx={{ color: 'black' }}
            >
                <PersonIcon />
            </IconButton>
        </div>

      {/* Drawer on the right side */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <List sx={{ width: 250 }}>
            <ListItem disablePadding>
                <ListItemButton onClick={openAddDialog}>
                    <ListItemText primary="Add a new line" />
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton onClick={openRemoveDialog}>
                    <ListItemText primary="Remove a line" />
                </ListItemButton>
            </ListItem>
        </List>
      </Drawer>

      {/* The Map (in the background) */}
      <MapDashboard lines={lines} />

      {/* -- ADD LINE DIALOG -- */}
      <Dialog open={addDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add a New Line</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Line Name"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <div style={{ display: "flex", gap: "1rem" }}>
            <TextField
              label="Start Lat"
              value={startLat}
              onChange={(e) => setStartLat(e.target.value)}
              fullWidth
            />
            <TextField
              label="Start Lng"
              value={startLng}
              onChange={(e) => setStartLng(e.target.value)}
              fullWidth
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <TextField
              label="End Lat"
              value={endLat}
              onChange={(e) => setEndLat(e.target.value)}
              fullWidth
            />
            <TextField
              label="End Lng"
              value={endLng}
              onChange={(e) => setEndLng(e.target.value)}
              fullWidth
            />
          </div>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddLine}
            sx={{ mt: 2 }}
            fullWidth
          >
            Add Line
          </Button>
        </DialogContent>
      </Dialog>

      {/* -- REMOVE LINE DIALOG -- */}
      <Dialog open={removeDialogOpen} onClose={closeRemoveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Remove a Line</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="line-select-label">Select Line</InputLabel>
            <Select
              labelId="line-select-label"
              value={lineToRemove}
              label="Select Line"
              onChange={(e) => setLineToRemove(e.target.value)}
            >
              {lines.map((line) => (
                <MenuItem key={line.id} value={line.name}>
                  {line.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveLine}
            fullWidth
          >
            Remove Line
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
