"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

const POLYGON_STYLE: L.PathOptions = {
  color: "#ffffff",
  weight: 2,
  fillColor: "#06642b",
  fillOpacity: 0.55,
};

/** Satellite imagery — agents trace real field boundaries, so street tiles won't do. */
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function toLatLngs(layer: L.Polygon): LatLng[] {
  const rings = layer.getLatLngs() as L.LatLng[][] | L.LatLng[];
  const ring = (Array.isArray(rings[0]) ? rings[0] : rings) as L.LatLng[];
  return ring.map((point) => [point.lat, point.lng] as LatLng);
}

/**
 * Owns the single editable plot polygon. Drawing, editing and dragging all
 * report back through `onChange`; the parent turns the coordinates into
 * hectares with Turf.
 */
function BoundaryEditor({
  boundary,
  onChange,
  readOnly,
}: {
  boundary: LatLng[];
  onChange?: (boundary: LatLng[]) => void;
  readOnly: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Draw the saved boundary once the map exists, and frame it.
  useEffect(() => {
    if (boundary.length < 3) return;
    const layer = L.polygon(boundary, POLYGON_STYLE).addTo(map);
    layerRef.current = layer;
    map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 18 });

    if (!readOnly) {
      layer.on("pm:edit", () => onChangeRef.current?.(toLatLngs(layer)));
      layer.on("pm:dragend", () => onChangeRef.current?.(toLatLngs(layer)));
    }

    return () => {
      layer.remove();
      layerRef.current = null;
    };
    // Boundary is intentionally read once: later updates come from this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, readOnly]);

  // Lets the parent clear the shape (the form's "Clear boundary" button).
  useEffect(() => {
    if (boundary.length === 0 && layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
  }, [boundary]);

  // Drawing toolbar.
  useEffect(() => {
    if (readOnly) return;

    map.pm.setLang("en");
    map.pm.addControls({
      position: "topright",
      drawMarker: false,
      drawPolyline: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      drawRectangle: true,
      drawPolygon: true,
      cutPolygon: false,
      rotateMode: false,
      editMode: true,
      dragMode: true,
      removalMode: true,
    });
    map.pm.setPathOptions(POLYGON_STYLE);

    const handleCreate = (event: { layer: L.Layer }) => {
      const layer = event.layer as L.Polygon;
      // Only one boundary per plot: the new shape replaces the old one.
      layerRef.current?.remove();
      layerRef.current = layer;
      layer.setStyle(POLYGON_STYLE);
      layer.on("pm:edit", () => onChangeRef.current?.(toLatLngs(layer)));
      layer.on("pm:dragend", () => onChangeRef.current?.(toLatLngs(layer)));
      onChangeRef.current?.(toLatLngs(layer));
    };

    const handleRemove = () => {
      layerRef.current = null;
      onChangeRef.current?.([]);
    };

    map.on("pm:create", handleCreate);
    map.on("pm:remove", handleRemove);

    return () => {
      map.off("pm:create", handleCreate);
      map.off("pm:remove", handleRemove);
      map.pm.removeControls();
    };
  }, [map, readOnly]);

  return null;
}

/** Small "find me" control — agents usually stand on the plot they are tracing. */
function LocateControl() {
  const map = useMap();

  useEffect(() => {
    const control = new L.Control({ position: "topleft" });
    control.onAdd = () => {
      const button = L.DomUtil.create("button", "leaflet-bar");
      button.type = "button";
      button.title = "Go to my location";
      button.setAttribute("aria-label", "Go to my location");
      button.style.cssText =
        "width:34px;height:34px;background:#fff;border:none;cursor:pointer;font-size:16px;line-height:34px;";
      button.innerHTML = "&#9678;";
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        map.locate({ setView: true, maxZoom: 18 });
      });
      return button;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  return null;
}

export default function PlotMap({
  boundary,
  onChange,
  readOnly = false,
  className,
}: {
  boundary: LatLng[];
  onChange?: (boundary: LatLng[]) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const center = boundary.length >= 3 ? boundary[0] : DEFAULT_MAP_CENTER;

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={!readOnly}
        zoomControl={!readOnly}
        attributionControl
        className="size-full"
      >
        <TileLayer
          url={ESRI_IMAGERY}
          maxZoom={21}
          maxNativeZoom={19}
          attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        />
        <TileLayer url={ESRI_LABELS} maxZoom={21} maxNativeZoom={19} />
        <BoundaryEditor boundary={boundary} onChange={onChange} readOnly={readOnly} />
        {readOnly ? null : <LocateControl />}
      </MapContainer>
    </div>
  );
}
