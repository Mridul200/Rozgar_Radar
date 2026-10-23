"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function CareerNodes3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // Scene, Camera, Renderer
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060a12, 0.035);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for objects
    const group = new THREE.Group();
    scene.add(group);

    // Career Hub Nodes
    const nodeData = [
      { name: "Bengaluru", color: 0x38bdf8, pos: [-4, 2, 0] },
      { name: "Hyderabad", color: 0x818cf8, pos: [4, 2.5, -2] },
      { name: "Pune", color: 0x34d399, pos: [-3, -2.5, 1] },
      { name: "Delhi NCR", color: 0xf472b6, pos: [3.5, -2, -1] },
      { name: "Mumbai", color: 0x38bdf8, pos: [0, 3.5, 1] },
      { name: "Remote India", color: 0xa78bfa, pos: [0, -3.2, 0] },
      { name: "AI / ML Agent", color: 0x60a5fa, pos: [-1.8, 0, 2] },
      { name: "Full Stack", color: 0x2dd4bf, pos: [2, 0.5, 1.5] },
      { name: "Cloud Architect", color: 0xfbbf24, pos: [-0.5, 1.5, -3] },
      { name: "FastAPI / Python", color: 0x38bdf8, pos: [1.2, -1.2, 2.5] },
    ];

    const nodesMesh: THREE.Mesh[] = [];
    const nodeGeometry = new THREE.SphereGeometry(0.35, 24, 24);

    nodeData.forEach((node) => {
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: node.color,
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.position.set(node.pos[0], node.pos[1], node.pos[2]);
      group.add(mesh);
      nodesMesh.push(mesh);

      // Outer glow ring
      const ringGeo = new THREE.RingGeometry(0.45, 0.52, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(mesh.position);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    });

    // Connecting Network Lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.22,
    });

    for (let i = 0; i < nodeData.length; i++) {
      for (let j = i + 1; j < nodeData.length; j++) {
        const p1 = new THREE.Vector3(...nodeData[i].pos);
        const p2 = new THREE.Vector3(...nodeData[j].pos);
        if (p1.distanceTo(p2) < 6.5) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const line = new THREE.Line(lineGeo, lineMat);
          group.add(line);
        }
      }
    }

    // Ambient floating dust particles
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
    pointLight.position.set(5, 5, 10);
    scene.add(pointLight);

    const purpleLight = new THREE.PointLight(0x818cf8, 2, 50);
    purpleLight.position.set(-5, -5, 8);
    scene.add(purpleLight);

    // Mouse movement parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.4;
      targetY = y * 0.4;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      group.rotation.y = elapsed * 0.08 + mouseX;
      group.rotation.x = Math.sin(elapsed * 0.05) * 0.15 + mouseY;

      // Pulse nodes
      nodesMesh.forEach((mesh, index) => {
        const scale = 1 + Math.sin(elapsed * 2 + index) * 0.08;
        mesh.scale.set(scale, scale, scale);
      });

      particles.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
        <div className="max-w-xs">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            AI
          </div>
          <p className="text-sm font-medium text-slate-300">Intelligent Career Constellation</p>
          <p className="text-xs text-slate-500 mt-1">Connecting India's top tech hubs with verified high-growth opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[360px] sm:h-[460px] md:h-[520px] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
      aria-label="3D Interactive Career Opportunity Constellation"
    >
      <div className="absolute top-3 right-4 z-10 px-2.5 py-1 rounded-full bg-slate-950/70 border border-primary/20 text-[11px] font-medium text-primary backdrop-blur-md flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
        Live 3D Career Opportunity Graph
      </div>
    </div>
  );
}
