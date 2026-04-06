"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, MeshDistortMaterial, RoundedBox } from "@react-three/drei";
import { useTheme } from "@/app/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import type { AgentProfile } from "@/app/hooks/useAgentProfile";
import * as THREE from "three";

// ─── 3D House Model ───
function HouseModel({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15 + state.clock.elapsedTime * 0.05;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <group ref={group} scale={hovered ? 1.05 : 1}>
      {/* Base / Foundation */}
      <RoundedBox
        args={[2.4, 0.3, 2]}
        radius={0.05}
        position={[0, -0.6, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.7} />
      </RoundedBox>

      {/* Main Body */}
      <RoundedBox
        args={[2, 1.2, 1.6]}
        radius={0.05}
        position={[0, 0.15, 0]}
      >
        <meshStandardMaterial color="#f8fafc" metalness={0.1} roughness={0.8} />
      </RoundedBox>

      {/* Roof */}
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.7, 0.8, 4]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Door */}
      <RoundedBox args={[0.4, 0.6, 0.05]} radius={0.03} position={[0, -0.15, 0.83]}>
        <meshStandardMaterial color="#78350f" metalness={0.2} roughness={0.6} />
      </RoundedBox>

      {/* Windows */}
      {[[-0.6, 0.3, 0.83], [0.6, 0.3, 0.83]].map((pos, i) => (
        <RoundedBox key={i} args={[0.35, 0.35, 0.05]} radius={0.02} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#bfdbfe" metalness={0.5} roughness={0.2} transparent opacity={0.8} />
        </RoundedBox>
      ))}

      {/* Ground plane */}
      <mesh position={[0, -0.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 32]} />
        <MeshDistortMaterial color="#166534" speed={2} distort={0.1} radius={1} />
      </mesh>
    </group>
  );
}

// ─── Floating Particles ───
function Particles({ count = 30, color }: { count?: number; color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  useEffect(() => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      dummy.scale.setScalar(0.02 + Math.random() * 0.04);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      mesh.current.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.position.y += Math.sin(state.clock.elapsedTime + i) * 0.002;
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color={color} transparent opacity={0.4} />
    </instancedMesh>
  );
}

// ─── Main Hero Component ───
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
  const [canRender3D, setCanRender3D] = useState(true);

  // Detect low-power devices
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const isLowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    if (isMobile && isLowPower) setCanRender3D(false);
  }, []);

  return (
    <section className="relative w-full h-[100vh] min-h-[600px] overflow-hidden">
      {/* 3D Canvas Background */}
      {canRender3D ? (
        <div className="absolute inset-0 z-0">
          <Canvas
            camera={{ position: [0, 1, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={isLight ? 0.8 : 0.4} />
              <directionalLight position={[5, 5, 5]} intensity={isLight ? 1 : 0.6} castShadow />
              <pointLight position={[-3, 3, 2]} intensity={0.5} color={agent.brandColor} />
              <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <HouseModel color={agent.brandColor} />
              </Float>
              <Particles color={agent.brandColor} />
              <Environment preset={isLight ? "sunset" : "night"} />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        /* Static fallback */
        <div className="absolute inset-0 z-0">
          <Image
            src={agent.heroPhoto}
            alt={`${cityName} real estate`}
            fill
            className="object-cover"
            priority
          />
          <div className={`absolute inset-0 ${isLight ? "bg-white/40" : "bg-black/60"}`} />
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className={`absolute inset-0 z-10 ${
        isLight
          ? "bg-gradient-to-b from-white/70 via-transparent to-white/90"
          : "bg-gradient-to-b from-black/60 via-transparent to-black/80"
      }`} />

      {/* Content Overlay */}
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

          {/* CTAs */}
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

          {/* Agent badge */}
          <div className="flex items-center gap-3 pt-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
              <Image
                src={agent.headshot}
                alt={agent.name}
                fill
                className="object-cover"
              />
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

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
        <svg className={`w-6 h-6 ${isLight ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
