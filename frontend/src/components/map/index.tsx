"use client";

import { useEffect, useState, useMemo } from "react";
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

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

export interface CableLine {
  id: string;
  systemName: string;
  cableOwner?: string;
  coordinates: [number, number][];    // e.g. [[lat, lng], [lat, lng], ...]
  segmentNames?: string[];           // optional
}

export interface PointInput {
  latDeg: string;              // e.g. "12.3456" in the format MM.MMMM
  lngDeg: string;  
  latDir: "N" | "S";            // e.g. "123.4567"
  lngDir: "E" | "W";           // East or West
  segmentName?: string;        // Optional name describing this segment
}

interface Intersection {
  latlng: LatLngExpression;
  cables: string[]; // system names
}

interface MapProps {
  lines: CableLine[];
}

/* Helper: Check segment intersection in 2D pixel space */
function lineIntersection2D(
  p1: L.Point, p2: L.Point,
  p3: L.Point, p4: L.Point
): L.Point | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (denom === 0) return null; // parallel or coincident

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u = ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectX = p1.x + t * (p2.x - p1.x);
    const intersectY = p1.y + t * (p2.y - p1.y);
    return new L.Point(intersectX, intersectY);
  }
  return null;
}

export default function MapDashboard({ lines }: MapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {lines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.coordinates}
          pathOptions={{ color: "blue", weight: 3 }}
        >
          <Tooltip sticky>
            {/* Show system name or other info */}
            {line.systemName}
            {line.cableOwner && <div>Owner: {line.cableOwner}</div>}
          </Tooltip>
        </Polyline>
      ))}

      {/* Separate component to find and render intersections */}
      <IntersectionMarkers lines={lines} />
    </MapContainer>
  );
}

/* 
  Component that:
  1. Projects each cable line to pixel coords
  2. Checks segment-segment intersection
  3. Creates Markers for unique intersections
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
    
    // We'll keep a small function to add or merge intersection results
    function addIntersection(pt: L.LatLng, cableA: string, cableB: string) {
      // See if there's already an intersection within ~10 meters
      // (so we don't double-marker the same latlng)
      const existing = newIntersections.find((i) => i.latlng && 
        (map.distance(i.latlng, pt) < 0.0001) // or 10 meters etc.
      );
      if (existing) {
        // Just add the cable names to the existing list
        const uniqueCables = new Set([...existing.cables, cableA, cableB]);
        existing.cables = Array.from(uniqueCables);
      } else {
        newIntersections.push({
          latlng: pt,
          cables: [cableA, cableB],
        });
      }
    }

    // Convert each cable into pixel segments, check all pairs
    const linesCount = lines.length;
    for (let i = 0; i < linesCount; i++) {
      const lineA = lines[i];
      const coordsA = lineA.coordinates;
      for (let a = 0; a < coordsA.length - 1; a++) {
        const latlngA1 = L.latLng(coordsA[a]);
        const latlngA2 = L.latLng(coordsA[a+1]);
        const pxA1 = map.project(latlngA1);
        const pxA2 = map.project(latlngA2);

        for (let j = i+1; j < linesCount; j++) {
          const lineB = lines[j];
          const coordsB = lineB.coordinates;
          for (let b = 0; b < coordsB.length - 1; b++) {
            const latlngB1 = L.latLng(coordsB[b]);
            const latlngB2 = L.latLng(coordsB[b+1]);
            const pxB1 = map.project(latlngB1);
            const pxB2 = map.project(latlngB2);

            // Check intersection in pixel space
            const ipt = lineIntersection2D(pxA1, pxA2, pxB1, pxB2);
            if (ipt) {
              // Convert pixel intersection back to lat-lng
              const iLatLng = map.unproject(ipt);
              addIntersection(iLatLng, lineA.systemName, lineB.systemName);
            }
          }
        }
      }
    }

    setIntersections(newIntersections);
  }, [map, lines]);

  return (
    <>
      {intersections.map((x, idx) => (
        <Marker key={idx} position={x.latlng}>
          <Popup>
            <strong>Intersection</strong>
            <div style={{ marginTop: "0.5rem" }}>
              {x.cables.join(", ")}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
