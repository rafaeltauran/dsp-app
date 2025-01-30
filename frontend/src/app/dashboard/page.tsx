"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// Import from map/index.tsx
import { PointInput, CableLine } from "@/components/map";

/** 
 * Dashboard Page 
 * - Manually add lines 
 * - Remove lines 
 * - Load from H5 
 */
const MapDashboard = dynamic(() => import("@/components/map/"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function DashboardPage() {
  const router = useRouter();
  // All cables
  const [lines, setLines] = useState<CableLine[]>([]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [loadH5DialogOpen, setLoadH5DialogOpen] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Removing lines
  const [lineToRemove, setLineToRemove] = useState("");

  // Adding lines
  const [systemName, setSystemName] = useState("");

  const [colour, setColour] = useState("");

  // Minimum 2 points for manual addition
  const [points, setPoints] = useState<PointInput[]>([
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
  ]);

  // For uploading .h5
  const [h5File, setH5File] = useState<File | null>(null);

  // Drawer toggle
  const toggleDrawer = (open: boolean) => () => setDrawerOpen(open);

  /* -------------- ADD LINE LOGIC -------------- */
  const openAddDialog = () => {
    setError(null);
    setSystemName("");
    setPoints([
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    ]);
    setAddDialogOpen(true);
  };
  const closeAddDialog = () => setAddDialogOpen(false);

  const handleAddPoint = () => {
    setPoints((prev) => [
      ...prev,
      { latDeg: "", latDir: "N", lngDeg: "", lngDir: "E" },
    ]);
  };

  const handleRemovePoint = (idx: number) => {
    if (points.length <= 2) return;
    setPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePointChange = (
    index: number,
    field: keyof PointInput,
    value: string
  ) => {
    setPoints((prev) =>
      prev.map((pt, i) => (i === index ? { ...pt, [field]: value } : pt))
    );
  };

  const isValidCoordinate = (val: string) => {
    const match = val.match(/^(\d{1,3})\.(\d{4})$/);
    if (!match) return false;
    const num = parseFloat(val);
    return num >= 0 && num <= 180;
  };

  // The special "West" logic
  // const computeLongitude = (
  //   val: number,
  //   dir: "E" | "W",
  //   prevLng: number | null
  // ) => {
  //   if (dir === "E") return val;
  //   const a = -val;
  //   const b = 360 - val;
  //   if (prevLng == null) {
  //     return a;
  //   }
  //   const diffA = Math.abs(prevLng - a);
  //   const diffB = Math.abs(prevLng - b);
  //   return diffA < diffB ? a : b;
  // };

  const handleAddLine = () => {
    if (!systemName) {
      setError("System name is required.");
      return;
    }
    if (!colour) {
      setError("Please select a cable colour.");
      return;
    }
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!isValidCoordinate(p.latDeg)) {
        setError(
          `Invalid latitude '${p.latDeg}' at point #${i + 1}. Must be [0..180] with 4 decimals.`
        );
        return;
      }
      if (!isValidCoordinate(p.lngDeg)) {
        setError(
          `Invalid longitude '${p.lngDeg}' at point #${i + 1}. Must be [0..180] with 4 decimals.`
        );
        return;
      }
    }
  
    let prevLng: number | null = null;
    const coords: [number, number][] = [];
  
    for (let i = 0; i < points.length; i++) {
      let latVal = parseFloat(points[i].latDeg);
      if (points[i].latDir === "S") {
        latVal = -latVal;
      }
  
      let lngVal = parseFloat(points[i].lngDeg);
      if (points[i].lngDir === "W") {
        const a = -lngVal;
        const b = 360 - lngVal;
        if (prevLng == null) {
          lngVal = a;
        } else {
          const diffA = Math.abs(prevLng - a);
          const diffB = Math.abs(prevLng - b);
          lngVal = diffA < diffB ? a : b;
        }
      }
      coords.push([latVal, lngVal]);
      prevLng = lngVal;
    }
  
    const newLine: CableLine = {
      id: String(Date.now()),
      systemName,
      coordinates: coords,
      colour, // <== Store the selected color here
    };
  
    setLines((prev) => [...prev, newLine]);
    closeAddDialog();
  };

  /* -------------- REMOVE LINE LOGIC -------------- */
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

  /* -------------- LOAD H5 LOGIC -------------- */
  const openLoadH5Dialog = () => {
    setError(null);
    setH5File(null);
    setLoadH5DialogOpen(true);
  };
  const closeLoadH5Dialog = () => {
    setError(null);
    setLoadH5DialogOpen(false);
    setH5File(null);
  };

  const handleH5FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setH5File(e.target.files[0]);
      setError(null);
    }
  };

  const handleLoadH5 = async () => {
    if (!h5File) {
      setError("Please select an .h5 file first.");
      return;
    }
    if (!h5File.name.toLowerCase().endsWith(".h5")) {
      setError("Only .h5 files are supported.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", h5File);

      // Replace with your actual Flask endpoint
      const response = await fetch("http://127.0.0.1:5000/loadh5", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Failed to load .h5. Status: ${response.status}`);
      }
      const data = await response.json();
      // data: { cableSystemName: "...", points: [...] }

      // Convert them to final lat/lng with "South" and "West" logic
      const cableSystemName = data.cableSystemName || `Cable_${Date.now()}`;
      let prevLng: number | null = null;
      const coords: [number, number][] = [];

      data.points.forEach((pt: PointInput) => {
        // parse numeric
        let latVal = parseFloat(pt.latDeg);
        if (pt.latDir === "S") {
          latVal = -latVal;
        }

        let lngVal = parseFloat(pt.lngDeg);
        if (pt.lngDir === "W") {
          const a = -lngVal;
          const b = 360 - lngVal;
          if (prevLng == null) {
            lngVal = a;
          } else {
            const diffA = Math.abs(prevLng - a);
            const diffB = Math.abs(prevLng - b);
            lngVal = diffA < diffB ? a : b;
          }
        }
        coords.push([latVal, lngVal]);
        prevLng = lngVal;
      });

      const newLine: CableLine = {
        id: String(Date.now()),
        systemName: cableSystemName,
        coordinates: coords,
      };

      setLines((prev) => [...prev, newLine]);
      closeLoadH5Dialog();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message || "Error loading H5 file.");
      else setError("Error loading H5 file.");
    }
  };

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-2 right-2 z-[1000]">
        <IconButton onClick={toggleDrawer(true)} sx={{ color: "black" }}>
          <PersonIcon />
        </IconButton>
      </div>

      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <List sx={{ width: 250 }}>
          {/* Add line manually */}
          <ListItem disablePadding>
            <ListItemButton onClick={openAddDialog}>
              <ListItemText primary="Add a new line" />
            </ListItemButton>
          </ListItem>

          {/* Remove line */}
          <ListItem disablePadding>
            <ListItemButton onClick={openRemoveDialog}>
              <ListItemText primary="Remove a line" />
            </ListItemButton>
          </ListItem>

          {/* Load cable from H5 */}
          <ListItem disablePadding>
            <ListItemButton onClick={openLoadH5Dialog}>
              <ListItemText primary="Load cable from H5" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/')}>
            <ListItemText primary="Go back" />
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
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="System Name"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />

<FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel>Cable Colour</InputLabel>
  <Select
    value={colour}
    onChange={(e) => setColour(e.target.value)}
    label="Cable Colour"
  >
    <MenuItem value="red">Red</MenuItem>
    <MenuItem value="blue">Blue</MenuItem>
    <MenuItem value="green">Green</MenuItem>
    <MenuItem value="yellow">Yellow</MenuItem>
    <MenuItem value="black">Black</MenuItem>
  </Select>
</FormControl>


          {points.map((p, idx) => (
            <div key={idx} style={{ border: "1px solid #ddd", padding: "0.5rem", marginBottom: "1rem" }}>
              <strong>Point #{idx + 1}</strong>
              {/* Lat row */}
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

              {/* Lng row */}
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
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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

      {/* Dialog: LOAD H5 */}
      <Dialog open={loadH5DialogOpen} onClose={closeLoadH5Dialog} fullWidth maxWidth="sm">
        <DialogTitle>Load Cable from H5</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            type="file"
            inputProps={{ accept: ".h5" }}
            onChange={handleH5FileChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleLoadH5} fullWidth>
            Load Cable
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
