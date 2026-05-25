import { useState, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
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
    | "amigo"
    | "enemigo"
    | "neutral"
    | "desconocido"
    | "infanteria"
    | "mortero"
    | "ametralladora"
    | "francotirador"
    | "medico"
    | "vehiculo"
    | "helicoptero"
    | "dron"
    | "base"
    | "extraccion"
    | "equipo"
    | "escuadra"
    | "seccion"
    | "peloton"
    | "pro";

type LineType =
    | "ataque"
    | "apoyo_fuego"
    | "bloqueo"
    | "emboscada"
    | "repliegue"
    | "infiltracion"
    | "atacar_fuego"
    | "doble_flecha"
    | "flecha_simple"
    | "linea_cortada";

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
}

interface Operation {
    id: number;
    name: string;
    points: TacticalPoint[];
    links?: TacticalLink[];
}

// ─────────────────────────────────────────────
// GENERADOR DE ICONOS SVG
// ─────────────────────────────────────────────

function buildSvgIcon(svgContent: string): L.DivIcon {
    const html = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">${svgContent}</svg>`;
    return new L.DivIcon({
        html,
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
    });
}

// ─────────────────────────────────────────────
// ICONOS MILITARES VECTORIALES
// ─────────────────────────────────────────────

const UNIT_ICONS: Record<UnitType, L.DivIcon> = {
    // ── AFILIACIÓN ──────────────────────────
    // Amigo: solo rectángulo sin líneas internas
    amigo: buildSvgIcon(`
        <rect x="4" y="11" width="30" height="16" rx="1.5"
              stroke="#1a6f35" stroke-width="2" fill="#d4edda"/>
    `),
    // Enemigo: rombo
    enemigo: buildSvgIcon(`
        <polygon points="19,3 35,19 19,35 3,19"
                 stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/>
    `),
    // Neutral: cuadrado
    neutral: buildSvgIcon(`
        <rect x="5" y="5" width="28" height="28" rx="1.5"
              stroke="#92400e" stroke-width="2" fill="#fef3c7"/>
    `),
    // Desconocido: cruz con puntas redondeadas
    desconocido: buildSvgIcon(`
        <line x1="19" y1="4"  x2="19" y2="34" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/>
        <line x1="4"  y1="19" x2="34" y2="19" stroke="#4b5563" stroke-width="5" stroke-linecap="round"/>
    `),

    // ── FUNCIÓN / ARMA ──────────────────────
    // Infantería: X sola
    infanteria: buildSvgIcon(`
        <line x1="6"  y1="6"  x2="32" y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="32" y1="6"  x2="6"  y2="32" stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"/>
    `),
    // Mortero: círculo con flecha hacia arriba
    mortero: buildSvgIcon(`
        <circle cx="19" cy="26" r="8" stroke="#374151" stroke-width="2" fill="#e5e7eb"/>
        <line x1="19" y1="18" x2="19" y2="6"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="13" y1="12" x2="19" y2="6"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="12" x2="19" y2="6"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
    `),
    // Ametralladora: línea base horizontal con flecha vertical hacia arriba
    ametralladora: buildSvgIcon(`
        <line x1="6"  y1="30" x2="32" y2="30" stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="19" y1="30" x2="19" y2="8"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="13" y1="14" x2="19" y2="8"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="25" y1="14" x2="19" y2="8"  stroke="#374151" stroke-width="2.2" stroke-linecap="round"/>
    `),
    // Francotirador: mira telescópica
    francotirador: buildSvgIcon(`
        <circle cx="19" cy="19" r="9" stroke="#374151" stroke-width="1.8" fill="none"/>
        <line x1="19" y1="4"  x2="19" y2="11" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="19" y1="27" x2="19" y2="34" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="4"  y1="19" x2="11" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="27" y1="19" x2="34" y2="19" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="19" cy="19" r="2.5" fill="#374151"/>
    `),
    // Médico: rectángulo con cruz roja
    medico: buildSvgIcon(`
        <rect x="4" y="11" width="30" height="16" rx="1.5" stroke="#b91c1c" stroke-width="2" fill="#fee2e2"/>
        <line x1="19" y1="14" x2="19" y2="24" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
        <line x1="14" y1="19" x2="24" y2="19" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"/>
    `),
    // Vehículo
    vehiculo: buildSvgIcon(`
        <rect x="3" y="13" width="32" height="14" rx="2" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/>
        <rect x="6" y="8"  width="14" height="7"  rx="1" stroke="#374151" stroke-width="1.5" fill="#d1d5db"/>
        <circle cx="10" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/>
        <circle cx="28" cy="27" r="3.5" stroke="#374151" stroke-width="1.5" fill="#9ca3af"/>
    `),
    // Helicóptero
    helicoptero: buildSvgIcon(`
        <ellipse cx="19" cy="23" rx="8" ry="5" stroke="#374151" stroke-width="1.8" fill="#e5e7eb"/>
        <line x1="4"  y1="13" x2="34" y2="13" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="19" y1="13" x2="19" y2="18" stroke="#374151" stroke-width="1.5"/>
        <line x1="27" y1="22" x2="33" y2="30" stroke="#374151" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="30" y1="28" x2="36" y2="28" stroke="#374151" stroke-width="2"   stroke-linecap="round"/>
    `),
    // Dron
    dron: buildSvgIcon(`
        <circle cx="19" cy="19" r="4" stroke="#374151" stroke-width="1.5" fill="#e5e7eb"/>
        <circle cx="7"  cy="7"  r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/>
        <circle cx="31" cy="7"  r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/>
        <circle cx="7"  cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/>
        <circle cx="31" cy="31" r="3.5" stroke="#374151" stroke-width="1.3" fill="#d1d5db"/>
        <line x1="10" y1="10" x2="16" y2="16" stroke="#374151" stroke-width="1.2"/>
        <line x1="28" y1="10" x2="22" y2="16" stroke="#374151" stroke-width="1.2"/>
        <line x1="10" y1="28" x2="16" y2="22" stroke="#374151" stroke-width="1.2"/>
        <line x1="28" y1="28" x2="22" y2="22" stroke="#374151" stroke-width="1.2"/>
    `),
    // Base
    base: buildSvgIcon(`
        <rect x="5"  y="18" width="28" height="16" rx="1" stroke="#1a6f35" stroke-width="1.8" fill="#d4edda"/>
        <polygon points="19,4 33,18 5,18" stroke="#1a6f35" stroke-width="1.8" fill="#a7d7b3" stroke-linejoin="round"/>
        <rect x="14" y="26" width="10" height="8" rx="0.5" stroke="#1a6f35" stroke-width="1.3" fill="#86c995"/>
    `),
    // Extracción
    extraccion: buildSvgIcon(`
        <circle cx="19" cy="19" r="13" stroke="#7c3aed" stroke-width="2" fill="#ede9fe" stroke-dasharray="4 3"/>
        <line x1="19" y1="26" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="13" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="25" y1="16" x2="19" y2="10" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>
    `),

    // ── TAMAÑO DE UNIDAD ────────────────────
    // Equipo/Tripulación: círculo con línea diagonal
    equipo: buildSvgIcon(`
        <circle cx="19" cy="19" r="12" stroke="#374151" stroke-width="2" fill="#f3f4f6"/>
        <line x1="11" y1="27" x2="27" y2="11" stroke="#374151" stroke-width="2" stroke-linecap="round"/>
    `),
    // Escuadra: círculo negro relleno
    escuadra: buildSvgIcon(`
        <circle cx="19" cy="19" r="10" fill="#1f2937"/>
    `),
    // Sección: dos círculos negros
    seccion: buildSvgIcon(`
        <circle cx="12" cy="19" r="8" fill="#1f2937"/>
        <circle cx="26" cy="19" r="8" fill="#1f2937"/>
    `),
    // Pelotón: tres círculos negros
    peloton: buildSvgIcon(`
        <circle cx="7"  cy="19" r="6" fill="#1f2937"/>
        <circle cx="19" cy="19" r="6" fill="#1f2937"/>
        <circle cx="31" cy="19" r="6" fill="#1f2937"/>
    `),

    // ── PRO ─────────────────────────────────
    // PRO: cuadrado con triángulo invertido encima (escudo/casa invertida)
    pro: buildSvgIcon(
        `
        <rect x="7" y="5" width="24" height="14" rx="1.5" stroke="#1e3a5f" stroke-width="2.2" fill="#dbeafe"/>
        <polygon points="7,19 31,19 19,33" stroke="#1e3a5f" stroke-width="2.2" fill="#93c5fd" stroke-linejoin="round"/>
        <text x="19" y="15" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#1e3a5f" font-family="sans-serif">PRO</text>
    `,
    ),
};

// ─────────────────────────────────────────────
// DEFINICIÓN DE UNIDADES PARA LA UI
// ─────────────────────────────────────────────

interface UnitDef {
    type: UnitType;
    label: string;
    group: string;
    svgPreview: string;
}

const UNIT_DEFS: UnitDef[] = [
    // Afiliación
    {
        type: "amigo",
        label: "Amigo",
        group: "Afiliación",
        svgPreview: `<rect x="2" y="7" width="20" height="10" rx="1" stroke="#1a6f35" stroke-width="1.5" fill="#d4edda"/>`,
    },
    {
        type: "enemigo",
        label: "Enemigo",
        group: "Afiliación",
        svgPreview: `<polygon points="12,2 22,12 12,22 2,12" stroke="#b91c1c" stroke-width="1.5" fill="#fee2e2"/>`,
    },
    {
        type: "neutral",
        label: "Neutral",
        group: "Afiliación",
        svgPreview: `<rect x="3" y="3" width="18" height="18" rx="1" stroke="#92400e" stroke-width="1.5" fill="#fef3c7"/>`,
    },
    {
        type: "desconocido",
        label: "Desconoc.",
        group: "Afiliación",
        svgPreview: `<line x1="12" y1="3" x2="12" y2="21" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/>`,
    },
    // Función
    {
        type: "infanteria",
        label: "Infantería",
        group: "Función",
        svgPreview: `<line x1="4" y1="4" x2="20" y2="20" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round"/><line x1="20" y1="4" x2="4" y2="20" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round"/>`,
    },
    {
        type: "mortero",
        label: "Mortero",
        group: "Función",
        svgPreview: `<circle cx="12" cy="17" r="5" stroke="#374151" stroke-width="1.5" fill="#e5e7eb"/><line x1="12" y1="12" x2="12" y2="4" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="7" x2="12" y2="4" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="16" y1="7" x2="12" y2="4" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>`,
    },
    {
        type: "ametralladora",
        label: "Ametrall.",
        group: "Función",
        svgPreview: `<line x1="3" y1="20" x2="21" y2="20" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="5" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="9" x2="12" y2="5" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/><line x1="16" y1="9" x2="12" y2="5" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>`,
    },
    {
        type: "francotirador",
        label: "Francotir.",
        group: "Función",
        svgPreview: `<circle cx="12" cy="12" r="7" stroke="#374151" stroke-width="1.3" fill="none"/><line x1="12" y1="2" x2="12" y2="6" stroke="#374151" stroke-width="1.3"/><line x1="12" y1="18" x2="12" y2="22" stroke="#374151" stroke-width="1.3"/><line x1="2" y1="12" x2="6" y2="12" stroke="#374151" stroke-width="1.3"/><line x1="18" y1="12" x2="22" y2="12" stroke="#374151" stroke-width="1.3"/><circle cx="12" cy="12" r="2" fill="#374151"/>`,
    },
    {
        type: "medico",
        label: "Médico",
        group: "Función",
        svgPreview: `<rect x="2" y="7" width="20" height="10" rx="1" stroke="#b91c1c" stroke-width="1.5" fill="#fee2e2"/><line x1="12" y1="10" x2="12" y2="15" stroke="#b91c1c" stroke-width="2.5" stroke-linecap="round"/><line x1="9" y1="12.5" x2="15" y2="12.5" stroke="#b91c1c" stroke-width="2.5" stroke-linecap="round"/>`,
    },
    {
        type: "vehiculo",
        label: "Vehículo",
        group: "Función",
        svgPreview: `<rect x="1" y="8" width="22" height="10" rx="2" stroke="#374151" stroke-width="1.3" fill="#e5e7eb"/><rect x="4" y="5" width="10" height="5" rx="1" stroke="#374151" stroke-width="1.2" fill="#d1d5db"/><circle cx="6" cy="18" r="3" stroke="#374151" stroke-width="1.2" fill="#9ca3af"/><circle cx="18" cy="18" r="3" stroke="#374151" stroke-width="1.2" fill="#9ca3af"/>`,
    },
    {
        type: "helicoptero",
        label: "Helicóp.",
        group: "Función",
        svgPreview: `<ellipse cx="12" cy="16" rx="6" ry="4" stroke="#374151" stroke-width="1.3" fill="#e5e7eb"/><line x1="2" y1="9" x2="22" y2="9" stroke="#374151" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="9" x2="12" y2="12" stroke="#374151" stroke-width="1.2"/>`,
    },
    {
        type: "dron",
        label: "Dron",
        group: "Función",
        svgPreview: `<circle cx="12" cy="12" r="3" stroke="#374151" stroke-width="1.3" fill="#e5e7eb"/><circle cx="4" cy="4" r="2.5" stroke="#374151" stroke-width="1" fill="#d1d5db"/><circle cx="20" cy="4" r="2.5" stroke="#374151" stroke-width="1" fill="#d1d5db"/><circle cx="4" cy="20" r="2.5" stroke="#374151" stroke-width="1" fill="#d1d5db"/><circle cx="20" cy="20" r="2.5" stroke="#374151" stroke-width="1" fill="#d1d5db"/>`,
    },
    {
        type: "base",
        label: "Base",
        group: "Función",
        svgPreview: `<rect x="3" y="13" width="18" height="10" rx="1" stroke="#1a6f35" stroke-width="1.3" fill="#d4edda"/><polygon points="12,4 21,13 3,13" stroke="#1a6f35" stroke-width="1.3" fill="#a7d7b3" stroke-linejoin="round"/>`,
    },
    {
        type: "extraccion",
        label: "Extracción",
        group: "Función",
        svgPreview: `<circle cx="12" cy="12" r="9" stroke="#7c3aed" stroke-width="1.5" fill="#ede9fe" stroke-dasharray="3 2"/><line x1="12" y1="16" x2="12" y2="6" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="10" x2="12" y2="6" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="10" x2="12" y2="6" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/>`,
    },
    // Tamaño
    {
        type: "equipo",
        label: "Equipo",
        group: "Tamaño",
        svgPreview: `<circle cx="12" cy="12" r="9" stroke="#374151" stroke-width="1.8" fill="#f3f4f6"/><line x1="7" y1="17" x2="17" y2="7" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>`,
    },
    {
        type: "escuadra",
        label: "Escuadra",
        group: "Tamaño",
        svgPreview: `<circle cx="12" cy="12" r="8" fill="#1f2937"/>`,
    },
    {
        type: "seccion",
        label: "Sección",
        group: "Tamaño",
        svgPreview: `<circle cx="7" cy="12" r="6" fill="#1f2937"/><circle cx="17" cy="12" r="6" fill="#1f2937"/>`,
    },
    {
        type: "peloton",
        label: "Pelotón",
        group: "Tamaño",
        svgPreview: `<circle cx="4" cy="12" r="4" fill="#1f2937"/><circle cx="12" cy="12" r="4" fill="#1f2937"/><circle cx="20" cy="12" r="4" fill="#1f2937"/>`,
    },
    // PRO
    {
        type: "pro",
        label: "PRO",
        group: "PRO",
        svgPreview: `
    <rect
        x="5"
        y="3"
        width="14"
        height="9"
        rx="1"
        stroke="#1e3a5f"
        stroke-width="1.5"
        fill="#dbeafe"
    />

    <polygon
        points="5,12 19,12 12,21"
        stroke="#1e3a5f"
        stroke-width="1.5"
        fill="#93c5fd"
        stroke-linejoin="round"
    />
    `,
    },
];

// ─────────────────────────────────────────────
// ESTILOS DE LÍNEAS TÁCTICAS
// ─────────────────────────────────────────────

interface LineStyle {
    color: string;
    weight: number;
    dashArray?: string;
    label: string;
    previewSvg: string;
}

const LINE_STYLES: Record<LineType, LineStyle> = {
    // Ataque: flecha sólida recta
    ataque: {
        color: "#dc2626",
        weight: 3,
        label: "Ataque",
        previewSvg: `<line x1="2" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <polygon points="30,10 40,14 30,18" fill="currentColor"/>`,
    },
    // Doble flecha: flechas en ambos extremos
    doble_flecha: {
        color: "#374151",
        weight: 2,
        label: "Doble flecha",
        previewSvg: `<line x1="6" y1="14" x2="34" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <polygon points="10,10 2,14 10,18" fill="currentColor"/>
        <polygon points="30,10 38,14 30,18" fill="currentColor"/>`,
    },
    // Flecha simple
    flecha_simple: {
        color: "#374151",
        weight: 2,
        label: "Flecha simple",
        previewSvg: `<line x1="2" y1="14" x2="32" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <polygon points="30,10 38,14 30,18" fill="currentColor"/>`,
    },
    // Línea cortada (entrecortada)
    linea_cortada: {
        color: "#6b7280",
        weight: 2,
        dashArray: "6 5",
        label: "Línea cortada",
        previewSvg: `<line x1="2" y1="14" x2="38" y2="14" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 5" stroke-linecap="round"/>`,
    },
    // Emboscar: arco tipo rastrillo + flecha a rombo
    emboscada: {
        color: "#b45309",
        weight: 2.5,
        label: "Emboscar",
        previewSvg: `<path d="M10 22 Q20 6 10 6" stroke="currentColor" stroke-width="1.3" fill="none"/>
        <line x1="10" y1="7"  x2="5" y2="5"  stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="10" x2="4" y2="9"  stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="14" x2="4" y2="14" stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="18" x2="4" y2="19" stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="21" x2="5" y2="23" stroke="currentColor" stroke-width="1"/>
        <line x1="10" y1="14" x2="28" y2="14" stroke="currentColor" stroke-width="1.3"/>
        <polygon points="28,11 36,14 28,17" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    },
    // Repliegue: arco semicírculo + flecha hacia atrás + rombo
    repliegue: {
        color: "#0369a1",
        weight: 2.5,
        dashArray: "6 4",
        label: "Repliegue",
        previewSvg: `<path d="M30 8 Q40 14 30 20" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <line x1="8" y1="14" x2="29" y2="14" stroke="currentColor" stroke-width="1.3"/>
        <polygon points="14,11 6,14 14,17" fill="currentColor"/>
        <polygon points="30,11 38,14 30,17" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    },
    // Infiltrar: línea con IN y flecha
    infiltracion: {
        color: "#15803d",
        weight: 2,
        dashArray: "4 4",
        label: "Infiltrar",
        previewSvg: `<line x1="2" y1="14" x2="12" y2="14" stroke="currentColor" stroke-width="1.5"/>
        <text x="13" y="18" font-size="7" fill="currentColor" font-family="sans-serif" font-weight="bold">IN</text>
        <line x1="25" y1="14" x2="36" y2="14" stroke="currentColor" stroke-width="1.5"/>
        <polygon points="32,11 40,14 32,17" fill="currentColor"/>`,
    },
    // Atacar con fuego: dos ramas angulares + flecha a rombo
    atacar_fuego: {
        color: "#dc2626",
        weight: 2.5,
        label: "Atacar c/fuego",
        previewSvg: `<line x1="2" y1="9"  x2="18" y2="14" stroke="currentColor" stroke-width="1.3"/>
        <line x1="2" y1="19" x2="18" y2="14" stroke="currentColor" stroke-width="1.3"/>
        <line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="1.5"/>
        <polygon points="30,11 38,14 30,17" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    },
    // Bloquear: línea + B + barra + rombo
    bloqueo: {
        color: "#7c3aed",
        weight: 3,
        label: "Bloquear",
        previewSvg: `<line x1="2" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="1.5"/>
        <text x="20" y="18" font-size="8" fill="currentColor" font-family="sans-serif" font-weight="bold">B</text>
        <line x1="28" y1="9" x2="28" y2="19" stroke="currentColor" stroke-width="1.5"/>
        <polygon points="30,11 38,14 30,17" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    },
    // Apoyar con fuego: dos flechas divergentes desde un punto + rombo
    apoyo_fuego: {
        color: "#ea580c",
        weight: 2.5,
        label: "Apoyar c/fuego",
        previewSvg: `<line x1="10" y1="14" x2="30" y2="8"  stroke="currentColor" stroke-width="1.3"/>
        <line x1="10" y1="14" x2="30" y2="20" stroke="currentColor" stroke-width="1.3"/>
        <polygon points="26,5 34,8 27,11"  fill="currentColor"/>
        <polygon points="26,17 34,20 27,23" fill="currentColor"/>
        <polygon points="6,11 10,14 6,17 2,14" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    },
};

// ─────────────────────────────────────────────
// CLICK HANDLER DEL MAPA
// ─────────────────────────────────────────────

function MapClickHandler({
    onAddPoint,
}: {
    onAddPoint: (lat: number, lng: number) => void;
}) {
    useMapEvents({ click: (e) => onAddPoint(e.latlng.lat, e.latlng.lng) });
    return null;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function TacticalMap() {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [activeOpId, setActiveOpId] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<UnitType>("infanteria");
    const [selectedLine, setSelectedLine] = useState<LineType>("ataque");
    const [newOpName, setNewOpName] = useState("");
    const [linkingFrom, setLinkingFrom] = useState<number | null>(null);
    const [openGroup, setOpenGroup] = useState<string>("Afiliación");

    useEffect(() => {
        axios.get("/operations").then((res) => {
            setOperations(res.data);
            if (res.data.length > 0) setActiveOpId(res.data[0].id);
        });
    }, []);

    const handleCreateOperation = () => {
        if (!newOpName.trim()) return;
        axios.post("/operations", { name: newOpName }).then((res) => {
            setOperations([res.data, ...operations]);
            setActiveOpId(res.data.id);
            setNewOpName("");
        });
    };

    const handleDeleteOperation = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("¿Confirmas la eliminación de esta operación?")) return;
        axios.delete(`/operations/${id}`).then(() => {
            setOperations((ops) => ops.filter((op) => op.id !== id));
            if (activeOpId === id) setActiveOpId(null);
        });
    };

    const handleAddPoint = (lat: number, lng: number) => {
        if (!activeOpId) return alert("Crea una operación primero.");
        axios
            .post("/tactical-points", {
                operation_id: activeOpId,
                type: selectedUnit,
                lat,
                lng,
            })
            .then((res) => {
                setOperations((ops) =>
                    ops.map((op) =>
                        op.id === activeOpId
                            ? { ...op, points: [...op.points, res.data] }
                            : op,
                    ),
                );
            });
    };

    const handleRemovePoint = (id: number) => {
        axios.delete(`/tactical-points/${id}`).then(() => {
            setOperations((ops) =>
                ops.map((op) => {
                    if (op.id !== activeOpId) return op;
                    return {
                        ...op,
                        points: op.points.filter((p) => p.id !== id),
                        links: (op.links || []).filter(
                            (l) => l.from !== id && l.to !== id,
                        ),
                    };
                }),
            );
            if (linkingFrom === id) setLinkingFrom(null);
        });
    };

    const handleMovePoint = (id: number, lat: number, lng: number) => {
        axios.put(`/tactical-points/${id}`, { lat, lng }).then(() => {
            setOperations((ops) =>
                ops.map((op) =>
                    op.id === activeOpId
                        ? {
                              ...op,
                              points: op.points.map((p) =>
                                  p.id === id ? { ...p, lat, lng } : p,
                              ),
                          }
                        : op,
                ),
            );
        });
    };

    const handleSaveLinks = (newLinks: TacticalLink[]) => {
        if (!activeOpId) return;
        axios
            .put(`/operations/${activeOpId}/links`, { links: newLinks })
            .then(() => {
                setOperations((ops) =>
                    ops.map((op) =>
                        op.id === activeOpId ? { ...op, links: newLinks } : op,
                    ),
                );
                setLinkingFrom(null);
            });
    };

    const handleCreateLink = (targetId: number) => {
        if (!linkingFrom || linkingFrom === targetId || !activeOperation)
            return;
        const currentLinks = activeOperation.links || [];
        handleSaveLinks([
            ...currentLinks,
            { from: linkingFrom, to: targetId, lineType: selectedLine },
        ]);
    };

    const handleClearLinks = () => {
        if (confirm("¿Borrar todos los trazados de esta operación?"))
            handleSaveLinks([]);
    };

    const activeOperation = operations.find((op) => op.id === activeOpId);
    const currentPoints = activeOperation?.points ?? [];
    const currentLinks = activeOperation?.links ?? [];
    const groups = Array.from(new Set(UNIT_DEFS.map((u) => u.group)));

    return (
        <div className="flex gap-4 p-3 bg-gray-50 min-h-screen">
            {/* ── PANEL LATERAL ─────────────────────── */}
            <div
                className="flex flex-col gap-3 overflow-y-auto pb-4"
                style={{
                    width: "320px",
                    minWidth: "320px",
                    flexShrink: 0,
                    maxHeight: "calc(100vh - 1.5rem)",
                }}
            >
                {/* Nueva Operación */}
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-2">
                        Nueva Operación
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 rounded text-xs p-2 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none"
                            placeholder="Nombre clave..."
                            value={newOpName}
                            onChange={(e) => setNewOpName(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleCreateOperation()
                            }
                        />
                        <button
                            onClick={handleCreateOperation}
                            className="bg-green-700 hover:bg-green-800 text-white font-bold px-3 rounded text-sm transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Selector de Unidad con acordeón por grupo */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-3">
                        Unidad a Desplegar
                    </p>

                    {groups.map((group) => (
                        <div key={group} className="mb-4">
                            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                                {group}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {UNIT_DEFS.filter((u) => u.group === group).map(
                                    ({ type, label, svgPreview }) => (
                                        <button
                                            key={type}
                                            onClick={() =>
                                                setSelectedUnit(type)
                                            }
                                            title={label}
                                            className={`
                                flex flex-col items-center justify-center
                                gap-1
                                p-3
                                rounded-lg
                                border
                                min-h-[82px]
                                transition-all
                                overflow-hidden

                                ${
                                    selectedUnit === type
                                        ? "bg-green-700 border-green-800 text-white shadow-md scale-[1.02]"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-100"
                                }
                            `}
                                        >
                                            <svg
                                                width="38"
                                                height="38"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                dangerouslySetInnerHTML={{
                                                    __html: svgPreview,
                                                }}
                                            />

                                            <span className="text-[10px] font-bold tracking-wide text-center leading-tight">
                                                {label}
                                            </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Selector de Línea Táctica */}
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <p className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest mb-2">
                        Tipo de Línea Táctica
                    </p>
                    <div className="flex flex-col gap-1">
                        {(
                            Object.entries(LINE_STYLES) as [
                                LineType,
                                LineStyle,
                            ][]
                        ).map(([type, style]) => (
                            <button
                                key={type}
                                onClick={() => setSelectedLine(type)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[11px] font-medium transition-all text-left ${
                                    selectedLine === type
                                        ? "border-amber-800 text-amber-100"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                }`}
                                style={
                                    selectedLine === type
                                        ? { background: "#78350f" }
                                        : {}
                                }
                            >
                                <svg
                                    width="40"
                                    height="28"
                                    viewBox="0 0 40 28"
                                    fill="none"
                                    className="flex-shrink-0"
                                    style={{
                                        color:
                                            selectedLine === type
                                                ? "#fef3c7"
                                                : style.color,
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: style.previewSvg,
                                    }}
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
                            Borrar trazados ({currentLinks.length})
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
                                    onClick={() => {
                                        setActiveOpId(op.id);
                                        setLinkingFrom(null);
                                    }}
                                    className={`flex-1 text-left px-2.5 py-2 rounded text-[11px] font-semibold tracking-wide transition-colors ${
                                        activeOpId === op.id
                                            ? "bg-green-700 text-white shadow-sm"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {op.name}
                                    <span
                                        className={`float-right px-1.5 py-0.5 rounded text-[10px] ${
                                            activeOpId === op.id
                                                ? "bg-green-800 text-white"
                                                : "bg-gray-300 text-gray-700"
                                        }`}
                                    >
                                        {op.points.length}
                                    </span>
                                </button>
                                <button
                                    onClick={(e) =>
                                        handleDeleteOperation(e, op.id)
                                    }
                                    className="bg-gray-100 hover:bg-red-600 text-gray-400 hover:text-white px-2 rounded text-xs transition-colors border border-gray-200 hover:border-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {operations.length === 0 && (
                            <p className="text-gray-400 text-[11px] text-center py-3">
                                Sin operaciones
                            </p>
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
                    <div
                        className="absolute top-4 left-1/2 z-[1000] animate-pulse"
                        style={{ transform: "translateX(-50%)" }}
                    >
                        <div
                            className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg text-white whitespace-nowrap"
                            style={{
                                background: LINE_STYLES[selectedLine].color,
                            }}
                        >
                            {LINE_STYLES[selectedLine].label} → selecciona
                            destino
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
                        const p1 = currentPoints.find(
                            (p) => p.id === link.from,
                        );

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
                            icon={
                                UNIT_ICONS[point.type] ?? UNIT_ICONS.infanteria
                            }
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
                                        {point.type}
                                    </strong>

                                    {linkingFrom &&
                                        linkingFrom !== point.id && (
                                            <p className="text-[10px] text-gray-400 italic mb-1.5">
                                                Línea:{" "}
                                                {
                                                    LINE_STYLES[selectedLine]
                                                        .label
                                                }
                                            </p>
                                        )}

                                    <div className="flex flex-col gap-1.5">
                                        {!linkingFrom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLinkingFrom(point.id);
                                                }}
                                                className="text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                                style={{
                                                    background:
                                                        LINE_STYLES[
                                                            selectedLine
                                                        ].color,
                                                }}
                                            >
                                                Trazar:{" "}
                                                {
                                                    LINE_STYLES[selectedLine]
                                                        .label
                                                }
                                            </button>
                                        )}
                                        {linkingFrom === point.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLinkingFrom(null);
                                                }}
                                                className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                            >
                                                Cancelar trazado
                                            </button>
                                        )}
                                        {linkingFrom &&
                                            linkingFrom !== point.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCreateLink(
                                                            point.id,
                                                        );
                                                    }}
                                                    className="bg-green-700 hover:bg-green-800 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full shadow-sm transition-colors"
                                                >
                                                    ✓ Vincular aquí
                                                </button>
                                            )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePoint(point.id);
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-[10px] font-bold uppercase w-full transition-colors"
                                        >
                                            Eliminar unidad
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
