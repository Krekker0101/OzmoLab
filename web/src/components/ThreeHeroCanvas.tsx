/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Озмо Лаб (Ozmo Lab) — Интерактивное 3D квантовое ядро на Three.js
 * Реагирует на движение курсора, смену темы и демонстрирует физические поля.
 */

import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {useLabStore} from '../store/useLabStore.ts';

export const ThreeHeroCanvas: React.FC<{className?: string}> = ({className = ''}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const {theme} = useLabStore();
  const isLight = theme === 'light';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Инициализация сцены, камеры и рендера
    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 10.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.2 : 0.8);
    scene.add(ambientLight);

    const lightCyan = new THREE.PointLight(isLight ? 0x0284c7 : 0x38bdf8, 3, 20);
    lightCyan.position.set(5, 4, 4);
    scene.add(lightCyan);

    const lightAmber = new THREE.PointLight(isLight ? 0xd97706 : 0xf59e0b, 3, 20);
    lightAmber.position.set(-5, -4, 4);
    scene.add(lightAmber);

    // 3. Основная 3D группа
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Центральное ядро атома/научной модели
    const coreGeometry = new THREE.IcosahedronGeometry(1.4, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: isLight ? 0x0284c7 : 0x0ea5e9,
      roughness: 0.2,
      metalness: 0.8,
      emissive: isLight ? 0x0369a1 : 0x0284c7,
      emissiveIntensity: isLight ? 0.4 : 0.6,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    rootGroup.add(coreMesh);

    // Внешняя геодезическая решетка ядра
    const wireGeometry = new THREE.IcosahedronGeometry(1.65, 1);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x64748b : 0x7dd3fc,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.35 : 0.6,
    });
    const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
    rootGroup.add(wireMesh);

    // 3 Орбитальных кольца электромагнитного поля
    const ringConfigs = [
      {radius: 2.8, tube: 0.035, rotX: 1.1, rotY: 0.3, color: isLight ? 0x0284c7 : 0x38bdf8},
      {radius: 3.6, tube: 0.032, rotX: 0.4, rotY: 1.2, color: isLight ? 0xd97706 : 0xfbbf24},
      {radius: 4.4, tube: 0.030, rotX: -0.8, rotY: 0.7, color: isLight ? 0x059669 : 0x34d399},
    ];

    const rings: THREE.Mesh[] = [];
    const ringGroups: THREE.Group[] = [];

    ringConfigs.forEach((cfg) => {
      const rGroup = new THREE.Group();
      rGroup.rotation.x = cfg.rotX;
      rGroup.rotation.y = cfg.rotY;

      const rGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
      const rMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.2,
        metalness: 0.9,
        emissive: cfg.color,
        emissiveIntensity: isLight ? 0.3 : 0.5,
      });
      const rMesh = new THREE.Mesh(rGeom, rMat);
      rGroup.add(rMesh);

      // Добавляем бегающий электронный квант на каждое кольцо
      const nodeGeom = new THREE.SphereGeometry(0.18, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
      });
      const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
      rGroup.add(nodeMesh);

      ringGroups.push(rGroup);
      rings.push(nodeMesh);
      rootGroup.add(rGroup);
    });

    // 4. Облако квантовых микрочастиц (400 точек)
    const particleCount = 400;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: isLight ? 0x0369a1 : 0x7dd3fc,
      size: 0.07,
      transparent: true,
      opacity: isLight ? 0.5 : 0.75,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    rootGroup.add(particles);

    // 5. Обработка движения мыши для эффекта глубины и параллакса
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.45;
      targetRotationX = -y * 0.35;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 6. Анимационный цикл (60 FPS)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Вращение ядра
      coreMesh.rotation.y = elapsedTime * 0.3;
      coreMesh.rotation.x = elapsedTime * 0.2;
      wireMesh.rotation.y = -elapsedTime * 0.2;
      wireMesh.rotation.z = elapsedTime * 0.15;

      // Пульсация ядра
      const scale = 1 + Math.sin(elapsedTime * 2) * 0.04;
      coreMesh.scale.set(scale, scale, scale);

      // Вращение орбитальных колец и движение квантов по орбите
      ringConfigs.forEach((cfg, idx) => {
        const rGroup = ringGroups[idx];
        rGroup.rotation.z += 0.005 * (idx + 1);

        const node = rings[idx];
        const angle = elapsedTime * (1.2 + idx * 0.5);
        node.position.x = Math.cos(angle) * cfg.radius;
        node.position.y = Math.sin(angle) * cfg.radius;
      });

      // Медленное вращение облака частиц
      particles.rotation.y = elapsedTime * 0.05;

      // Плавная интерполяция к положению мыши (Parallax Damping)
      rootGroup.rotation.y += (targetRotationY - rootGroup.rotation.y) * 0.05;
      rootGroup.rotation.x += (targetRotationX - rootGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Обработка ресайза
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Очистка при размонтировании
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      coreGeometry.dispose();
      coreMaterial.dispose();
      wireGeometry.dispose();
      wireMaterial.dispose();
      particleGeom.dispose();
      particleMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isLight]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full min-h-[380px] pointer-events-none select-none ${className}`}
    />
  );
};
