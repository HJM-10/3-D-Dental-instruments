import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Bounds } from '@react-three/drei';
import * as THREE from 'three';

// Helper to find a slot node in the scene graph.
// Handles any variation of dot/underscore stripping by Blender GLTF exporter (e.g. Slot.001 -> Slot001 or Slot_001)
function getSlotNode(scene, slotName) {
  if (!scene || !slotName) return null;
  
  // Normalize slot name to lowercase alphanumeric only (e.g. "Slot.001" -> "slot001")
  const normalizedTarget = slotName.replace('.', '').replace('_', '').toLowerCase();

  let found = null;
  scene.traverse((child) => {
    if (!found && child.name) {
      const normalizedChildName = child.name.replace('.', '').replace('_', '').toLowerCase();
      if (normalizedChildName === normalizedTarget) {
        found = child;
      }
    }
  });
  return found;
}

// ─── Placed Drill Component ──────────────────────────────────────────────────
// Loads its own static model (from cache) so each slot retains its own geometry nodes setup.
function PlacedDrill({
  url,
  slotName,
  slotNode,
  globalScale,
  slotDrillZOffset,
  generatableObjectName,
  onSlotClick,
  animationFloatHeight = 0.02,
  animationDurationMs = 300,
}) {
  const { scene } = useGLTF(url);
  const [clone, setClone] = useState(null);
  const [animData, setAnimData] = useState(null);

  useEffect(() => {
    if (!scene || !generatableObjectName || !slotNode) return;

    let foundNode = null;
    scene.traverse((child) => {
      if (child.name === generatableObjectName && !foundNode) {
        foundNode = child;
      }
    });

    if (foundNode) {
      const c = foundNode.clone(true);
      c.visible = true;

      // Extract world transform from slotNode
      const worldPos = new THREE.Vector3();
      slotNode.getWorldPosition(worldPos);

      const worldQuat = new THREE.Quaternion();
      slotNode.getWorldQuaternion(worldQuat);

      const localUp = new THREE.Vector3(0, 1, 0);
      localUp.applyQuaternion(worldQuat);

      const finalPos = worldPos.clone().add(localUp.clone().multiplyScalar((slotDrillZOffset + animationFloatHeight) * globalScale));

      c.position.copy(finalPos);
      c.quaternion.copy(worldQuat);
      c.scale.set(globalScale, globalScale, globalScale);

      // Highlight material
      c.traverse((childMesh) => {
        if (childMesh.isMesh && childMesh.material) {
          childMesh.material = Array.isArray(childMesh.material)
            ? childMesh.material.map((m) => {
                const cm = m.clone();
                if (cm.emissive) {
                  cm.emissive.setHex(0x002244);
                  cm.emissiveIntensity = 0.35;
                }
                return cm;
              })
            : (() => {
                const cm = childMesh.material.clone();
                if (cm.emissive) {
                  cm.emissive.setHex(0x002244);
                  cm.emissiveIntensity = 0.35;
                }
                return cm;
              })();
        }
      });

      setClone(c);
      setAnimData({
        basePos: worldPos,
        localUp: localUp,
        startTime: Date.now()
      });
    } else {
      console.warn(`[PlacedDrill] Could not find generatable object "${generatableObjectName}" in GLTF:`, url);
    }
  }, [scene, generatableObjectName, slotNode, slotDrillZOffset, animationFloatHeight, globalScale, url, slotName]);

  useFrame(() => {
    if (!clone || !animData || animationDurationMs <= 0) return;
    const elapsed = Date.now() - animData.startTime;
    
    // If animation is over, snap to final height (slotDrillZOffset)
    if (elapsed > animationDurationMs) {
      const finalPos = animData.basePos.clone().add(animData.localUp.clone().multiplyScalar(slotDrillZOffset * globalScale));
      clone.position.copy(finalPos);
      return;
    }

    const progress = Math.min(elapsed / animationDurationMs, 1.0);
    // easeOutCubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const startHeight = slotDrillZOffset + animationFloatHeight;
    const targetHeight = slotDrillZOffset;
    const currentHeight = startHeight + (targetHeight - startHeight) * easeOut;

    const currentPos = animData.basePos.clone().add(animData.localUp.clone().multiplyScalar(currentHeight * globalScale));
    clone.position.copy(currentPos);
  });

  if (!clone) return null;

  return (
    <primitive
      object={clone}
      onClick={(e) => {
        e.stopPropagation();
        onSlotClick?.(slotName);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}

// ─── Scene Content ────────────────────────────────────────────────────────────
// Rendered inside <Suspense> so it can suspend while the GLTF loads.
function SceneContent({
  url,
  globalScale = 1.0,
  filledSlots = {},
  slotUrls = {},
  generatableObjectName = null,
  slotDrillZOffset = 0,
  selectedSlot = null,
  onSlotClick = null,
  slotPrefix = 'Slot.',
  animationFloatHeight = 0.02,
  animationDurationMs = 300,
}) {
  const { scene } = useGLTF(url);

  // States to hold imperatively constructed Three.js objects
  const [masterDrill, setMasterDrill] = useState(null);
  const [previewDrill, setPreviewDrill] = useState(null);

  // Debug log to inspect actual scene node names in the console
  useEffect(() => {
    if (!scene) return;
    console.group("GLTF Scene Hierarchy Diagnostic");
    console.log("Model URL:", url);
    const names = [];
    scene.traverse((child) => {
      if (child.name) {
        names.push(`${child.name} (${child.type})`);
      }
    });
    console.log("All Node Names:", names);
    console.groupEnd();
  }, [scene, url]);

  // ── Effect 1: Locate the master drill node and hide it from the default scene graph ──
  useEffect(() => {
    if (!scene || !generatableObjectName) return;

    let foundNode = null;
    scene.traverse((child) => {
      if (child.name === generatableObjectName && !foundNode) {
        foundNode = child;
      }
    });

    if (foundNode) {
      // Always hide the master drill in the main scene graph because we render a live preview
      // clone at either the default position or the selected slot.
      foundNode.visible = false;
      setMasterDrill(foundNode);
    } else {
      setMasterDrill(null);
    }

    return () => {
      if (foundNode) foundNode.visible = true;
    };
  }, [scene, generatableObjectName]);

  // ── Effect 3: Compute live preview transforms and prepare live preview clone ──
  useEffect(() => {
    if (!scene || !masterDrill || !selectedSlot) {
      setPreviewDrill(null);
      return;
    }

    scene.updateWorldMatrix(true, true);

    let finalPos = null;
    let finalQuat = null;

    const slotNode = getSlotNode(scene, selectedSlot);
    if (slotNode) {
      const worldPos = new THREE.Vector3();
      slotNode.getWorldPosition(worldPos);

      const worldQuat = new THREE.Quaternion();
      slotNode.getWorldQuaternion(worldQuat);

      const localUp = new THREE.Vector3(0, 1, 0);
      localUp.applyQuaternion(worldQuat);

      // Offset vertically along the slot's local Y-up axis in world coordinates + float height
      finalPos = worldPos.clone().add(localUp.clone().multiplyScalar((slotDrillZOffset + animationFloatHeight) * globalScale));
      finalQuat = worldQuat;
    } else {
      console.warn(`Could not locate selected slot node: "${selectedSlot}"`);
      setPreviewDrill(null);
      return;
    }

    const clone = masterDrill.clone(true);
    clone.visible = true;

    // Apply transforms directly to the cloned object
    clone.position.copy(finalPos);
    clone.quaternion.copy(finalQuat);
    clone.scale.set(globalScale, globalScale, globalScale);

    // Apply preview active highlight
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = Array.isArray(child.material)
          ? child.material.map((m) => {
              const cm = m.clone();
              if (cm.emissive) {
                cm.emissive.setHex(0x004488);
                cm.emissiveIntensity = 0.55;
              }
              return cm;
            })
          : (() => {
              const cm = child.material.clone();
              if (cm.emissive) {
                cm.emissive.setHex(0x004488);
                cm.emissiveIntensity = 0.55;
              }
              return cm;
            })();
      }
    });

    setPreviewDrill({
      object: clone,
    });
  }, [scene, masterDrill, selectedSlot, slotDrillZOffset, animationFloatHeight, globalScale]);

  return (
    <>
      {/* Main static scene wrapper — no globalScale here; Blender already exports correct units. Bounds handles framing. */}
      <primitive
        object={scene}
        onClick={(e) => {
          e.stopPropagation();
          const prefix = slotPrefix || 'Slot.';

          // Traverse ancestors to check if a clone or slot was clicked
          let curr = e.object;
          let clickedSlot = null;
          while (curr) {
            if (curr.name) {
              // Normalize name by replacing dot-to-underscore formats back to dots
              const prefixClean = prefix.replace('.', '').replace('_', '').toLowerCase();
              const nodeNameClean = curr.name.replace('.', '').replace('_', '').toLowerCase();

              if (nodeNameClean.startsWith(prefixClean)) {
                const numPart = nodeNameClean.slice(prefixClean.length);
                clickedSlot = `${prefix}${numPart}`; // e.g. "Slot.001"
                break;
              }
            }
            curr = curr.parent;
          }

          if (clickedSlot) {
            onSlotClick?.(clickedSlot);
          }
        }}
      />

      {/* Render placed drills in world space, loading their slot-specific modelUrl configurations */}
      {Object.keys(filledSlots)
        .filter((slotName) => slotName !== selectedSlot)
        .map((slotName) => {
          const slotNode = getSlotNode(scene, slotName);
          const drillUrl = slotUrls[slotName] || url;
          if (!slotNode) return null;

          return (
            <Suspense key={slotName} fallback={null}>
              <PlacedDrill
                url={drillUrl}
                slotName={slotName}
                slotNode={slotNode}
                globalScale={globalScale}
                slotDrillZOffset={slotDrillZOffset}
                generatableObjectName={generatableObjectName}
                onSlotClick={onSlotClick}
                animationFloatHeight={animationFloatHeight}
                animationDurationMs={animationDurationMs}
              />
            </Suspense>
          );
        })}

      {/* Render live preview drill in world space */}
      {previewDrill && (
        <primitive
          object={previewDrill.object}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
          }}
        />
      )}
    </>
  );
}

// ─── Placeholder shown before a model URL is available ───────────────────────
function EmptySlate() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        gap: '10px',
      }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
      <p style={{ color: '#555', fontWeight: '500', margin: 0 }}>
        Click &ldquo;Preview Drill&rdquo; to generate the 3D model.
      </p>
    </div>
  );
}

// ─── Public Component ─────────────────────────────────────────────────────────
export default function BlenderViewer({
  modelUrl,
  globalScale = 1.0,
  filledSlots = {},
  slotUrls = {},
  generatableObjectName = null,
  slotDrillZOffset = 0,
  selectedSlot = null,
  onSlotClick = null,
  slotPrefix = 'Slot.',
  lightingIntensity = 1.0,
  schema = null,
}) {
  const animationFloatHeight = schema?.animationFloatHeight ?? 0.02;
  const animationDurationMs = schema?.animationDurationMs ?? 300;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {!modelUrl && <EmptySlate />}

      <Canvas camera={{ position: [0, 0, 5], fov: 50, near: 0.001, far: 100000 }}>
        {/* Full self-contained lighting — no HDR fetch needed */}
        <ambientLight intensity={0.6 * lightingIntensity} />
        <hemisphereLight skyColor="#ddeeff" groundColor="#443322" intensity={1.2 * lightingIntensity} />
        <directionalLight position={[8, 10, 6]} intensity={2.5 * lightingIntensity} castShadow />
        <directionalLight position={[-6, -4, -5]} intensity={0.8 * lightingIntensity} />
        <pointLight position={[0, 6, 0]} intensity={1.0 * lightingIntensity} color="#ffffff" />

        <Suspense fallback={null}>
          <Bounds fit clip margin={1.3}>
            {modelUrl && (
              <SceneContent
                key={modelUrl}
                url={modelUrl}
                globalScale={1.0}
                filledSlots={filledSlots}
                slotUrls={slotUrls}
                generatableObjectName={generatableObjectName}
                slotDrillZOffset={slotDrillZOffset}
                selectedSlot={selectedSlot}
                onSlotClick={onSlotClick}
                slotPrefix={slotPrefix}
                animationFloatHeight={animationFloatHeight}
                animationDurationMs={animationDurationMs}
              />
            )}
          </Bounds>
        </Suspense>

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}
