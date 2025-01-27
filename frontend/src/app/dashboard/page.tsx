"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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

/** Each user-entered point has lat/lng plus directions and optional segment name */
interface PointInput {
  latDeg: string;    // e.g. "12.3456"
  latDir: "N" | "S"; // North or South
  lngDeg: string;    // e.g. "123.4567"
  lngDir: "E" | "W"; // East or West
  segmentName?: string;
}

/** Our cable line data structure passed to the map */
export interface CableLine {
  id: string;
  systemName: string;
  cableOwner?: string;
  coordinates: [number, number][]; // array of lat-lng
  segmentNames?: string[];
}

// Dynamically import the map to ensure Leaflet runs on the client side
const MapDashboard = dynamic(() => import("@/components/map/"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function DashboardPage() {
  // State storing all cables
  const [lines, setLines] = useState<CableLine[]>([]);

  // Drawer for user icon
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Error handling
  const [error, setError] = useState<string | null>(null);

  // For removing lines
  const [lineToRemove, setLineToRemove] = useState("");

  // For adding lines
  const [systemName, setSystemName] = useState("");
  const [cableOwner, setCableOwner] = useState("");

  // Minimum 2 points
  const [points, setPoints] = useState<PointInput[]>([
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
  ]);

  // Drawer toggle
  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  /* --------------------------------------------
          ADD LINE LOGIC
  -------------------------------------------- */
  const openAddDialog = () => {
    setError(null);
    setSystemName("");
    setCableOwner("");
    setPoints([
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    ]);
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => setAddDialogOpen(false);

  // Add an extra point
  const handleAddPoint = () => {
    setPoints((prev) => [
      ...prev,
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    ]);
  };

  // Remove a point if we have more than 2
  const handleRemovePoint = (index: number) => {
    if (points.length <= 2) return;
    setPoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a single field in the points array
  const handlePointChange = (index: number, field: keyof PointInput, value: string) => {
    setPoints((prev) =>
      prev.map((pt, i) => (i === index ? { ...pt, [field]: value } : pt))
    );
  };

  // Basic check for "MM.MMMM" within [0..180]
  const isValidCoordinate = (val: string) => {
    const match = val.match(/^(\d{1,3})\.(\d{4})$/);
    if (!match) return false;
    const num = parseFloat(val);
    return num >= 0 && num <= 180;
  };

  // The special West logic
  const computeLongitude = (val: number, dir: "E" | "W", prevLng: number | null): number => {
    if (dir === "E") return val;
    // if West:
    const a = -val;
    const b = 360 - val;
    if (prevLng == null) {
      return a; // default if first point
    }
    const diffA = Math.abs(prevLng - a);
    const diffB = Math.abs(prevLng - b);
    return diffA < diffB ? a : b;
  };

  const handleAddLine = () => {
    // 1) Validate system name
    if (!systemName) {
      setError("System name is required.");
      return;
    }
    // 2) Validate points
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!isValidCoordinate(p.latDeg)) {
        setError(`Invalid latitude '${p.latDeg}' at point #${i + 1}. Must be in [0..180] with 4 decimals.`);
        return;
      }
      if (!isValidCoordinate(p.lngDeg)) {
        setError(`Invalid longitude '${p.lngDeg}' at point #${i + 1}. Must be in [0..180] with 4 decimals.`);
        return;
      }
    }

    // 3) Convert to numeric lat-lng
    let prevLng: number | null = null;
    const coords: [number, number][] = [];
    for (let i = 0; i < points.length; i++) {
      let latVal = parseFloat(points[i].latDeg);
      let lngVal = parseFloat(points[i].lngDeg);

      // If south, negative lat
      if (points[i].latDir === "S") {
        latVal = -latVal;
      }

      // West logic
      lngVal = computeLongitude(lngVal, points[i].lngDir, prevLng);
      coords.push([latVal, lngVal]);
      prevLng = lngVal;
    }

    // 4) Create new line
    const newLine: CableLine = {
      id: String(Date.now()),
      systemName,
      cableOwner: cableOwner || undefined,
      coordinates: coords,
    };

    // 5) Add to state
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
      {/* Icon in the top-right corner */}
      <div className="absolute top-2 right-2 z-[1000]">
        <IconButton onClick={toggleDrawer(true)} sx={{ color: "black" }}>
          <PersonIcon />
        </IconButton>
      </div>

      {/* Drawer on the right */}
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

      {/* The Map */}
      <MapDashboard lines={lines} />

      {/* Dialog: ADD LINE */}
      <Dialog open={addDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add a New Cable</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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

          {/* Points */}
          {points.map((p, idx) => (
            <div key={idx} style={{ border: "1px solid #ddd", padding: "0.5rem", marginBottom: "1rem" }}>
              <strong>Point #{idx + 1}</strong>
              {/* Latitude row */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <TextField
                  label="Lat (MM.MMMM)"
                  value={p.latDeg}
                  onChange={(e) => handlePointChange(idx, "latDeg", e.target.value)}
                  fullWidth
                />
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel>LatDir</InputLabel>
                  <Select
                    label="LatDir"
                    value={p.latDir}
                    onChange={(e) => handlePointChange(idx, "latDir", e.target.value)}
                  >
                    <MenuItem value="N">N</MenuItem>
                    <MenuItem value="S">S</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* Longitude row */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <TextField
                  label="Lng (MM.MMMM)"
                  value={p.lngDeg}
                  onChange={(e) => handlePointChange(idx, "lngDeg", e.target.value)}
                  fullWidth
                />
                <FormControl sx={{ minWidth: 80 }}>
                  <InputLabel>LngDir</InputLabel>
                  <Select
                    label="LngDir"
                    value={p.lngDir}
                    onChange={(e) => handlePointChange(idx, "lngDir", e.target.value)}
                  >
                    <MenuItem value="E">E</MenuItem>
                    <MenuItem value="W">W</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {points.length > 2 && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemovePoint(idx)}
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

      {/* Dialog: REMOVE LINE */}
      <Dialog open={removeDialogOpen} onClose={closeRemoveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Remove a Cable</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Cable</InputLabel>
            <Select
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
          <Button variant="contained" color="error" onClick={handleRemoveLine} fullWidth>
            Remove
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
