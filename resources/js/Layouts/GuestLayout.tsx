import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-100 pt-6 sm:pt-0">

            
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute z-0 min-w-full min-h-full object-cover"
            >

                <source src="/videos/ejercito.mp4" type="video/mp4" />
                Tu navegador no soporta elementos de video.
            </video>

            {/* Capa translúcida clara sobre el video */}
            <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-sm" />

            {/* Logo del sistema */}
            <div className="z-10 relative mb-4">
                <Link href="/">
                    <div className="text-3xl font-black tracking-widest text-gray-900 drop-shadow-sm">
                        EJER<span className="text-green-600">CITO</span>
                    </div>
                </Link>
            </div>


            <div className="z-10 relative mt-2 w-full overflow-hidden border border-gray-200 bg-white/90 px-6 py-8 shadow-md backdrop-blur-md sm:max-w-md sm:rounded-lg">


                <div className="[&_label]:text-gray-700 [&_label]:font-bold [&_label]:uppercase [&_label]:text-[11px] [&_label]:tracking-wider [&_input]:bg-gray-50 [&_input]:border-gray-300 [&_input]:text-gray-800 [&_input]:rounded [&_input]:focus:border-green-600 [&_input]:focus:ring-green-600 [&_input]:text-sm">
                    {children}
                </div>

            </div>
        </div>
    );
}
