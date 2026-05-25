import { Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

interface Props {
    type: string;
    from: [number, number];
    to: [number, number];
}

function midpoint(
    a: [number, number],
    b: [number, number],
): [number, number] {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function angle(
    a: [number, number],
    b: [number, number],
) {
    return Math.atan2(b[0] - a[0], b[1] - a[1]) * (180 / Math.PI);
}

function svgMarker(svg: string, rotation = 0) {
    return L.divIcon({
        className: "",
        html: `
        <div style="
            transform: rotate(${rotation}deg);
            width: 80px;
            height: 80px;
            display:flex;
            align-items:center;
            justify-content:center;
        ">
            ${svg}
        </div>
        `,
        iconSize: [80, 80],
        iconAnchor: [40, 40],
    });
}

export default function TacticalLineRenderer({
    type,
    from,
    to,
}: Props) {
    const positions = [from, to] as [number, number][];

    const mid = midpoint(from, to);

    const rot = angle(from, to);

    switch (type) {
        // ─────────────────────────────
        // ATAQUE
        // ─────────────────────────────
        case "ataque":
            return (
                <>
                    <Polyline
                        positions={positions}
                        pathOptions={{
                            color: "#dc2626",
                            weight: 4,
                        }}
                    />

                    <Marker
                        position={to}
                        icon={svgMarker(`
                            <svg width="40" height="40" viewBox="0 0 40 40">
                                <polygon
                                    points="8,8 32,20 8,32"
                                    fill="#dc2626"
                                />
                            </svg>
                        `, rot)}
                    />
                </>
            );

        // ─────────────────────────────
        // APOYAR CON FUEGO
        // ─────────────────────────────
        case "apoyo_fuego":
            return (
                <>
                    <Polyline
                        positions={[from, mid]}
                        pathOptions={{
                            color: "#ea580c",
                            weight: 3,
                        }}
                    />

                    <Marker
                        position={mid}
                        icon={svgMarker(`
                            <svg width="80" height="80" viewBox="0 0 80 80">
                                <line x1="20" y1="40" x2="60" y2="20"
                                    stroke="#ea580c"
                                    stroke-width="4"/>

                                <line x1="20" y1="40" x2="60" y2="60"
                                    stroke="#ea580c"
                                    stroke-width="4"/>

                                <polygon points="54,14 68,20 56,28"
                                    fill="#ea580c"/>

                                <polygon points="54,52 68,60 56,68"
                                    fill="#ea580c"/>
                            </svg>
                        `, rot)}
                    />
                </>
            );

        // ─────────────────────────────
        // EMBOSCADA
        // ─────────────────────────────
        case "emboscada":
            return (
                <>
                    <Polyline
                        positions={positions}
                        pathOptions={{
                            color: "#92400e",
                            weight: 3,
                        }}
                    />

                    <Marker
                        position={mid}
                        icon={svgMarker(`
                            <svg width="100" height="100" viewBox="0 0 100 100">

                                <path
                                    d="M35 75 Q60 50 35 25"
                                    stroke="#92400e"
                                    stroke-width="4"
                                    fill="none"
                                />

                                <line x1="35" y1="30" x2="18" y2="22"
                                    stroke="#92400e"
                                    stroke-width="3"/>

                                <line x1="35" y1="40" x2="15" y2="38"
                                    stroke="#92400e"
                                    stroke-width="3"/>

                                <line x1="35" y1="50" x2="14" y2="50"
                                    stroke="#92400e"
                                    stroke-width="3"/>

                                <line x1="35" y1="60" x2="15" y2="62"
                                    stroke="#92400e"
                                    stroke-width="3"/>

                                <line x1="35" y1="70" x2="18" y2="78"
                                    stroke="#92400e"
                                    stroke-width="3"/>

                                <line x1="35" y1="50" x2="80" y2="50"
                                    stroke="#92400e"
                                    stroke-width="4"/>

                                <polygon
                                    points="72,42 92,50 72,58"
                                    fill="none"
                                    stroke="#92400e"
                                    stroke-width="4"
                                />

                            </svg>
                        `, rot)}
                    />
                </>
            );

        // ─────────────────────────────
        // BLOQUEO
        // ─────────────────────────────
        case "bloqueo":
            return (
                <>
                    <Polyline
                        positions={positions}
                        pathOptions={{
                            color: "#7c3aed",
                            weight: 4,
                        }}
                    />

                    <Marker
                        position={mid}
                        icon={svgMarker(`
                            <svg width="80" height="80" viewBox="0 0 80 80">

                                <line x1="10" y1="40" x2="45" y2="40"
                                    stroke="#7c3aed"
                                    stroke-width="4"/>

                                <text
                                    x="45"
                                    y="45"
                                    fill="#7c3aed"
                                    font-size="18"
                                    font-weight="bold"
                                >
                                    B
                                </text>

                                <line x1="60" y1="20" x2="60" y2="60"
                                    stroke="#7c3aed"
                                    stroke-width="4"/>

                            </svg>
                        `, rot)}
                    />
                </>
            );

        // ─────────────────────────────
        // INFILTRACIÓN
        // ─────────────────────────────
        case "infiltracion":
            return (
                <>
                    <Polyline
                        positions={positions}
                        pathOptions={{
                            color: "#15803d",
                            weight: 3,
                            dashArray: "8 8",
                        }}
                    />

                    <Marker
                        position={mid}
                        icon={svgMarker(`
                            <svg width="100" height="100" viewBox="0 0 100 100">

                                <text
                                    x="30"
                                    y="50"
                                    fill="#15803d"
                                    font-size="22"
                                    font-weight="bold"
                                >
                                    IN
                                </text>

                                <line
                                    x1="48"
                                    y1="50"
                                    x2="82"
                                    y2="50"
                                    stroke="#15803d"
                                    stroke-width="4"
                                />

                                <polygon
                                    points="74,42 92,50 74,58"
                                    fill="#15803d"
                                />

                            </svg>
                        `, rot)}
                    />
                </>
            );

        default:
            return (
                <Polyline
                    positions={positions}
                    pathOptions={{
                        color: "#374151",
                        weight: 3,
                    }}
                />
            );
    }
}
