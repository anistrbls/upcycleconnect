"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

const MARKER_ICON = {
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
};

const LOADING_STYLE = {
  height: "400px",
  background: "#f0f0f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "24px",
};

export default function DepositMap({ points = [], onPointClick }) {
  const [ready, setReady] = useState(false);
  const [mapParts, setMapParts] = useState(null);
  const [leafletLib, setLeafletLib] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([import("leaflet"), import("react-leaflet")])
      .then(([leafletMod, reactLeafletMod]) => {
        if (!active) return;
        const L = leafletMod.default ?? leafletMod;
        setLeafletLib(L);
        setMapParts({
          MapContainer: reactLeafletMod.MapContainer,
          TileLayer: reactLeafletMod.TileLayer,
          Marker: reactLeafletMod.Marker,
          Popup: reactLeafletMod.Popup,
        });
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const markerIcon = useMemo(() => {
    if (!leafletLib) return null;
    return leafletLib.icon(MARKER_ICON);
  }, [leafletLib]);

  const safePoints = Array.isArray(points) ? points : [];

  const center = useMemo(() => {
    const first = safePoints.find(
      (p) => p?.latitude != null && p?.longitude != null && !Number.isNaN(Number(p.latitude)) && !Number.isNaN(Number(p.longitude)),
    );
    if (first) return [Number(first.latitude), Number(first.longitude)];
    return [48.8566, 2.3522];
  }, [safePoints]);

  if (!ready || !mapParts || !markerIcon) {
    return <div style={LOADING_STYLE}>Chargement de la carte…</div>;
  }

  const { MapContainer, TileLayer, Marker, Popup } = mapParts;

  return (
    <div
      style={{
        height: "400px",
        width: "100%",
        borderRadius: "24px",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      }}
    >
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {safePoints.map((point) => {
          const usagePercent =
            point.total_capacity > 0 ? Math.round((point.current_count / point.total_capacity) * 100) : 0;
          const statusLabel = point.status ? String(point.status).toUpperCase() : "—";

          return (
            <Marker
              key={point.id}
              position={[Number(point.latitude) || 0, Number(point.longitude) || 0]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onPointClick?.(point),
              }}
            >
              <Popup>
                <div style={{ padding: "5px", width: "190px" }}>
                  {Array.isArray(point.photos) && point.photos[0] && (
                    <img
                      src={point.photos[0]}
                      alt={point.name}
                      style={{
                        width: "100%",
                        height: "96px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        marginBottom: "0.65rem",
                        display: "block",
                      }}
                    />
                  )}
                  <strong style={{ fontSize: "1rem", lineHeight: 1.3, display: "block" }}>{point.name}</strong>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>{point.address}</span>
                  <div
                    style={{
                      marginTop: "0.65rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color:
                        point.status === "sature" ? "#ef4444" : point.status === "maintenance" ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    {statusLabel}
                  </div>
                  <div style={{ marginTop: "0.45rem", fontSize: "0.8rem", color: "#233b3d", fontWeight: 600 }}>
                    Occupation : {point.current_count || 0}/{point.total_capacity || 0} objets ({usagePercent}%)
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
