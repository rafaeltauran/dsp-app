"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Material UI
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
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { CableLine, PointInput } from '@/components/map';

// Dynamically import the Leaflet map
const MapDashboard = dynamic(() => import("@/components/map/"), {
  ssr: false, // Must be client-side for Leaflet
  loading: () => <p>Loading map...</p>,
});

export default function DashboardPage() {
  // State: All cables
  const [lines, setLines] = useState<CableLine[]>([]);

  // Drawer control
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add/Remove line dialogs  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Error message
  const [error, setError] = useState<string | null>(null);

  // For removing a line
  const [lineToRemove, setLineToRemove] = useState<string>("");

  // Cable input fields
  const [systemName, setSystemName] = useState("");
  const [cableOwner, setCableOwner] = useState("");

  // Points array (minimum 2). Each point can optionally have a segmentName
  const [points, setPoints] = useState<PointInput[]>([
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E", segmentName: "" },
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E", segmentName: "" },
  ]);

  const toggleDrawer = (open: boolean) => () => setDrawerOpen(open);

  /* --------------------------------------------
          ADD LINE LOGIC
  -------------------------------------------- */
  const openAddDialog = () => {
    setError(null);
    setSystemName("");
    setCableOwner("");
    // reset points
    setPoints([
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E", segmentName: "" },
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E", segmentName: "" },
    ]);
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => setAddDialogOpen(false);

  // Add an extra point
  const handleAddPoint = () => {
    setPoints((prev) => [
      ...prev,
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E", segmentName: "" },
    ]);
  };

  // Remove a point (if more than 2 remain)
  const handleRemovePoint = (index: number) => {
    if (points.length <= 2) return;
    setPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePointChange = (
    index: number,
    field: keyof PointInput,
    value: string
  ) => {
    setPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // Basic check: MM.MMMM within [0..180]
  const isValidCoordinate = (val: string) => {
    const match = val.match(/^(\d{1,3})\.(\d{4})$/);
    if (!match) return false;
    const num = parseFloat(val);
    return num >= 0 && num <= 180;
  };

  // West logic
  const computeLongitude = (
    val: number,
    dir: "E" | "W",
    prevLng: number | null
  ): number => {
    if (dir === "E") return val;
    // W
    const a = -val;
    const b = 360 - val;
    if (prevLng === null) {
      return a; // default
    }
    const diffA = Math.abs(prevLng - a);
    const diffB = Math.abs(prevLng - b);
    return diffA < diffB ? a : b;
  }

  const handleAddLine = () => {
    // Validate system name
    if (!systemName) {
      setError("System name is required.");
      return;
    }
    // Validate points
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!isValidCoordinate(p.latDeg)) {
        setError(`Invalid latitude ${p.latDeg} at point #${i + 1}.`);
        return;
      }
      if (!isValidCoordinate(p.lngDeg)) {
        setError(`Invalid longitude ${p.lngDeg} at point #${i + 1}.`);
        return;
      }
    }

    // Convert each point
    let prevLng: number | null = null;
    const coordinates: [number, number][] = [];
    const segNames: string[] = [];

    for (let i = 0; i < points.length; i++) {
      const { latDeg, latDir, lngDeg, lngDir, segmentName } = points[i];
      let latVal = parseFloat(latDeg);
      let lngVal = parseFloat(lngDeg);

      // If south, negative lat
      if (latDir === "S") {
        latVal = -latVal;
      }

      lngVal = computeLongitude(lngVal, lngDir, prevLng);
      coordinates.push([latVal, lngVal]);
      prevLng = lngVal;

      // optional segment name
      if (i > 0 && segmentName) segNames.push(segmentName);
      else segNames.push("");
    }

    const newLine: CableLine = {
      id: String(Date.now()),
      systemName,
      cableOwner: cableOwner || undefined,
      coordinates,
      segmentNames: segNames,
    };

    setLines((prev) => [...prev, newLine]);
    closeAddDialog();
  };

  /* --------------------------------------------
         REMOVE LINE LOGIC
  -------------------------------------------- */
  const openRemoveDialog = () => {
    setError(null);
    setLineToRemove("");
    setRemoveDialogOpen(true);
  };

  const closeRemoveDialog = () => setRemoveDialogOpen(false);

  const handleRemoveLine = () => {
    if (!lineToRemove) {
      setError("Please select a line to remove.");
      return;
    }
    setLines((prev) => prev.filter((l) => l.systemName !== lineToRemove));
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

      {/* Drawer */}
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

      {/* Map */}
      <MapDashboard lines={lines} />

      {/* ADD LINE DIALOG */}
      <Dialog open={addDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add New Cable</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="System Name"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Cable Owner (optional)"
            value={cableOwner}
            onChange={(e) => setCableOwner(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />

          {points.map((p, index) => (
            <div
              key={index}
              style={{ border: "1px solid #ddd", padding: "0.5rem", marginBottom: "1rem" }}
            >
              <strong>Point #{index + 1}</strong>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                {/* Latitude */}
                <TextField
                  label="Lat (MM.MMMM)"
                  value={p.latDeg}
                  onChange={(e) => handlePointChange(index, "latDeg", e.target.value)}
                  fullWidth
                />
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel>Dir</InputLabel>
                  <Select
                    label="Dir"
                    value={p.latDir}
                    onChange={(e) => handlePointChange(index, "latDir", e.target.value)}
                  >
                    <MenuItem value="N">N</MenuItem>
                    <MenuItem value="S">S</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Longitude */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <TextField
                  label="Lng (MM.MMMM)"
                  value={p.lngDeg}
                  onChange={(e) => handlePointChange(index, "lngDeg", e.target.value)}
                  fullWidth
                />
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel>Dir</InputLabel>
                  <Select
                    label="Dir"
                    value={p.lngDir}
                    onChange={(e) => handlePointChange(index, "lngDir", e.target.value)}
                  >
                    <MenuItem value="E">E</MenuItem>
                    <MenuItem value="W">W</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Segment Name (if not first point) */}
              {index > 0 && (
                <TextField
                  label="Segment Name (From previous to this point)"
                  value={p.segmentName || ""}
                  onChange={(e) => handlePointChange(index, "segmentName", e.target.value)}
                  fullWidth
                  sx={{ mt: 1 }}
                />
              )}

              {/* Remove button */}
              {points.length > 2 && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemovePoint(index)}
                  sx={{ mt: 1 }}
                >
                  Remove This Point
                </Button>
              )}
            </div>
          ))}

          <Button variant="outlined" onClick={handleAddPoint}>
            Add Another Point
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddLine}
            fullWidth
            sx={{ mt: 2 }}
          >
            Add Cable
          </Button>
        </DialogContent>
      </Dialog>

      {/* REMOVE LINE DIALOG */}
      <Dialog open={removeDialogOpen} onClose={closeRemoveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Remove a Cable</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="remove-line-label">Select Cable</InputLabel>
            <Select
              labelId="remove-line-label"
              value={lineToRemove}
              label="Select Cable"
              onChange={(e) => setLineToRemove(e.target.value)}
            >
              {lines.map((l) => (
                <MenuItem key={l.id} value={l.systemName}>
                  {l.systemName}
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
            Remove
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
