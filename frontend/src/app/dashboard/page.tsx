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

  // For "Add line" dialog, store main input fields
  const [lineName, setLineName] = useState("");
  const [description, setDescription] = useState("");

  // Points array (minimum of 2 points)
  const [points, setPoints] = useState<{ lat: string; lng: string }[]>([
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ]);

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
    // Reset to exactly 2 points as a minimum
    setPoints([
      { lat: "", lng: "" },
      { lat: "", lng: "" },
    ]);
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
  };

  // Add an extra point
  const handleAddPoint = () => {
    setPoints((prev) => [...prev, { lat: "", lng: "" }]);
  };

  // Remove a point if we have more than 2
  const handleRemovePoint = (index: number) => {
    if (points.length <= 2) return; // Minimum of 2
    setPoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Update lat/lng for a specific point
  const handlePointChange = (index: number, field: "lat" | "lng", value: string) => {
    setPoints((prev) =>
      prev.map((point, i) =>
        i === index ? { ...point, [field]: value } : point
      )
    );
  };

  const handleAddLine = () => {
    // Validate name/description
    if (!lineName || !description) {
      setError("Please provide a Line Name and Description.");
      return;
    }
    // Validate points (each lat/lng must be present and numeric)
    for (let i = 0; i < points.length; i++) {
      const { lat, lng } = points[i];
      if (!lat || !lng) {
        setError(`All lat/lng fields must be filled (Point #${i + 1}).`);
        return;
      }
      if (isNaN(Number(lat)) || isNaN(Number(lng))) {
        setError(`Invalid lat/lng value (Point #${i + 1}).`);
        return;
      }
    }

    // Convert to numeric arrays
    const coordinates = points.map((p) => [
      parseFloat(p.lat),
      parseFloat(p.lng),
    ]);

    const newLine: CableLine = {
      id: String(Date.now()), // simplistic unique ID
      name: lineName,
      description,
      coordinates, // e.g., [[lat1, lng1],[lat2, lng2],[lat3, lng3]...]
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
        <IconButton onClick={toggleDrawer(true)} sx={{ color: "black" }}>
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
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

          {/* Dynamic Points */}
          {points.map((point, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
            >
              <TextField
                label={`Lat (Point #${index + 1})`}
                value={point.lat}
                onChange={(e) => handlePointChange(index, "lat", e.target.value)}
                fullWidth
              />
              <TextField
                label={`Lng (Point #${index + 1})`}
                value={point.lng}
                onChange={(e) => handlePointChange(index, "lng", e.target.value)}
                fullWidth
              />
              {points.length > 2 && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemovePoint(index)}
                >
                  X
                </Button>
              )}
            </div>
          ))}

          <Button variant="outlined" onClick={handleAddPoint} sx={{ mb: 2 }}>
            Add Another Point
          </Button>

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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
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
