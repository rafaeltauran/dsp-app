"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Tooltip,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";

// If you have a separate maritimeZones.tsx, import it:
import MaritimeZones from "../maritimeZones";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

/**
 * Exported interfaces so the dashboard can import them
 * without referencing any segmentName or cableOwner.
 */
export interface PointInput {
  latDeg: string;    // e.g. "12.3456"
  latDir: "N" | "S"; // North or South
  lngDeg: string;    // e.g. "123.4567"
  lngDir: "E" | "W"; // East or West
}

export interface CableLine {
  id: string;
  systemName: string;
  coordinates: [number, number][]; // e.g. [[lat, lng], [lat, lng], ...]
}

/** Used internally to store cable-cable intersections */
interface Intersection {
  latlng: LatLngExpression;
  cables: string[]; // system names
}

/** Map component props */
interface MapProps {
  lines: CableLine[];
}

/** 
 * A helper to check segment intersection in 2D pixel space.
 * Takes p1->p2 and p3->p4, each being Leaflet Points (x,y).
 */
function lineIntersection2D(
  p1: L.Point,
  p2: L.Point,
  p3: L.Point,
  p4: L.Point
): L.Point | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (denom === 0) return null; // parallel or coincident

  const t =
    ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u =
    ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / denom;

  // 0 <= t <= 1, 0 <= u <= 1 means p1->p2 intersects p3->p4
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectX = p1.x + t * (p2.x - p1.x);
    const intersectY = p1.y + t * (p2.y - p1.y);
    return new L.Point(intersectX, intersectY);
  }
  return null;
}

/**
 * Main Map component:
 * - Renders maritime boundaries
 * - Renders all cables (lines)
 * - Runs intersection logic for cable-cable
 */
export default function MapDashboard({ lines }: MapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom
      preferCanvas
      maxZoom={8}
      minZoom={2}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Base tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Maritime boundaries (EEZ, 24NM, 12NM), if you have a separate maritimeZones.tsx */}
      <MaritimeZones />

      {/* Render each cable line */}
      {lines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.coordinates}
          pathOptions={{ color: "blue", weight: 3 }}
        >
          <Tooltip sticky>{line.systemName}</Tooltip>
        </Polyline>
      ))}

      {/* Intersection Markers sub-component */}
      <IntersectionMarkers lines={lines} />
    </MapContainer>
  );
}

/**
 * Sub-component that:
 * 1. Converts each cable to pixel segments
 * 2. Checks pairwise intersection
 * 3. Renders Markers where cables intersect
 */
function IntersectionMarkers({ lines }: { lines: CableLine[] }) {
  const map = useMap();
  const [intersections, setIntersections] = useState<Intersection[]>([]);

  useEffect(() => {
    if (!map || lines.length === 0) {
      setIntersections([]);
      return;
    }

    const newIntersections: Intersection[] = [];

    // Helper to add or merge an intersection
    function addIntersection(pt: L.LatLng, cableA: string, cableB: string) {
      // Check if an existing intersection is "close" to pt
      const existing = newIntersections.find(
        (i) => map.distance(i.latlng, pt) < 0.0001
      );
      if (existing) {
        // Merge cable names
        const cablesSet = new Set([...existing.cables, cableA, cableB]);
        existing.cables = Array.from(cablesSet);
      } else {
        newIntersections.push({
          latlng: pt,
          cables: [cableA, cableB],
        });
      }
    }

    // For each cable pair, check all segments
    for (let i = 0; i < lines.length; i++) {
      const lineA = lines[i];
      for (let a = 0; a < lineA.coordinates.length - 1; a++) {
        const pxA1 = map.project(L.latLng(lineA.coordinates[a]));
        const pxA2 = map.project(L.latLng(lineA.coordinates[a + 1]));

        for (let j = i + 1; j < lines.length; j++) {
          const lineB = lines[j];
          for (let b = 0; b < lineB.coordinates.length - 1; b++) {
            const pxB1 = map.project(L.latLng(lineB.coordinates[b]));
            const pxB2 = map.project(L.latLng(lineB.coordinates[b + 1]));

            // Check intersection in pixel space
            const ipt = lineIntersection2D(pxA1, pxA2, pxB1, pxB2);
            if (ipt) {
              // Convert pixel coords back to lat-lng
              const latlng = map.unproject(ipt);
              addIntersection(latlng, lineA.systemName, lineB.systemName);
            }
          }
        }
      }
    }

    setIntersections(newIntersections);
  }, [map, lines]);

  return (
    <>
      {intersections.map((ipt, idx) => (
        <Marker key={idx} position={ipt.latlng}>
          <Popup>
            <strong>Intersection</strong>
            <div style={{ marginTop: "0.5rem" }}>
              {ipt.cables.join(", ")}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
