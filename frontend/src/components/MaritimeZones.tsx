// components/MaritimeZones.tsx
'use client';

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

interface MaritimeZonesProps {
  url: string;
}

export default function MaritimeZones({ url }: MaritimeZonesProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const maritimeLayer = L.geoJSON(data, {
          // Add this filter to exclude "Straight baseline" boundaries
          filter: (feature) => {
            return feature?.properties?.LINE_TYPE !== "Straight baseline";
          },
          style: (feature) => {
            const lineType = feature?.properties?.LINE_TYPE;
            return {
              color: lineType === 'Treaty' ? '#0066ff' : '#ff4444',
              weight: 2,
              dashArray: lineType === 'Unsettled' ? '5,5' : undefined,
              opacity: 0.7
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties;
            if (props) {
              const popupContent = `
                <div style="font-size: 14px">
                  <b>${props.LINE_NAME}</b><br>
                  <em>${props.LINE_TYPE}</em><br>
                  Between: ${props.TERRITORY1} & ${props.TERRITORY2}<br>
                  Length: ${props.LENGTH_KM} km<br>
                  ${props.SOURCE1 ? `<a href="${props.URL1}" target="_blank">Source</a>` : ''}
                </div>
              `;
              layer.bindPopup(popupContent);
            }
          }
        }).addTo(map);

        const overlayMaps = {
          "Maritime Boundaries": maritimeLayer
        };
        L.control.layers(null, overlayMaps).addTo(map);

        return () => {
          map.removeLayer(maritimeLayer);
        };
      });
  }, [map, url]);

  return null;
}