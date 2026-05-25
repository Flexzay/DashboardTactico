import { useState, useRef } from "react";
import { Head, Link } from "@inertiajs/react";

export default function Welcome({ auth }: { auth: any }) {
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);

    const toggleAudio = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play().catch((error) => {
                console.error("El navegador bloqueó el audio:", error);
            });
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <>
            <Head title="Ingreso al Sistema" />

            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-100">
                <video
                    autoPlay
                    loop
                    muted={true}
                    playsInline
                    className="absolute z-0 min-w-full min-h-full object-cover"
                >
                    <source src="/videos/ejercito.mp4" type="video/mp4" />
                    Tu navegador no soporta elementos de video.
                </video>

                <audio
                    ref={audioRef}
                    src="/videos/himno.m4a"
                    loop
                    preload="auto"
                />

                {/* Capa de desenfoque y oscurecimiento táctico */}
                <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-sm" />

                {/* Contenido principal (Textos y Botones) */}
                <div className="z-10 text-center px-4">
                    <h1 className="mb-3 text-4xl font-black tracking-widest text-gray-900 drop-shadow-sm uppercase sm:text-5xl">
                        Sistema Táctico{" "}
                        <span className="text-green-600">Ejército</span>
                    </h1>

                    <p className="mb-8 text-gray-700 font-mono text-xs tracking-wider uppercase bg-gray-200/80 inline-block px-4 py-1.5 rounded border border-gray-300 font-bold shadow-sm">
                        Red de trazabilidad y posicionamiento global
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {auth.user ? (
                            <Link
                                href={route("dashboard")}
                                className="w-full sm:w-auto inline-block bg-green-600 border border-green-700 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white rounded shadow-sm transition hover:bg-green-700"
                            >
                                Ingresar al Panel
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route("login")}
                                    className="w-full sm:w-auto inline-block bg-green-600 border border-green-700 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white rounded shadow-sm transition hover:bg-green-700 text-center"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href={route("register")}
                                    className="w-full sm:w-auto inline-block bg-white border border-gray-300 px-8 py-3 text-xs font-bold uppercase tracking-widest text-gray-700 rounded shadow-sm transition hover:bg-gray-50 hover:text-gray-900 text-center"
                                >
                                    Registrar Unidad
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* BOTÓN TÁCTICO PARA REPRODUCIR / PAUSAR */}
                <button
                    onClick={toggleAudio}
                    className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-gray-900/80 hover:bg-gray-900 text-white border border-gray-700 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                >
                    {!isPlaying ? (
                        <>
                            {/* Icono de Play (Audio pausado) */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4 text-red-400"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                                />
                            </svg>
                            Activar Himno
                        </>
                    ) : (
                        <>
                            {/* Icono de Pausa (Audio sonando) */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4 text-green-500 animate-pulse"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                                />
                            </svg>
                            Pausar Himno
                        </>
                    )}
                </button>
            </div>
        </>
    );
}
