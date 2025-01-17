"use client";

import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Tooltip,
} from "react-leaflet";
import type { LatLngTuple } from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

// Type definitions
export interface CableLine {
  id: string;
  name: string;             // E.g., "London - New York"
  coordinates: LatLngTuple[]; // [ [lat, lng], [lat, lng] ]
  description: string;
}

interface MapProps {
  lines: CableLine[];
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
      {/* Render polylines */}
      {lines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.coordinates}
          pathOptions={{ color: "blue", weight: 3 }}
        >
          <Tooltip sticky>{line.description}</Tooltip>
        </Polyline>
      ))}
    </MapContainer>
  );
}
