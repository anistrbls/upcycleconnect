"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

export default function DepositMap({ points, onPointClick }) {
  const [L, setL] = useState(null);

  useEffect(() => {
    // Import Leaflet on the client side
    import("leaflet").then((leaflet) => {
      setL(leaflet);
      // Fix default icon issue in Leaflet with Webpack/Next.js
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);

  if (!L) return <div style={{ height: "400px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "24px" }}>Chargement de la carte...</div>;

  const center = points.length > 0 
    ? [points[0].latitude, points[0].longitude] 
    : [48.8566, 2.3522]; // Paris default

  return (
    <div style={{ height: "400px", width: "100%", borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => {
          const usagePercent = point.total_capacity > 0
            ? Math.round((point.current_count / point.total_capacity) * 100)
            : 0;

          return (
            <Marker 
              key={point.id} 
              position={[point.latitude || 0, point.longitude || 0]}
              eventHandlers={{
                click: () => onPointClick && onPointClick(point),
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
                  <strong style={{ fontSize: "1rem", lineHeight: "1.3", display: "block" }}>{point.name}</strong>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>{point.address}</span>
                  <div style={{ marginTop: "0.65rem", fontSize: "0.8rem", fontWeight: "700", color: point.status === 'sature' ? '#ef4444' : point.status === 'maintenance' ? '#f59e0b' : '#22c55e' }}>
                    {point.status.toUpperCase()}
                  </div>
                  <div style={{ marginTop: "0.45rem", fontSize: "0.8rem", color: "#233b3d", fontWeight: "600" }}>
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
