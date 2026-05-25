import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import TacticalMap from "@/Components/TacticalMap";

export default function Dashboard() {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="p-6 text-gray-600 text-sm">
                            Bienvenido al sistema. Aquí puedes gestionar el
                            despliegue de unidades sobre el terreno en tiempo
                            real.
                        </div>
                    </div>

                    {/* El Mapa Adaptado */}
                    <TacticalMap />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
