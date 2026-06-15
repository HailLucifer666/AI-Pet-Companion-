// ============================================================
// NeuraClaw — Lumenform3D (The Pet)
// Procedural screen-faced robot with full animation system
// Ember-indigo aesthetic, rounded floaty silhouette
// ============================================================

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/stores/worldStore';
import { useQualityStore } from '@/stores/qualityStore';
import { FaceScreen } from './FaceScreen';
import {
  computeAnimationState,
  getExpressionBlend,
} from './petAnim';
import {
  lerpExpression,
  getExpressionForMood,
  EXPRESSIONS,
} from './expressions';
import type { FaceConfig } from '@/types';
import { PET_COLORS } from '@/world3d/utils/colors';

const PET_SEED = 42;

export function Lumenform3D() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const antennaLeftRef = useRef<THREE.Mesh>(null);
  const antennaRightRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);

  // State
  const pet = useWorldStore((s) => s.pet);
  const environment = useWorldStore((s) => s.environment);
  const updatePet = useWorldStore((s) => s.updatePet);
  const quality = useQualityStore((s) => s.quality);

  // Animation state
  const [currentExpression, setCurrentExpression] = useState<FaceConfig>(EXPRESSIONS.neutral);
  const [targetExpression, setTargetExpression] = useState<FaceConfig>(EXPRESSIONS.neutral);
  const animTime = useRef(0);
  const expressionTime = useRef(0);

  // Materials (memoized)
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: PET_COLORS.body,
      roughness: 0.4,
      metalness: 0.6,
    }),
    bodyHighlight: new THREE.MeshStandardMaterial({
      color: PET_COLORS.bodyHighlight,
      roughness: 0.3,
      metalness: 0.7,
      emissive: PET_COLORS.bodyHighlight,
      emissiveIntensity: 0.15,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: PET_COLORS.accent,
      roughness: 0.2,
      metalness: 0.8,
      emissive: PET_COLORS.accent,
      emissiveIntensity: 0.4,
    }),
    joint: new THREE.MeshStandardMaterial({
      color: PET_COLORS.joint,
      roughness: 0.6,
      metalness: 0.4,
    }),
    antenna: new THREE.MeshStandardMaterial({
      color: PET_COLORS.antenna,
      roughness: 0.3,
      metalness: 0.7,
      emissive: PET_COLORS.antenna,
      emissiveIntensity: 0.6,
    }),
    screen: new THREE.MeshBasicMaterial({
      color: PET_COLORS.screen,
    }),
    eye: new THREE.MeshStandardMaterial({
      color: PET_COLORS.eye,
      emissive: PET_COLORS.eye,
      emissiveIntensity: 0.8,
    }),
  }), []);

  // Expression cycling based on mood
  useEffect(() => {
    const interval = setInterval(() => {
      const mood = pet.emotionalState.mood;
      const variants = ['serene', 'curious', 'excited'].includes(mood) ? 3 : 2;
      const variant = Math.floor(Math.random() * variants);
      setTargetExpression(getExpressionForMood(mood, variant));
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [pet.emotionalState.mood]);

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current || !headRef.current) return;

    // Clamp delta for frame-rate independence
    const dt = Math.min(delta, 0.05);
    animTime.current += dt;

    // Update world store position from our group position
    const pos = groupRef.current.position;
    updatePet({ position: [pos.x, pos.y, pos.z] });

    // Compute full animation state
    const targetGaze: [number, number, number] = pet.targetPosition
      ? pet.targetPosition
      : [pos.x + Math.sin(animTime.current * 0.3) * 5, 1, pos.z + Math.cos(animTime.current * 0.3) * 5];

    const moodMultiplier = pet.emotionalState.happiness * 0.5 + 0.5;

    const anim = computeAnimationState(
      animTime.current,
      dt,
      targetGaze,
      [pos.x, pos.y, pos.z],
      pet.activity,
      moodMultiplier,
      PET_SEED
    );

    // Apply breath scale to body
    bodyRef.current.scale.set(
      anim.breathScale[0] * anim.hopSquash,
      anim.breathScale[1] * anim.hopSquash,
      anim.breathScale[2] * anim.hopSquash
    );

    // Hop vertical movement
    const hopOffset = anim.hopY;
    bodyRef.current.position.y = 0.5 + hopOffset;

    // Head rotation (gaze + nod)
    headRef.current.rotation.y = THREE.MathUtils.lerp(
      headRef.current.rotation.y,
      anim.gazeYaw * 0.6,
      1 - Math.exp(-4 * dt)
    );
    headRef.current.rotation.x = THREE.MathUtils.lerp(
      headRef.current.rotation.x,
      -anim.gazePitch * 0.4 + anim.headNod,
      1 - Math.exp(-4 * dt)
    );

    // Arm poses
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.z,
        anim.armPose.leftArm[2],
        1 - Math.exp(-5 * dt)
      );
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x,
        anim.armPose.leftArm[0],
        1 - Math.exp(-5 * dt)
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.z,
        -anim.armPose.rightArm[2],
        1 - Math.exp(-5 * dt)
      );
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.x,
        anim.armPose.rightArm[0],
        1 - Math.exp(-5 * dt)
      );
    }

    // Antenna wiggle
    if (antennaLeftRef.current) {
      antennaLeftRef.current.rotation.z = anim.antennaWiggle[0];
      antennaLeftRef.current.rotation.x = anim.antennaWiggle[1];
    }
    if (antennaRightRef.current) {
      antennaRightRef.current.rotation.z = -anim.antennaWiggle[0];
      antennaRightRef.current.rotation.x = -anim.antennaWiggle[1];
    }

    // Glow intensity
    if (glowRef.current) {
      glowRef.current.intensity = THREE.MathUtils.lerp(
        glowRef.current.intensity,
        anim.glowIntensity * (quality.enableBloom ? 1.5 : 0.8),
        1 - Math.exp(-3 * dt)
      );
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = anim.glowIntensity * 0.5;
    }

    // Shadow
    if (shadowRef.current) {
      shadowRef.current.scale.setScalar(anim.shadowScale);
      const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
      if (mat.opacity !== undefined) {
        mat.opacity = 0.3 * (1 - anim.hopY * 0.5);
      }
    }

    // Smooth expression blending
    expressionTime.current += dt;
    const blendSpeed = 2;
    const blend = 1 - Math.exp(-blendSpeed * dt);
    setCurrentExpression((prev) => lerpExpression(prev, targetExpression, blend));

    // Time-of-day color shifts
    const timeOfDay = environment.timeOfDay;
    const emberIntensity = timeOfDay === 'dusk' || timeOfDay === 'night' ? 0.8 : 0.3;
    materials.accent.emissiveIntensity = THREE.MathUtils.lerp(
      materials.accent.emissiveIntensity,
      emberIntensity + anim.glowIntensity * 0.2,
      blend
    );
    materials.antenna.emissiveIntensity = THREE.MathUtils.lerp(
      materials.antenna.emissiveIntensity,
      emberIntensity * 1.2 + anim.glowIntensity * 0.3,
      blend
    );
  });

  // Blink calculation
  const blinkState = getExpressionBlend(expressionTime.current, 2.5, 0.12);

  return (
    <group ref={groupRef} position={pet.position} name="lumenform">
      {/* Shadow blob */}
      <mesh ref={shadowRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#0D0A1A" transparent opacity={0.3} />
      </mesh>

      {/* Body group (hovers) */}
      <group ref={bodyRef} position={[0, 0.5, 0]}>
        {/* Main body — rounded capsule shape */}
        <mesh castShadow receiveShadow material={materials.body}>
          <capsuleGeometry args={[0.22, 0.35, 4, 8]} />
        </mesh>

        {/* Body highlight ring */}
        <mesh position={[0, 0, -0.15]} material={materials.bodyHighlight}>
          <torusGeometry args={[0.18, 0.03, 6, 12]} />
        </mesh>

        {/* Accent stripe */}
        <mesh position={[0, 0.1, 0.16]} material={materials.accent}>
          <boxGeometry args={[0.3, 0.04, 0.05]} />
        </mesh>

        {/* Head group */}
        <group ref={headRef} position={[0, 0.35, 0]}>
          {/* Head shape */}
          <mesh castShadow material={materials.body}>
            <boxGeometry args={[0.38, 0.32, 0.35]} />
          </mesh>

          {/* Head rounding (visual softener) */}
          <mesh position={[0, 0, 0]} material={materials.bodyHighlight} scale={[0.9, 0.85, 0.85]}>
            <sphereGeometry args={[0.22, 8, 6]} />
          </mesh>

          {/* Face screen */}
          <FaceScreen
            expression={currentExpression}
            blinkState={blinkState}
          />

          {/* Antennae */}
          <group position={[-0.12, 0.18, 0]}>
            <mesh ref={antennaLeftRef} position={[0, 0.08, 0]} material={materials.antenna}>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 4]} />
            </mesh>
            <mesh position={[0, 0.16, 0]} material={materials.antenna}>
              <sphereGeometry args={[0.025, 6, 6]} />
            </mesh>
          </group>
          <group position={[0.12, 0.18, 0]}>
            <mesh ref={antennaRightRef} position={[0, 0.08, 0]} material={materials.antenna}>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 4]} />
            </mesh>
            <mesh position={[0, 0.16, 0]} material={materials.antenna}>
              <sphereGeometry args={[0.025, 6, 6]} />
            </mesh>
          </group>
        </group>

        {/* Arms */}
        <group position={[-0.28, 0.05, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.12, 0]} material={materials.body} castShadow>
            <capsuleGeometry args={[0.06, 0.2, 4, 6]} />
          </mesh>
          <mesh position={[0, -0.24, 0]} material={materials.joint}>
            <sphereGeometry args={[0.05, 6, 6]} />
          </mesh>
        </group>
        <group position={[0.28, 0.05, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.12, 0]} material={materials.body} castShadow>
            <capsuleGeometry args={[0.06, 0.2, 4, 6]} />
          </mesh>
          <mesh position={[0, -0.24, 0]} material={materials.joint}>
            <sphereGeometry args={[0.05, 6, 6]} />
          </mesh>
        </group>

        {/* Glow orb (chest) */}
        <mesh position={[0, -0.05, 0.18]} material={materials.accent}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>

        {/* Body glow light */}
        <pointLight
          ref={glowRef}
          color={PET_COLORS.accent}
          intensity={0.8}
          distance={2}
          position={[0, 0, 0.25]}
        />

        {/* Rim light */}
        <pointLight
          ref={rimLightRef}
          color={PET_COLORS.antenna}
          intensity={0.4}
          distance={1.5}
          position={[0, 0.3, -0.3]}
        />
      </group>
    </group>
  );
}
