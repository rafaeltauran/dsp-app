// components/MaritimeZones.tsx
'use client';

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

interface MaritimeLayer {
  url: string;
  name: string;
  style: L.PathOptions;
}

export default function MaritimeZones() {
  const map = useMap();

  const maritimeLayers: MaritimeLayer[] = [
    {
      url: "/data/eez_simple.geojson",
      name: "EEZ (200NM)",
      style: {
        color: "#0066ff",
        weight: 1,  // Reduced from 2
        opacity: 0.7
      }
    },
    {
      url: "/data/24NM_simple.geojson",
      name: "Contiguous Zone (24NM)",
      style: {
        color: "#ff9900",
        weight: 1,  // Reduced from 1.5
        dashArray: "5,5",
        opacity: 0.7
      }
    },
    {
      url: "/data/12NM_simple.geojson",
      name: "Territorial Waters (12NM)",
      style: {
        color: "#00cc66",
        weight: 1,  // Reduced from 1.5
        dashArray: "3,3",
        opacity: 0.7
      }
    }
  ];

  useEffect(() => {
    if (!map) return;

    const layerGroup = L.layerGroup().addTo(map);

    maritimeLayers.forEach((layerConfig) => {
      fetch(layerConfig.url)
        .then((res) => res.json())
        .then((data) => {
          L.geoJSON(data, {
            style: layerConfig.style,
            interactive: false,  // ← Disable mouse events
            pmIgnore: true       // ← If using leaflet.pm
          }).addTo(layerGroup);
        });
    });

    return () => {
      layerGroup.remove();
    };
  }, [map]);

  return null;
}