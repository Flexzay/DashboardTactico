import { Polyline, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-polylinedecorator";

interface Props {
    type: "continua" | "discontinua";
    from: [number, number];
    to: [number, number];
}

export default function TacticalLineRenderer({ type, from, to }: Props) {
    const map = useMap();
    const polylineRef = useRef<L.Polyline | null>(null);
    const decoratorRef = useRef<any>(null);

    // Ajusta este valor: números negativos alejan la flecha del destino
    const arrowPadding = -15;

   useEffect(() => {
    if (!polylineRef.current) return;

    if (decoratorRef.current) map.removeLayer(decoratorRef.current);

    // Usamos (L as any) para saltar la validación de tipos
    decoratorRef.current = (L as any).polylineDecorator(polylineRef.current, {
        patterns: [
            {
                offset: `100%${arrowPadding}`,
                repeat: 0,
                symbol: (L as any).Symbol.arrowHead({
                    pixelSize: 15,
                    polygon: true,
                    pathOptions: {
                        stroke: true,
                        weight: 2,
                        color: '#374151',
                        fillColor: '#374151',
                        fillOpacity: 1
                    }
                })
            }
        ]
    }).addTo(map);

    return () => {
        if (decoratorRef.current) map.removeLayer(decoratorRef.current);
    };
}, [from, to, map]);

    return (
        <Polyline
            ref={polylineRef}
            positions={[from, to]}
            pathOptions={{
                color: "#374151",
                weight: 4,
                dashArray: type === "discontinua" ? "12 8" : undefined,
                lineCap: "round",
                lineJoin: "round"
            }}
        />
    );
}
