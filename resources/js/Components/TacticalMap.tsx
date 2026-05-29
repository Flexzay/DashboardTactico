import { useState, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
} from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import TacticalLineRenderer from "./TacticalLineRenderer";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

type UnitType =
    | "amigo" | "enemigo" | "neutral" | "desconocido"
    | "infanteria" | "mortero" | "ametralladora" | "francotirador"
    | "medico" | "vehiculo" | "helicoptero" | "dron" | "base" | "extraccion"
    | "equipo" | "escuadra" | "seccion" | "peloton" | "pro"
    | "punto_ruta"
    | "infiltracion" | "emboscada" | "apoyo_fuego" | "repliegue" | "atacar_fuego" | "bloqueo";

type LineType = "continua" | "discontinua";

interface TacticalLink {
    from: number;
    to: number;
    lineType: LineType;
}

interface TacticalPoint {
    id: number;
    operation_id: number;
    type: UnitType;
    lat: number;
    lng: number;
    rotation?: number;
}

interface Operation {
    id: number;
    name: string;
    points: TacticalPoint[];
    links?: TacticalLink[];
}

// ─────────────────────────────────────────────
// GENERADORES DE ICONOS PARA EL MAPA 
// ─────────────────────────────────────────────

function buildSvgIcon(svgContent: string, rotation: number = 0): L.DivIcon {
    const html = `
        <div style="transform: rotate(${rotation}deg); transform-origin: center; transition: transform 0.2s ease; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">${svgContent}</svg>
        </div>`;
    return new L.DivIcon({
        html,
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
    });
}

function buildImageIcon(url: string, rotation: number = 0): L.DivIcon {
    const size = 90;
    const anchor = size / 2;
    return new L.DivIcon({
        html: `
        <div style="transform: rotate(${rotation}deg); transform-origin: center; transition: transform 0.2s ease; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>`,
        className: "custom-png-icon",
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
        popupAnchor: [0, -anchor],
    });
}

const ICON_RAW_DATA: Record<UnitType, { type: 'img' | 'svg', content: string }> = {
    infiltracion: { type: 'img', content: "/icons/01.png" },
    emboscada: { type: 'img', content: "/icons/02.png" },
    apoyo_fuego: { type: 'img', content: "/icons/03.png" },
    repliegue: { type: 'img', content: "/icons/04.png" },
    atacar_fuego: { type: 'img', content: "/icons/05.png" },
    bloqueo: { type: 'img', content: "/icons/06.png" },

    amigo: { type: 'svg', content: `<rect x="4" y="11" width="30" height="16" rx="1.5" stroke="#1a6f35" stroke-width="2" fill="#d4edda"/>` },
    enemigo: { type: 'svg', content: `<polygon points="19,3 35,19 19,35 3,19" stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/>` },
    neutral: { type: 'svg', content: `<rect x="5" y="5" width="28" height="28" rx="1.5" stroke="#92400e" stroke-width="2" fill="#fef3c7"/>` },
    desconocido: { type: 'svg', content: `<line x1="19" y1="4" x2="19" y2="34" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/><line x1="4" y1="19" x2="34" y2="19" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/>` },

    infanteria: { type: 'svg', content: `<line x1="6" y1="6" x2="32" y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/><line x1="32" y1="6" x2="6" y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/>` },
    mortero: { type: 'svg', content: `<circle cx="19" cy="26" r="8" stroke="#374151" stroke-width="2" fill="#e5e7eb"/><line x1="19" y1="18" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="13" y1="12" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="25" y1="12" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>` },
    ametralladora: { type: 'svg', content: `<line x1="6" y1="30" x2="32" y2="30" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="19" y1="30" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="13" y1="14" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="25" y1="14" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>` },
    francotirador: { type: 'svg', content: `<circle cx="19" cy="19" r="9" stroke="#374151" stroke-width="1.8" fill="none"/><line x1="19" y1="4" x2="19" y2="11" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="27" x2="19" y2="34" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="4" y1="19" x2="11" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="27" y1="19" x2="34" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="19" r="2.5" fill="#374151"/>` },
    medico: { type: 'svg', content: `<rect x="4" y="11" width="30" height="16" rx="1.5" stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/><line x1="19" y1="14" x2="19" y2="24" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/><line x1="14" y1="19" x2="24" y2="19" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>` },
    vehiculo: { type: 'svg', content: `<rect x="3" y="13" width="32" height="14" rx="2" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/><rect x="6" y="8" width="14" height="7" rx="1" stroke="#374151" stroke-width="1.5" fill="#d1d5db"/><circle cx="10" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/><circle cx="28" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/>` },
    helicoptero: { type: 'svg', content: `<ellipse cx="19" cy="23" rx="8" ry="5" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/><line x1="4" y1="13" x2="34" y2="13" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/><line x1="19" y1="13" x2="19" y2="18" stroke="#374151" stroke-width="1.5"/><line x1="27" y1="22" x2="33" y2="30" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/><line x1="30" y1="28" x2="36" y2="28" stroke="#374151" stroke-width="2" stroke-linecap="round"/>` },
    dron: { type: 'svg', content: `<circle cx="19" cy="19" r="4" stroke="#374151" stroke-width="1.5" fill="#e5e7eb"/><circle cx="7" cy="7" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="31" cy="7" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="7" cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="31" cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><line x1="10" y1="10" x2="16" y2="16" stroke="#374151" stroke-width="1.2"/><line x1="28" y1="10" x2="22" y2="16" stroke="#374151" stroke-width="1.2"/><line x1="10" y1="28" x2="16" y2="22" stroke="#374151" stroke-width="1.2"/><line x1="28" y1="28" x2="22" y2="22" stroke="#374151" stroke-width="1.2"/>` },
    base: { type: 'svg', content: `<rect x="5" y="18" width="28" height="16" rx="1" stroke="#1a6f35" stroke-width="1.8" fill="#d4edda"/><polygon points="19,4 33,18 5,18" stroke="#1a6f35" stroke-width="1.8" fill="#a7d7b3" stroke-linejoin="round"/><rect x="14" y="26" width="10" height="8" rx="0.5" stroke="#1a6f35" stroke-width="1.3" fill="#86c995"/>` },
    extraccion: { type: 'svg', content: `<circle cx="19" cy="19" r="13" stroke="#7c3aed" stroke-width="2" fill="#ede9fe" stroke-dasharray="4 3"/><line x1="19" y1="26" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><line x1="13" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><line x1="25" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>` },
    equipo: { type: 'svg', content: `<circle cx="19" cy="19" r="12" stroke="#374151" stroke-width="2" fill="#f3f4f6"/><line x1="11" y1="27" x2="27" y2="11" stroke="#374151" stroke-width="2" stroke-linecap="round"/>` },
    escuadra: { type: 'svg', content: `<circle cx="19" cy="19" r="10" fill="#1f2937"/>` },
    seccion: { type: 'svg', content: `<circle cx="12" cy="19" r="8" fill="#1f2937"/><circle cx="26" cy="19" r="8" fill="#1f2937"/>` },
    peloton: { type: 'svg', content: `<circle cx="7" cy="19" r="6" fill="#1f2937"/><circle cx="19" cy="19" r="6" fill="#1f2937"/><circle cx="31" cy="19" r="6" fill="#1f2937"/>` },
    pro: { type: 'svg', content: `<rect x="7" y="5" width="24" height="14" rx="1.5" stroke="#1e3a5f" stroke-width="2.2" fill="#dbeafe"/><polygon points="7,19 31,19 19,33" stroke="#1e3a5f" stroke-width="2.2" fill="#93c5fd" stroke-linejoin="round"/><text x="19" y="15" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#1e3a5f" font-family="sans-serif">PRO</text>` },
    punto_ruta: { type: 'svg', content: `<circle cx="19" cy="19" r="5" fill="#4b5563" stroke="#ffffff" stroke-width="2"/>` },
};

function getUnitIcon(type: UnitType, rotation: number = 0): L.DivIcon {
    const rawData = ICON_RAW_DATA[type];
    if (!rawData) return buildSvgIcon(`<circle cx="19" cy="19" r="6" fill="#4b5563"/>`, rotation);

    return rawData.type === 'img'
        ? buildImageIcon(rawData.content, rotation)
        : buildSvgIcon(rawData.content, rotation);
}

// ─────────────────────────────────────────────
// DEFINICIÓN DE UNIDADES PARA LA UI
// ─────────────────────────────────────────────

interface UnitDef {
    type: UnitType;
    label: string;
    group: string;
    svgPreview: string;
}

const svgWrap = (inner: string) => `<svg viewBox="0 0 38 38" width="100%" height="100%">${inner}</svg>`;
const imgPreview = (url: string) => `<img src="${url}" style="width:100%; height:100%; object-fit:contain;" />`;

const UNIT_DEFS: UnitDef[] = [
    { type: "punto_ruta", label: "Punto Ref.", group: "Herramientas", svgPreview: svgWrap(`<circle cx="19" cy="19" r="6" fill="#4b5563" stroke="#ffffff" stroke-width="2"/>`) },

    { type: "infiltracion", label: "Infiltrar", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/01.png") },
    { type: "emboscada", label: "Emboscar", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/02.png") },
    { type: "apoyo_fuego", label: "Apoyo Fuego", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/03.png") },
    { type: "repliegue", label: "Repliegue", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/04.png") },
    { type: "atacar_fuego", label: "Atacar Fuego", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/05.png") },
    { type: "bloqueo", label: "Bloquear", group: "Acciones Tácticas", svgPreview: imgPreview("/icons/06.png") },

    { type: "amigo", label: "Amigo", group: "Afiliación", svgPreview: svgWrap(`<rect x="4" y="11" width="30" height="16" rx="1.5" stroke="#1a6f35" stroke-width="2" fill="#d4edda"/>`) },
    { type: "enemigo", label: "Enemigo", group: "Afiliación", svgPreview: svgWrap(`<polygon points="19,3 35,19 19,35 3,19" stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/>`) },
    { type: "neutral", label: "Neutral", group: "Afiliación", svgPreview: svgWrap(`<rect x="5" y="5" width="28" height="28" rx="1.5" stroke="#92400e" stroke-width="2" fill="#fef3c7"/>`) },
    { type: "desconocido", label: "Desconoc.", group: "Afiliación", svgPreview: svgWrap(`<line x1="19" y1="4" x2="19" y2="34" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/><line x1="4" y1="19" x2="34" y2="19" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/>`) },

    { type: "infanteria", label: "Infantería", group: "Función", svgPreview: svgWrap(`<line x1="6" y1="6" x2="32" y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/><line x1="32" y1="6" x2="6" y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/>`) },
    { type: "mortero", label: "Mortero", group: "Función", svgPreview: svgWrap(`<circle cx="19" cy="26" r="8" stroke="#374151" stroke-width="2" fill="#e5e7eb"/><line x1="19" y1="18" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="13" y1="12" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="25" y1="12" x2="19" y2="6" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>`) },
    { type: "ametralladora", label: "Ametrall.", group: "Función", svgPreview: svgWrap(`<line x1="6" y1="30" x2="32" y2="30" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="19" y1="30" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="13" y1="14" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/><line x1="25" y1="14" x2="19" y2="8" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>`) },
    { type: "francotirador", label: "Francotir.", group: "Función", svgPreview: svgWrap(`<circle cx="19" cy="19" r="9" stroke="#374151" stroke-width="1.8" fill="none"/><line x1="19" y1="4" x2="19" y2="11" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="27" x2="19" y2="34" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="4" y1="19" x2="11" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="27" y1="19" x2="34" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="19" r="2.5" fill="#374151"/>`) },
    { type: "medico", label: "Médico", group: "Función", svgPreview: svgWrap(`<rect x="4" y="11" width="30" height="16" rx="1.5" stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/><line x1="19" y1="14" x2="19" y2="24" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/><line x1="14" y1="19" x2="24" y2="19" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>`) },
    { type: "vehiculo", label: "Vehículo", group: "Función", svgPreview: svgWrap(`<rect x="3" y="13" width="32" height="14" rx="2" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/><rect x="6" y="8" width="14" height="7" rx="1" stroke="#374151" stroke-width="1.5" fill="#d1d5db"/><circle cx="10" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/><circle cx="28" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/>`) },
    { type: "helicoptero", label: "Helicóp.", group: "Función", svgPreview: svgWrap(`<ellipse cx="19" cy="23" rx="8" ry="5" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/><line x1="4" y1="13" x2="34" y2="13" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/><line x1="19" y1="13" x2="19" y2="18" stroke="#374151" stroke-width="1.5"/><line x1="27" y1="22" x2="33" y2="30" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/><line x1="30" y1="28" x2="36" y2="28" stroke="#374151" stroke-width="2" stroke-linecap="round"/>`) },
    { type: "dron", label: "Dron", group: "Función", svgPreview: svgWrap(`<circle cx="19" cy="19" r="4" stroke="#374151" stroke-width="1.5" fill="#e5e7eb"/><circle cx="7" cy="7" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="31" cy="7" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="7" cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><circle cx="31" cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/><line x1="10" y1="10" x2="16" y2="16" stroke="#374151" stroke-width="1.2"/><line x1="28" y1="10" x2="22" y2="16" stroke="#374151" stroke-width="1.2"/><line x1="10" y1="28" x2="16" y2="22" stroke="#374151" stroke-width="1.2"/><line x1="28" y1="28" x2="22" y2="22" stroke="#374151" stroke-width="1.2"/>`) },
    { type: "base", label: "Base", group: "Función", svgPreview: svgWrap(`<rect x="5" y="18" width="28" height="16" rx="1" stroke="#1a6f35" stroke-width="1.8" fill="#d4edda"/><polygon points="19,4 33,18 5,18" stroke="#1a6f35" stroke-width="1.8" fill="#a7d7b3" stroke-linejoin="round"/><rect x="14" y="26" width="10" height="8" rx="0.5" stroke="#1a6f35" stroke-width="1.3" fill="#86c995"/>`) },
    { type: "extraccion", label: "Extracción", group: "Función", svgPreview: svgWrap(`<circle cx="19" cy="19" r="13" stroke="#7c3aed" stroke-width="2" fill="#ede9fe" stroke-dasharray="4 3"/><line x1="19" y1="26" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><line x1="13" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><line x1="25" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>`) },

    { type: "equipo", label: "Equipo", group: "Tamaño", svgPreview: svgWrap(`<circle cx="19" cy="19" r="12" stroke="#374151" stroke-width="2" fill="#f3f4f6"/><line x1="11" y1="27" x2="27" y2="11" stroke="#374151" stroke-width="2" stroke-linecap="round"/>`) },
    { type: "escuadra", label: "Escuadra", group: "Tamaño", svgPreview: svgWrap(`<circle cx="19" cy="19" r="10" fill="#1f2937"/>`) },
    { type: "seccion", label: "Sección", group: "Tamaño", svgPreview: svgWrap(`<circle cx="12" cy="19" r="8" fill="#1f2937"/><circle cx="26" cy="19" r="8" fill="#1f2937"/>`) },
    { type: "peloton", label: "Pelotón", group: "Tamaño", svgPreview: svgWrap(`<circle cx="7" cy="19" r="6" fill="#1f2937"/><circle cx="19" cy="19" r="6" fill="#1f2937"/><circle cx="31" cy="19" r="6" fill="#1f2937"/>`) },

    { type: "pro", label: "PRO", group: "PRO", svgPreview: svgWrap(`<rect x="7" y="5" width="24" height="14" rx="1.5" stroke="#1e3a5f" stroke-width="2.2" fill="#dbeafe"/><polygon points="7,19 31,19 19,33" stroke="#1e3a5f" stroke-width="2.2" fill="#93c5fd" stroke-linejoin="round"/><text x="19" y="15" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#1e3a5f" font-family="sans-serif">PRO</text>`) },
];

// ─────────────────────────────────────────────
// ESTILOS DE RUTAS TÁCTICAS
// ─────────────────────────────────────────────

interface LineStyle {
    color: string;
    label: string;
    previewSvg: string;
}

const LINE_STYLES: Record<LineType, LineStyle> = {
    continua: {
        color: "#374151", label: "Línea Continua",
        previewSvg: `<line x1="2" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <polygon points="30,10 38,14 30,18" fill="currentColor"/>`,
    },
    discontinua: {
        color: "#374151", label: "Línea Discontinua",
        previewSvg: `<line x1="2" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 4" stroke-linecap="round"/>
        <polygon points="30,10 38,14 30,18" fill="currentColor"/>`,
    },
};

// ─────────────────────────────────────────────
// CLICK HANDLER DEL MAPA
// ─────────────────────────────────────────────

function MapClickHandler({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onAddPoint(e.latlng.lat, e.latlng.lng) });
    return null;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function TacticalMap() {
    const [operations, setOperations]     = useState<Operation[]>([]);
    const [activeOpId, setActiveOpId]     = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<UnitType>("punto_ruta");
    const [selectedLine, setSelectedLine] = useState<LineType>("continua");
    const [newOpName, setNewOpName]       = useState("");
    const [linkingFrom, setLinkingFrom]   = useState<number | null>(null);

    useEffect(() => {
        axios.get("/operations").then((res) => {
            setOperations(res.data);
            if (res.data.length > 0) setActiveOpId(res.data[0].id);
        }).catch(err => console.log("Modo local (sin backend)", err));
    }, []);

    const handleCreateOperation = () => {
        if (!newOpName.trim()) return;
        axios.post("/operations", { name: newOpName }).then((res) => {
            setOperations([res.data, ...operations]);
            setActiveOpId(res.data.id);
            setNewOpName("");
        }).catch(err => {
            // Manejo de error básico / simulado para UI local
            const newOp: Operation = { id: Date.now(), name: newOpName, points: [], links: [] };
            setOperations([newOp, ...operations]);
            setActiveOpId(newOp.id);
            setNewOpName("");
        });
    };

    const handleDeleteOperation = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("¿Confirmas la eliminación de esta operación?")) return;
        axios.delete(`/operations/${id}`).then(() => {
            setOperations((ops) => ops.filter((op) => op.id !== id));
            if (activeOpId === id) setActiveOpId(null);
        }).catch(() => {
            setOperations((ops) => ops.filter((op) => op.id !== id));
            if (activeOpId === id) setActiveOpId(null);
        });
    };

    const handleAddPoint = (lat: number, lng: number) => {
        if (!activeOpId) return alert("Crea una operación primero.");
        axios.post("/tactical-points", { operation_id: activeOpId, type: selectedUnit, lat, lng })
            .then((res) => {
                setOperations((ops) =>
                    ops.map((op) =>
                        op.id === activeOpId ? { ...op, points: [...op.points, res.data] } : op,
                    ),
                );
            }).catch(() => {
                const newPoint: TacticalPoint = { id: Date.now(), operation_id: activeOpId, type: selectedUnit, lat, lng, rotation: 0 };
                setOperations((ops) =>
                    ops.map((op) =>
                        op.id === activeOpId ? { ...op, points: [...op.points, newPoint] } : op,
                    ),
                );
            });
    };

    const handleRemovePoint = (id: number) => {
        axios.delete(`/tactical-points/${id}`).then(() => {
            updatePointsAfterRemoval(id);
        }).catch(() => {
            updatePointsAfterRemoval(id);
        });
    };

    const updatePointsAfterRemoval = (id: number) => {
        setOperations((ops) =>
            ops.map((op) => {
                if (op.id !== activeOpId) return op;
                return {
                    ...op,
                    points: op.points.filter((p) => p.id !== id),
                    links: (op.links || []).filter((l) => l.from !== id && l.to !== id),
                };
            }),
        );
        if (linkingFrom === id) setLinkingFrom(null);
    };

    const handleMovePoint = (id: number, lat: number, lng: number) => {
        axios.put(`/tactical-points/${id}`, { lat, lng }).then(() => {
            updatePointPositionLocally(id, lat, lng);
        }).catch(() => updatePointPositionLocally(id, lat, lng));
    };

    const updatePointPositionLocally = (id: number, lat: number, lng: number) => {
        setOperations((ops) =>
            ops.map((op) =>
                op.id === activeOpId
                    ? { ...op, points: op.points.map((p) => p.id === id ? { ...p, lat, lng } : p) }
                    : op,
            ),
        );
    };

    const handleRotatePoint = (id: number, rotation: number) => {
        setOperations((ops) =>
            ops.map((op) =>
                op.id === activeOpId
                    ? { ...op, points: op.points.map((p) => p.id === id ? { ...p, rotation } : p) }
                    : op
            )
        );
        // Descomenta si deseas guardar la rotación en tu backend
        // axios.put(`/tactical-points/${id}`, { rotation });
    };

    const handleSaveLinks = (newLinks: TacticalLink[]) => {
        if (!activeOpId) return;
        axios.put(`/operations/${activeOpId}/links`, { links: newLinks }).then(() => {
            saveLinksLocally(newLinks);
        }).catch(() => saveLinksLocally(newLinks));
    };

    const saveLinksLocally = (newLinks: TacticalLink[]) => {
        setOperations((ops) =>
            ops.map((op) => op.id === activeOpId ? { ...op, links: newLinks } : op),
        );
        setLinkingFrom(null);
    };

    const handleCreateLink = (targetId: number) => {
        if (!linkingFrom || linkingFrom === targetId || !activeOperation) return;
        const currentLinks = activeOperation.links || [];
        handleSaveLinks([...currentLinks, { from: linkingFrom, to: targetId, lineType: selectedLine }]);
    };

    const handleClearLinks = () => {
        if (confirm("¿Borrar todas las rutas trazadas de esta operación?")) handleSaveLinks([]);
    };

    const activeOperation = operations.find((op) => op.id === activeOpId);
    const currentPoints   = activeOperation?.points ?? [];
    const currentLinks    = activeOperation?.links  ?? [];

    const orderOfGroups = ["Herramientas", "Acciones Tácticas", "Afiliación", "Función", "Tamaño", "PRO"];
    const groups = Array.from(new Set(UNIT_DEFS.map((u) => u.group)))
        .sort((a, b) => orderOfGroups.indexOf(a) - orderOfGroups.indexOf(b));

    return (
        <div className="flex gap-4 p-3 bg-gray-50 min-h-screen">
            {/* ── PANEL LATERAL ─────────────────────── */}
            <div
                className="flex flex-col gap-3 overflow-y-auto pb-4"
                style={{ width: "320px", minWidth: "320px", flexShrink: 0, maxHeight: "calc(100vh - 1.5rem)" }}
            >
                {/* Nueva Operación */}
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-2">
                        Nueva Operación
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded text-xs p-2 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none"
                            placeholder="Nombre clave..."
                            value={newOpName}
                            onChange={(e) => setNewOpName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateOperation()}
                        />
                        <button
                            onClick={handleCreateOperation}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 rounded text-sm transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Selector de Unidades y Acciones */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-3">
                        Despliegue Táctico
                    </p>
                    {groups.map((group) => (
                        <div key={group} className="mb-4">
                            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                                {group}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {UNIT_DEFS.filter((u) => u.group === group).map(({ type, label, svgPreview }) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedUnit(type)}
                                        title={label}
                                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border min-h-[85px] transition-all overflow-hidden
                                            ${selectedUnit === type
                                                ? "bg-blue-700 border-blue-800 text-white shadow-md scale-[1.02]"
                                                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-100"
                                            }`}
                                    >
                                        <div
                                            style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                            dangerouslySetInnerHTML={{ __html: svgPreview }}
                                        />
                                        <span className="text-[9px] font-bold tracking-wide text-center leading-tight uppercase mt-1">
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Selector de RUTAS */}
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-2">
                        Rutas de Movimiento
                    </p>
                    <div className="flex flex-col gap-1">
                        {(Object.entries(LINE_STYLES) as [LineType, LineStyle][]).map(([type, style]) => (
                            <button
                                key={type}
                                onClick={() => setSelectedLine(type as LineType)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] font-medium transition-all text-left ${
                                    selectedLine === type
                                        ? "border-blue-800 text-blue-100 bg-blue-900"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <svg
                                    width="40" height="28" viewBox="0 0 40 28"
                                    fill="none" className="flex-shrink-0"
                                    style={{ color: selectedLine === type ? "#bfdbfe" : style.color }}
                                    dangerouslySetInnerHTML={{ __html: style.previewSvg }}
                                />
                                {style.label}
                            </button>
                        ))}
                    </div>

                    {currentLinks.length > 0 && (
                        <button
                            onClick={handleClearLinks}
                            className="mt-2 w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
                        >
                            Borrar rutas ({currentLinks.length})
                        </button>
                    )}
                </div>

                {/* Historial de Operaciones */}
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-2">
                        Historial
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {operations.map((op) => (
                            <div key={op.id} className="flex gap-1">
                                <button
                                    onClick={() => { setActiveOpId(op.id); setLinkingFrom(null); }}
                                    className={`flex-1 text-left px-2.5 py-2 rounded text-[11px] font-semibold tracking-wide transition-colors ${
                                        activeOpId === op.id
                                            ? "bg-blue-700 text-white shadow-sm"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {op.name}
                                    <span className={`float-right px-1.5 py-0.5 rounded text-[10px] ${
                                        activeOpId === op.id ? "bg-blue-800 text-white" : "bg-gray-300 text-gray-700"
                                    }`}>
                                        {op.points.length}
                                    </span>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteOperation(e, op.id)}
                                    className="bg-gray-100 hover:bg-red-600 text-gray-400 hover:text-white px-2 rounded text-xs transition-colors border border-gray-200 hover:border-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {operations.length === 0 && (
                            <p className="text-gray-400 text-[11px] text-center py-3">Sin operaciones</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MAPA ──────────────────────────────── */}
            <div
                className="flex-1 rounded-xl overflow-hidden shadow-md border border-gray-200 relative"
                style={{ height: "calc(100vh - 1.5rem)", minHeight: "600px" }}
            >
                {linkingFrom && (
                    <div className="absolute top-4 left-1/2 z-[1000] animate-pulse" style={{ transform: "translateX(-50%)" }}>
                        <div
                            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg text-white whitespace-nowrap"
                            style={{ background: LINE_STYLES[selectedLine].color }}
                        >
                            {LINE_STYLES[selectedLine].label} → selecciona destino
                        </div>
                    </div>
                )}

                <MapContainer
                    center={[4.15, -73.63]}
                    zoom={13}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onAddPoint={handleAddPoint} />

                    {/* Líneas tácticas */}
                    {currentLinks.map((link, i) => {
                        const p1 = currentPoints.find((p) => p.id === link.from);
                        const p2 = currentPoints.find((p) => p.id === link.to);
                        if (!p1 || !p2) return null;
                        return (
                            <TacticalLineRenderer
                                key={i}
                                type={link.lineType}
                                from={[p1.lat, p1.lng]}
                                to={[p2.lat, p2.lng]}
                            />
                        );
                    })}

                    {/* Marcadores */}
                    {currentPoints.map((point) => (
                        <Marker
                            key={point.id}
                            position={[point.lat, point.lng]}
                            icon={getUnitIcon(point.type, point.rotation || 0)}
                            draggable
                            eventHandlers={{
                                dragend: (e) => {
                                    const pos = e.target.getLatLng();
                                    handleMovePoint(point.id, pos.lat, pos.lng);
                                },
                            }}
                        >
                            <Popup>
                                <div className="text-center p-1 w-44">
                                    <strong className="block uppercase text-gray-700 mb-1 text-[11px] tracking-wider">
                                        {point.type.replace('_', ' ')}
                                    </strong>

                                    {/* Slider de Rotación */}
                                    <div className="mt-2 mb-3 pt-2 border-t border-gray-200">
                                        <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1 text-left">
                                            Dirección: {point.rotation || 0}°
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="360"
                                            step="15"
                                            value={point.rotation || 0}
                                            onChange={(e) => handleRotatePoint(point.id, parseInt(e.target.value))}
                                            className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    {linkingFrom && linkingFrom !== point.id && (
                                        <p className="text-[10px] text-gray-400 italic mb-1.5">
                                            Ruta: {LINE_STYLES[selectedLine].label}
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        {!linkingFrom && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLinkingFrom(point.id); }}
                                                className="text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                                style={{ background: LINE_STYLES[selectedLine].color }}
                                            >
                                                Trazar ruta: {LINE_STYLES[selectedLine].label}
                                            </button>
                                        )}
                                        {linkingFrom === point.id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setLinkingFrom(null); }}
                                                className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                            >
                                                Cancelar ruta
                                            </button>
                                        )}
                                        {linkingFrom && linkingFrom !== point.id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCreateLink(point.id); }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full shadow-sm transition-colors"
                                            >
                                                ✓ Unir aquí
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemovePoint(point.id); }}
                                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
