"use client";

import { useEffect, useState, useCallback } from "react";
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

/** Cable line definition */
export interface CableLine {
  id: string;
  systemName: string;
  cableOwner?: string;
  coordinates: [number, number][]; // e.g. [[lat, lng], [lat, lng], ...]
  segmentNames?: string[];
}

/** Simple structure for boundary line segments. Each segment is two lat-lng points. */
interface BoundarySegment {
  layerName: string;              // e.g. "EEZ (200NM)"
  props?: Record<string, any>;    // optional metadata from geoJSON
  coordinates: [number, number][]; // [[lat1, lng1], [lat2, lng2]]
}

/** Intersection can be cable-cable or cable-boundary. */
interface Intersection {
  latlng: LatLngExpression;
  cables: string[]; // system names
  boundary?: {
    layerName: string;
    props?: Record<string, any>;
  };
}

interface MapProps {
  lines: CableLine[];
}

/**
 * Main MapDashboard component. 
 * - Fetches boundary data 
 * - Displays cables 
 * - Detects cable-cable & cable-boundary intersections 
 * - Renders intersection markers 
 * - Shows crossing info in cable popups
 */
export default function MapDashboard({ lines }: MapProps) {
  /** All boundary line segments for intersection checks */
  const [boundarySegments, setBoundarySegments] = useState<BoundarySegment[]>([]);

  /** Intersection markers */
  const [intersections, setIntersections] = useState<Intersection[]>([]);

  /** Each cable: which cables & boundaries it crosses */
  const [cableCrossInfo, setCableCrossInfo] = useState<{
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  }>({});

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
      maxZoom={8}
      minZoom={2}
      preferCanvas
    >
      {/* Base tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Loads boundaries & extracts line segments */}
      <LoadBoundaries onSegments={(segments) => setBoundarySegments(segments)} />

      {/* Render cable polylines & popups showing cross info */}
      {lines.map((line) => {
        const crossData =
          cableCrossInfo[line.id] || {
            cablesCrossed: new Set<string>(),
            boundariesCrossed: new Set<string>(),
          };

        return (
          <Polyline
            key={line.id}
            positions={line.coordinates}
            pathOptions={{ color: "blue", weight: 3 }}
          >
            {/* Hover tooltip */}
            <Tooltip sticky>
              <div>
                <strong>{line.systemName}</strong>
                {line.cableOwner && <div>Owner: {line.cableOwner}</div>}
              </div>
            </Tooltip>

            {/* Click popup */}
            <Popup>
              <div style={{ minWidth: "200px" }}>
                <h4>{line.systemName}</h4>
                {line.cableOwner && <p>Owner: {line.cableOwner}</p>}

                <hr />
                <strong>Cables Crossed:</strong>
                {crossData.cablesCrossed.size === 0 ? (
                  <div>None</div>
                ) : (
                  <ul>
                    {Array.from(crossData.cablesCrossed).map((cname) => (
                      <li key={cname}>{cname}</li>
                    ))}
                  </ul>
                )}

                <strong>Boundaries Crossed:</strong>
                {crossData.boundariesCrossed.size === 0 ? (
                  <div>None</div>
                ) : (
                  <ul>
                    {Array.from(crossData.boundariesCrossed).map((bname) => (
                      <li key={bname}>{bname}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Intersection logic sub-component */}
      <IntersectionLogic
        lines={lines}
        boundarySegments={boundarySegments}
        intersections={intersections}
        cableCrossInfo={cableCrossInfo}
        onUpdate={(newIpts, newCross) => {
          setIntersections(newIpts);
          setCableCrossInfo(newCross);
        }}
      />

      {/* Intersection markers */}
      {intersections.map((ipt, idx) => (
        <Marker key={idx} position={ipt.latlng}>
          <Popup>
            <strong>Intersection</strong>
            <div style={{ marginTop: "0.5rem" }}>
              {ipt.cables.join(", ")}
              {ipt.boundary && (
                <>
                  <br />
                  <em>Boundary:</em> {ipt.boundary.layerName}
                  {ipt.boundary.props?.LINE_NAME && (
                    <>
                      <br />
                      ({ipt.boundary.props.LINE_NAME})
                    </>
                  )}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** 
 * LoadBoundaries sub-component: 
 * - Fetches the 3 maritime boundary geojson files
 * - Adds them to the map visually
 * - Extracts line segments in 'onSegments' for intersection checks
 */
function LoadBoundaries({
  onSegments,
}: {
  onSegments: (segments: BoundarySegment[]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const maritimeLayers = [
      {
        url: "/data/eez_simple.geojson",
        name: "EEZ (200NM)",
        style: { color: "#0066ff", weight: 1, opacity: 0.7 },
        interactive: true,
      },
      {
        url: "/data/24NM_simple.geojson",
        name: "Contiguous Zone (24NM)",
        style: { color: "#ff9900", weight: 1, dashArray: "5,5", opacity: 0.7 },
        interactive: false,
      },
      {
        url: "/data/12NM_simple.geojson",
        name: "Territorial Waters (12NM)",
        style: { color: "#00cc66", weight: 1, dashArray: "3,3", opacity: 0.7 },
        interactive: false,
      },
    ];

    const layerControls: Record<string, L.Layer> = {};
    const allLayers: L.Layer[] = [];
    const boundarySegments: BoundarySegment[] = [];

    maritimeLayers.forEach((layerConfig) => {
      fetch(layerConfig.url)
        .then((res) => res.json())
        .then((data) => {
          const geoJsonLayer = L.geoJSON(data, {
            style: layerConfig.style,
            interactive: layerConfig.interactive,
            onEachFeature: layerConfig.interactive
              ? (feature, layer) => {
                  const props = feature.properties;
                  if (props) {
                    const popupContent = `
                      <div style="font-size: 14px">
                        <b>${props.LINE_NAME || layerConfig.name}</b><br>
                        ${
                          props.TERRITORY1
                            ? `Between: ${props.TERRITORY1} & ${props.TERRITORY2}<br>`
                            : ""
                        }
                        ${
                          props.LENGTH_KM
                            ? `Length: ${props.LENGTH_KM} km<br>`
                            : ""
                        }
                        ${
                          props.SOURCE1
                            ? `<a href="${props.URL1}" target="_blank">Source</a>`
                            : ""
                        }
                      </div>
                    `;
                    layer.bindPopup(popupContent);
                  }
                }
              : undefined,
          });

          // Convert each feature into line segments
          geoJsonLayer.eachLayer((lyr) => {
            if (lyr instanceof L.Polyline) {
              const latlngs = lyr.getLatLngs();
              const flattened = flattenLatLngs(latlngs);

              for (let i = 0; i < flattened.length - 1; i++) {
                boundarySegments.push({
                  layerName: layerConfig.name,
                  props: lyr.feature?.properties || {},
                  coordinates: [
                    [flattened[i].lat, flattened[i].lng],
                    [flattened[i + 1].lat, flattened[i + 1].lng],
                  ],
                });
              }
            }
          });

          layerControls[layerConfig.name] = geoJsonLayer;
          allLayers.push(geoJsonLayer);
          geoJsonLayer.addTo(map);
        })
        .catch((err) => {
          console.error("Error loading boundary:", layerConfig.url, err);
        });
    });

    // naive approach: call onSegments after some delay
    // or do a Promise.all approach in production
    const timer = setTimeout(() => {
      onSegments(boundarySegments);
    }, 3000);

    // add layer control
    const layerControl = L.control.layers(null, layerControls, {
      collapsed: false,
      position: "topright",
    }).addTo(map);

    return () => {
      clearTimeout(timer);
      allLayers.forEach((lyr) => map.removeLayer(lyr));
      map.removeControl(layerControl);
    };
  }, [map, onSegments]);

  return null;
}

/** Flatten lat-lng arrays if multi-geometry. */
function flattenLatLngs(latlngs: any): L.LatLng[] {
  if (!Array.isArray(latlngs)) return [];
  if (latlngs.length === 0) return [];

  if (Array.isArray(latlngs[0])) {
    return latlngs.flatMap((inner: any) => flattenLatLngs(inner));
  }
  return latlngs;
}

/** 
 * IntersectionLogic sub-component:
 * - Checks cable-cable & cable-boundary intersections
 * - Calls onUpdate if new data changes
 */
interface IntersectionLogicProps {
  lines: CableLine[];
  boundarySegments: BoundarySegment[];
  intersections: Intersection[];
  cableCrossInfo: {
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  };
  onUpdate: (
    newIpts: Intersection[],
    newCross: {
      [cableId: string]: {
        cablesCrossed: Set<string>;
        boundariesCrossed: Set<string>;
      };
    }
  ) => void;
}

function IntersectionLogic({
  lines,
  boundarySegments,
  intersections,
  cableCrossInfo,
  onUpdate,
}: IntersectionLogicProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || lines.length === 0) {
      onUpdate([], {});
      return;
    }

    const { newIpts, newCross } = computeIntersections(map, lines, boundarySegments, cableCrossInfo);

    // Compare old/new data to avoid infinite loops
    if (!isSameData(newIpts, intersections, newCross, cableCrossInfo)) {
      onUpdate(newIpts, newCross);
    }
  }, [map, lines, boundarySegments, intersections, cableCrossInfo, onUpdate]);

  return null;
}

/** Actually compute cable-cable & cable-boundary intersections. */
function computeIntersections(
  map: L.Map,
  lines: CableLine[],
  boundarySegments: BoundarySegment[],
  currentCrossInfo: {
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  }
) {
  // Clone or init cross info
  const newCross: {
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  } = {};

  lines.forEach((l) => {
    newCross[l.id] = {
      cablesCrossed: new Set(currentCrossInfo[l.id]?.cablesCrossed || []),
      boundariesCrossed: new Set(currentCrossInfo[l.id]?.boundariesCrossed || []),
    };
  });

  const newIpts: Intersection[] = [];

  // Cable-cable intersection
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

          const ipt = lineIntersection2D(pxA1, pxA2, pxB1, pxB2);
          if (ipt) {
            addIntersection(map, newIpts, ipt, [lineA.systemName, lineB.systemName]);
            newCross[lineA.id].cablesCrossed.add(lineB.systemName);
            newCross[lineB.id].cablesCrossed.add(lineA.systemName);
          }
        }
      }
    }
  }

  // Cable-boundary intersection
  lines.forEach((line) => {
    for (let a = 0; a < line.coordinates.length - 1; a++) {
      const pxC1 = map.project(L.latLng(line.coordinates[a]));
      const pxC2 = map.project(L.latLng(line.coordinates[a + 1]));

      boundarySegments.forEach((bs) => {
        if (bs.coordinates.length !== 2) return;
        const [b1, b2] = bs.coordinates;
        const pxB1 = map.project(L.latLng(b1));
        const pxB2 = map.project(L.latLng(b2));

        const ipt = lineIntersection2D(pxC1, pxC2, pxB1, pxB2);
        if (ipt) {
          addIntersection(map, newIpts, ipt, [line.systemName], {
            layerName: bs.layerName,
            props: bs.props,
          });
          newCross[line.id].boundariesCrossed.add(bs.layerName);
        }
      });
    }
  });

  return { newIpts, newCross };
}

/** 
 * Merge or add new intersection at pixel 'iptPx'. 
 * If boundary is provided, attach it to the intersection. 
 */
function addIntersection(
  map: L.Map,
  newIpts: Intersection[],
  iptPx: L.Point,
  cables: string[],
  boundary?: { layerName: string; props?: Record<string, any> }
) {
  const latlng = map.unproject(iptPx);
  const existing = newIpts.find((x) => map.distance(x.latlng, latlng) < 0.0001);
  if (existing) {
    // Merge cables
    cables.forEach((c) => {
      if (!existing.cables.includes(c)) existing.cables.push(c);
    });
    // Overwrite boundary if found. 
    // If you want multiple boundaries in the same intersection, you'd store an array.
    if (boundary) existing.boundary = boundary;
  } else {
    newIpts.push({
      latlng,
      cables: [...cables],
      boundary,
    });
  }
}

/** Check if two line segments in pixel space intersect */
function lineIntersection2D(
  p1: L.Point,
  p2: L.Point,
  p3: L.Point,
  p4: L.Point
): L.Point | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (denom === 0) return null;

  const t =
    ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  const u =
    ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const ix = p1.x + t * (p2.x - p1.x);
    const iy = p1.y + t * (p2.y - p1.y);
    return new L.Point(ix, iy);
  }
  return null;
}

/** Compare old/new intersection data to avoid infinite loops */
function isSameData(
  newIpts: Intersection[],
  oldIpts: Intersection[],
  newCross: {
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  },
  oldCross: {
    [cableId: string]: {
      cablesCrossed: Set<string>;
      boundariesCrossed: Set<string>;
    };
  }
): boolean {
  // Compare intersection arrays length
  if (newIpts.length !== oldIpts.length) return false;

  for (let i = 0; i < newIpts.length; i++) {
    const n = newIpts[i];
    const o = oldIpts[i];
    if (n.latlng.toString() !== o.latlng.toString()) return false;
    if (n.cables.length !== o.cables.length) return false;
  }

  // Compare cableCrossInfo
  const newIds = Object.keys(newCross);
  const oldIds = Object.keys(oldCross);
  if (newIds.length !== oldIds.length) return false;

  for (const cid of newIds) {
    if (!oldCross[cid]) return false;
    const nCab = newCross[cid].cablesCrossed;
    const oCab = oldCross[cid].cablesCrossed;
    if (nCab.size !== oCab.size) return false;
    for (const c of nCab) if (!oCab.has(c)) return false;

    const nB = newCross[cid].boundariesCrossed;
    const oB = oldCross[cid].boundariesCrossed;
    if (nB.size !== oB.size) return false;
    for (const b of nB) if (!oB.has(b)) return false;
  }

  return true;
}
