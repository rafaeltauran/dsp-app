// components/MaritimeZones.tsx
'use client';

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

interface MaritimeLayer {
  url: string;
  name: string;
  style: L.PathOptions;
  interactive: boolean;
}

export default function MaritimeZones() {
  const map = useMap();

  const maritimeLayers: MaritimeLayer[] = [
    {
      url: "/data/eez_simple.geojson",
      name: "EEZ (200NM)",
      style: {
        color: "#0066ff",
        weight: 1,
        opacity: 0.7
      },
      interactive: true
    },
    {
      url: "/data/24NM_simple.geojson",
      name: "Contiguous Zone (24NM)",
      style: {
        color: "#ff9900",
        weight: 1,
        dashArray: "5,5",
        opacity: 0.7
      },
      interactive: false
    },
    {
      url: "/data/12NM_simple.geojson",
      name: "Territorial Waters (12NM)",
      style: {
        color: "#00cc66",
        weight: 1,
        dashArray: "3,3",
        opacity: 0.7
      },
      interactive: false
    }
  ];

  useEffect(() => {
    if (!map) return;

    const layerControls: Record<string, L.Layer> = {};
    const allLayers: L.Layer[] = [];

    maritimeLayers.forEach((layerConfig) => {
      fetch(layerConfig.url)
        .then((res) => res.json())
        .then((data) => {
          const geoJsonLayer = L.geoJSON(data, {
            style: layerConfig.style,
            interactive: layerConfig.interactive,
            onEachFeature: layerConfig.interactive ? (feature, layer) => {
              const props = feature.properties;
              if (props) {
                const popupContent = `
                  <div style="font-size: 14px">
                    <b>${props.LINE_NAME || 'EEZ Boundary'}</b><br>
                    ${props.TERRITORY1 ? `Between: ${props.TERRITORY1} & ${props.TERRITORY2}<br>` : ''}
                    ${props.LENGTH_KM ? `Length: ${props.LENGTH_KM} km<br>` : ''}
                    ${props.SOURCE1 ? `<a href="${props.URL1}" target="_blank">Source</a>` : ''}
                  </div>
                `;
                layer.bindPopup(popupContent);
              }
            } : undefined
          });
          
          layerControls[layerConfig.name] = geoJsonLayer;
          allLayers.push(geoJsonLayer);
          geoJsonLayer.addTo(map);
        });
    });

    // // Add layer control
    // const layerControl = L.control.layers(null, layerControls, {
    //   collapsed: false,
    //   position: 'topright'
    // }).addTo(map);

    const layerControl = L.control.layers({}, layerControls, {
      collapsed: false,
      position: 'topright'
    }).addTo(map);

    return () => {
      allLayers.forEach(layer => map.removeLayer(layer));
      map.removeControl(layerControl);
    };
  }, [maritimeLayers, map]);

  return null;
}