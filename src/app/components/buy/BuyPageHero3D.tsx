// @ts-nocheck — Three.js JSX intrinsic elements require @react-three/fiber type augmentation
"use client";

import { Suspense, useRef, useState, useEffect, Component, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";

// ─── Error boundary to catch Three.js crashes gracefully ───
class Canvas3DErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Static fallback hero (no Three.js) ───
function StaticHero({
  cityName,
  cityId,
  agent,
  isLight,
}: {
  cityName: string;
  cityId: string;
  agent: AgentProfile;
  isLight: boolean;
}) {
  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      <Image
        src={agent.heroPhoto}
        alt={`${cityName} real estate`}
        fill
        className="object-cover"
        priority
      />
      <div className={`absolute inset-0 ${isLight ? "bg-white/50" : "bg-black/60"}`} />
      <HeroOverlay cityName={cityName} cityId={cityId} agent={agent} isLight={isLight} />
    </section>
  );
}

// ─── Shared text overlay ───
function HeroOverlay({
  cityName,
  cityId,
  agent,
  isLight,
}: {
  cityName: string;
  cityId: string;
  agent: AgentProfile;
  isLight: boolean;
}) {
  return (
    <>
      <div className={`absolute inset-0 z-10 ${
        isLight
          ? "bg-gradient-to-b from-white/60 via-transparent to-white/80"
          : "bg-gradient-to-b from-black/50 via-transparent to-black/70"
      }`} />

      <div className="relative z-20 h-full flex flex-col justify-end pb-16 md:pb-20 px-6 max-w-5xl mx-auto">
        <div className="space-y-4">
          <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] ${
            isLight ? "text-gray-900" : "text-white"
          }`}>
            {cityName}
          </h1>
          <p className={`text-xl md:text-2xl font-medium max-w-xl ${
            isLight ? "text-gray-700" : "text-gray-300"
          }`}>
            Find your home with{" "}
            <span style={{ color: agent.brandColor }} className="font-bold">
              {agent.name}
            </span>
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/neighborhoods/${cityId}`}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${agent.brandColor}, ${agent.secondaryColor})` }}
            >
              Browse Listings
            </Link>
            <Link
              href="/book-appointment"
              className={`px-6 py-3 rounded-xl font-semibold transition-all border-2 hover:scale-105 ${
                isLight
                  ? "border-gray-300 text-gray-900 bg-white/80 hover:bg-white"
                  : "border-white/20 text-white bg-white/10 hover:bg-white/20"
              }`}
            >
              Book Consultation
            </Link>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
              <Image src={agent.headshot} alt={agent.name} fill className="object-cover" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                {agent.name}
              </p>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                {agent.brokerageName} · DRE# {agent.licenseNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className={`w-6 h-6 ${isLight ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </>
  );
}

// ─── 3D Scene (lazy-loaded internals) ───
function ThreeScene({ brandColor, isLight }: { brandColor: string; isLight: boolean }) {
  const [threeReady, setThreeReady] = useState(false);
  const [ThreeComponents, setThreeComponents] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    // Dynamically import Three.js modules to avoid SSR issues
    Promise.all([
      import("@react-three/fiber"),
      import("@react-three/drei"),
    ]).then(([fiber, drei]) => {
      if (!mounted) return;
      setThreeComponents({ Canvas: fiber.Canvas, Float: drei.Float, Environment: drei.Environment, RoundedBox: drei.RoundedBox, MeshDistortMaterial: drei.MeshDistortMaterial });
      setThreeReady(true);
    }).catch(() => {
      // Three.js failed to load — stay with fallback
    });

    return () => { mounted = false; };
  }, []);

  if (!threeReady || !ThreeComponents) return null;

  const { Canvas, Float, Environment, RoundedBox, MeshDistortMaterial } = ThreeComponents;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 1, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={isLight ? 0.8 : 0.4} />
          <directionalLight position={[5, 5, 5]} intensity={isLight ? 1 : 0.6} />
          <pointLight position={[-3, 3, 2]} intensity={0.5} color={brandColor} />

          <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <group>
              {/* Base */}
              <RoundedBox args={[2.4, 0.3, 2]} radius={0.05} position={[0, -0.6, 0]}>
                <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.7} />
              </RoundedBox>
              {/* Main Body */}
              <RoundedBox args={[2, 1.2, 1.6]} radius={0.05} position={[0, 0.15, 0]}>
                <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} />
              </RoundedBox>
              {/* Roof */}
              <mesh position={[0, 1.15, 0]}>
                <coneGeometry args={[1.7, 0.8, 4]} />
                <meshStandardMaterial color={brandColor} metalness={0.4} roughness={0.5} />
              </mesh>
              {/* Door */}
              <RoundedBox args={[0.4, 0.6, 0.05]} radius={0.03} position={[0, -0.15, 0.83]}>
                <meshStandardMaterial color="#78350f" metalness={0.2} roughness={0.6} />
              </RoundedBox>
              {/* Ground */}
              <mesh position={[0, -0.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[3, 32]} />
                <MeshDistortMaterial color="#166534" speed={2} distort={0.1} radius={1} />
              </mesh>
            </group>
          </Float>

          <Environment preset={isLight ? "sunset" : "night"} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Main Export ───
export default function BuyPageHero3D({
  cityName,
  cityId,
  agent,
}: {
  cityName: string;
  cityId: string;
  agent: AgentProfile;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    // Enable 3D on desktop
    const isMobile = window.innerWidth < 768;
    if (!isMobile) setUse3D(true);
  }, []);

  if (!use3D) {
    return <StaticHero cityName={cityName} cityId={cityId} agent={agent} isLight={isLight} />;
  }

  return (
    <section className={`relative w-full h-[70vh] min-h-[500px] overflow-hidden ${isLight ? "bg-gradient-to-br from-blue-50 to-cyan-50" : "bg-gradient-to-br from-gray-900 to-black"}`}>
      <Canvas3DErrorBoundary
        fallback={
          <>
            <Image src={agent.heroPhoto} alt={cityName} fill className="object-cover" priority />
            <div className={`absolute inset-0 ${isLight ? "bg-white/50" : "bg-black/60"}`} />
          </>
        }
      >
        <ThreeScene brandColor={agent.brandColor} isLight={isLight} />
      </Canvas3DErrorBoundary>
      <HeroOverlay cityName={cityName} cityId={cityId} agent={agent} isLight={isLight} />
    </section>
  );
}
