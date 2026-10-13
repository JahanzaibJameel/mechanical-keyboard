"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface DustMotesProps {
  readonly count: number;
  readonly bounds: THREE.Box3;
  readonly speed: number;
  readonly reducedMotion: boolean;
}

function DustMotesInner({
  count,
  bounds,
  speed,
  reducedMotion,
}: DustMotesProps) {
  const meshRef = useRef<THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null>(null);
  const dummy = useRef(new THREE.Object3D());
  const timeRef = useRef(0);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const size = useMemo(() => {
    const s = new THREE.Vector3();
    bounds.getSize(s);
    return s;
  }, [bounds]);
  const min = useMemo(() => bounds.min.clone(), [bounds]);
  const max = useMemo(() => bounds.max.clone(), [bounds]);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(0.008, 0.008),
    []
  );

  const material = useMemo(
    () => {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uColor: { value: new THREE.Color(0xffffff) },
          uOpacity: { value: 0.35 },
          uFocalLength: { value: 0.02 },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uSpeed;
          uniform float uFocalLength;
          attribute vec3 instanceOffset;
          attribute float instancePhase;
          attribute float instanceScale;
          varying float vAlpha;
          varying float vDepth;
          
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
          
          float snoise(vec3 v) {
            const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i3 = floor(v + dot(v, vec3(0.3660219)) * C.x);
            vec3 x0 = v - i3 + dot(i3, vec3(0.25)) * C.x + dot(i3, vec3(0.3333333)) * C.y;
            vec3 g1 = step(x0.yzx, x0.xyz);
            vec3 g2 = step(x0.zxy, x0.yzx);
            vec3 g = g1 + g2;
            vec3 h = 1.0 - g;
            vec3 p = g * x0 + h * (x0 - 1.0);
            vec4 j = vec4(0.0, x0.x, x0.y, x0.z);
            vec4 k = vec4(0.0, p.x, p.y, p.z);
            vec4 i = mod289(j);
            vec4 i_1 = mod289(i + vec4(0.0, 1.0, 0.0, 0.0));
            vec4 i_2 = mod289(i + vec4(0.0, 0.0, 1.0, 0.0));
            vec4 i_3 = mod289(i + vec4(0.0, 0.0, 0.0, 1.0));
            vec4 i11 = mod289(i_1 + vec4(0.0, 1.0, 0.0, 0.0));
            vec4 i12 = mod289(i_1 + vec4(0.0, 0.0, 1.0, 0.0));
            vec4 i21 = mod289(i_2 + vec4(0.0, 0.0, 0.0, 1.0));
            vec4 i22 = mod289(i_2 + vec4(0.0, 1.0, 0.0, 0.0));
            vec4 i31 = mod289(i_3 + vec4(0.0, 0.0, 1.0, 0.0));
            vec4 i32 = mod289(i_3 + vec4(0.0, 0.0, 0.0, 1.0));
            vec4 p1 = permute(i);
            vec4 p2 = permute(i_1);
            vec4 p3 = permute(i_2);
            vec4 p4 = permute(i_3);
            vec4 m1 = taylorInvSqrt(p1);
            vec4 m2 = taylorInvSqrt(p2);
            vec4 m3 = taylorInvSqrt(p3);
            vec4 m4 = taylorInvSqrt(p4);
            vec3 x1 = p1.xyz - 1.0 * m1.xyz;
            vec3 x2 = p2.xyz - 1.0 * m2.xyz;
            vec3 x3 = p3.xyz - 1.0 * m3.xyz;
            vec3 x4 = p4.xyz - 1.0 * m4.xyz;
            vec4 a1 = permute(p1);
            vec4 a2 = permute(p2);
            vec4 a3 = permute(p3);
            vec4 a4 = permute(p4);
            vec4 n = a1 * m1 + a2 * m2 + a3 * m3 + a4 * m4;
            n = n * 0.25 + 0.5;
            return n.x + n.y + n.z + n.w;
          }
          
          void main() {
            vec3 pos = position * instanceScale;
            vec3 worldPos = instanceOffset + pos;
            
            float wobble = snoise(vec3(instanceOffset.x * 0.5, uTime * uSpeed + instancePhase, instanceOffset.z * 0.5)) * 0.015;
            worldPos.x += wobble;
            worldPos.z += wobble;
            
            float yProgress = (worldPos.y - instanceOffset.y) / 0.1;
            worldPos.y += sin(uTime * 0.3 + instancePhase * 6.28) * 0.003;
            
            vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            vDepth = -mvPosition.z;
            vAlpha = 1.0 - smoothstep(0.0, uFocalLength, abs(vDepth - uFocalLength));
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          varying float vDepth;
          
          void main() {
            float dist = length(gl_PointCoord - 0.5);
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * uOpacity;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });
      return mat;
    },
    [speed]
  );

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      dummy.current.position.set(
        min.x + Math.random() * size.x,
        min.y + Math.random() * size.y,
        min.z + Math.random() * size.z
      );
      dummy.current.scale.setScalar(0.5 + Math.random() * 1.5);
      dummy.current.updateMatrix();
      mesh.setMatrixAt(i, dummy.current.matrix);

      const phase = Math.random();
      const matrix = dummy.current.matrix;
      matrix.elements[3] = phase;
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [count, min, max, size, meshRef]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    timeRef.current += delta;
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = timeRef.current;
    }

    if (speed > 0) {
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        mesh.getMatrixAt(i, matrix);
        const pos = new THREE.Vector3().setFromMatrixPosition(matrix);
        pos.y -= speed * delta * 0.3;
        
        if (pos.y < min.y - 0.05) {
          pos.y = max.y + 0.05;
          pos.x = min.x + Math.random() * size.x;
          pos.z = min.z + Math.random() * size.z;
        }
        
        matrix.setPosition(pos);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return <instancedMesh ref={meshRef as React.RefObject<THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>} args={[geometry, material, count]} frustumCulled={false} />;
}

export function DustMotes({
  count = 200,
  bounds = new THREE.Box3(new THREE.Vector3(-0.25, -0.05, -0.15), new THREE.Vector3(0.25, 0.15, 0.15)),
  speed = 0.02,
  reducedMotion = false,
}: Partial<DustMotesProps> = {}) {
  if (reducedMotion || count === 0) return null;

  return <DustMotesInner count={count} bounds={bounds} speed={speed} reducedMotion={reducedMotion} />;
}