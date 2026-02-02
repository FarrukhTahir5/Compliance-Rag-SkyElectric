import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Stars, Line, Html, useCursor } from '@react-three/drei';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import * as THREE from 'three';

const Node = ({ id, position: initialPosition, label, type, data, isSelected, onClick, onPositionChange, onDragStart, onDragEnd }) => {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);
    const [position, setPosition] = useState(initialPosition);
    const [dragging, setDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState(null);
    const { camera, mouse } = useThree();

    useCursor(hovered);

    const handleMeshClick = (e) => {
        e.stopPropagation();
        if (!dragging) {
            console.log("Mesh clicked, selecting node:", data.label);
            onClick(data);
        }
    };

    const onPointerDown = (e) => {
        e.stopPropagation();
        setDragStartPos([mouse.x, mouse.y]);
        setDragging(true);
        onDragStart(); // Signal to ThreeScene to disable OrbitControls
        document.body.style.cursor = 'grabbing';
    };

    const onPointerUp = (e) => {
        if (dragging) {
            // Check if this was a click (minimal mouse movement) or a drag
            if (dragStartPos) {
                const dragDistance = Math.sqrt(
                    Math.pow(mouse.x - dragStartPos[0], 2) +
                    Math.pow(mouse.y - dragStartPos[1], 2)
                );
                if (dragDistance < 0.01) { // Small threshold for click vs drag
                    console.log("Node clicked (via pointer up), selecting:", data.label);
                    onClick(data);
                }
            }
            setDragging(false);
            setDragStartPos(null);
            onDragEnd(); // Re-enable OrbitControls
            document.body.style.cursor = 'auto';
        }
    };

    const onPointerMove = (e) => {
        if (!dragging) return;
        e.stopPropagation();

        // Project mouse position to 3D space at the node's depth
        const planeIntersectPoint = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Use a virtual plane at z=0 for dragging
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        raycaster.ray.intersectPlane(plane, planeIntersectPoint);

        const newPos = [planeIntersectPoint.x, planeIntersectPoint.y, 0];
        setPosition(newPos);
        onPositionChange(id, newPos);
    };

    useEffect(() => {
        if (dragging) {
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [dragging, onPointerMove, onPointerUp]);

    useEffect(() => {
        setPosition(initialPosition);
    }, [initialPosition]);

    // Color based on status or type
    const color = useMemo(() => {
        if (type === 'regulation') return '#a855f7'; // Purple/Pink tone from button
        if (data?.status === 'COMPLIANT') return '#10b981'; // Green
        if (data?.status === 'PARTIAL') return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    }, [type, data]);

    return (
        <group position={position}>
            {/* Fresnel Glow Shell */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <sphereGeometry args={[type === 'regulation' ? 0.15 : 0.08, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.15}
                    side={THREE.BackSide}
                    emissive={color}
                    emissiveIntensity={2}
                />
            </mesh>

            {/* Core Planet */}
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onPointerDown={onPointerDown}
                onClick={handleMeshClick}
            >
                <sphereGeometry args={[type === 'regulation' ? 0.15 : 0.08, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered || isSelected ? 4 : 1}
                    metalness={1}
                    roughness={0}
                    bumpScale={0.05}
                    toneMapped={false}
                />
            </mesh>

            {/* Planetary Rings for Standards */}
            {type === 'regulation' && (
                <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                    <ringGeometry args={[0.2, 0.4, 64]} />
                    <meshStandardMaterial
                        color={color}
                        transparent
                        opacity={0.4}
                        side={THREE.DoubleSide}
                        emissive={color}
                        emissiveIntensity={1}
                    />
                </mesh>
            )}

            {isSelected && (
                <Html distanceFactor={10} position={[0.5, 0.5, 0]} zIndexRange={[100, 0]}>
                    <div className="glass-panel" style={{
                        width: '300px',
                        padding: '16px',
                        fontSize: '12px',
                        color: 'white',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: `1px solid ${color}`,
                        backdropFilter: 'blur(20px)',
                        background: 'rgba(15, 15, 20, 0.8)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                {type === 'regulation' ? `Standard ${data.label}` : `Requirement ${data.label}`}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log("X button clicked, calling onClick(null)"); // Debug log
                                    onClick(null);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <p style={{ margin: 0, opacity: 0.9 }}>{data.reasoning || data.text}</p>
                        {data.evidence && data.evidence !== 'N/A' && (
                            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(168, 85, 247, 0.1)', borderLeft: '2px solid #a855f7' }}>
                                <span style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '1px' }}>EVIDENCE:</span>
                                <p style={{ margin: 0, fontStyle: 'italic' }}>"{data.evidence}"</p>
                            </div>
                        )}
                    </div>
                </Html>
            )}

            {hovered && !isSelected && (
                <Float speed={5} rotationIntensity={0.2} floatIntensity={0.2}>
                    <Text
                        position={[0, 0.7, 0]}
                        fontSize={0.18}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                        depthTest={false}
                        renderOrder={999}
                        outlineWidth={0.02}
                        outlineColor="#000000"
                        fontWeight="bold"
                    >
                        {`DOC #${data.doc_id || '?'} | PAGE ${data.page || '?'} | LINE ${data.label || '?'}`}
                    </Text>
                </Float>
            )}
        </group>
    );
};

const Connection = ({ start, end, status }) => {
    const color = status === 'COMPLIANT' ? '#10b981' : status === 'PARTIAL' ? '#f59e0b' : '#ef4444';

    const points = useMemo(() => [
        new THREE.Vector3(...start),
        new THREE.Vector3(...end)
    ], [start, end]);

    return (
        <Line
            points={points}
            color={color}
            lineWidth={2}
            transparent
            opacity={0.6}
        />
    );
};

const ThreeScene = ({ graphData: data, onNodeClick, selectedNode, loading }) => {
    const [nodePositions, setNodePositions] = useState({});
    const [isDragging, setIsDragging] = useState(false);

    // Initialize/Update node positions when data changes
    useEffect(() => {
        if (!data) return;
        const initialPositions = {};
        data.nodes.forEach((node, idx) => {
            if (node.type === 'regulation') {
                const angle = (idx / data.nodes.filter(n => n.type === 'regulation').length) * Math.PI * 2;
                initialPositions[node.id] = [Math.cos(angle) * 2, Math.sin(angle) * 2, 0];
            } else {
                initialPositions[node.id] = [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0];
            }
        });
        setNodePositions(initialPositions);
    }, [data]);

    const handlePositionChange = (id, pos) => {
        setNodePositions(prev => ({ ...prev, [id]: pos }));
    };

    if (loading) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0c0c0e' }}>
                <div className="spinner" style={{ width: '60px', height: '60px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <h2 style={{ marginTop: '24px', letterSpacing: '4px', background: 'linear-gradient(to right, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                    INSPECTING SKYCOMPLIANCE™...
                </h2>
                <style jsx="true">{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
            <color attach="background" args={['#0c0c0e']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                makeDefault
                enabled={!isDragging}
            />

            {data?.nodes?.length > 0 && Object.keys(nodePositions).length > 0 && data.nodes.map((node) => (
                <Node
                    key={node.id}
                    id={node.id}
                    position={nodePositions[node.id] || [0, 0, 0]}
                    label={node.label}
                    type={node.type}
                    data={node}
                    isSelected={selectedNode?.id === node.id}
                    onClick={(nodeData) => onNodeClick(nodeData)}
                    onPositionChange={handlePositionChange}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                />
            ))}

            {data && Object.keys(nodePositions).length > 0 && data.edges.map((edge, idx) => (
                <Connection
                    key={idx}
                    start={nodePositions[edge.from]}
                    end={nodePositions[edge.to]}
                    status={edge.status}
                />
            ))}
        </Canvas>
    );
};

const GalaxyViewport = ({ graphData, onNodeClick, selectedNode, loading }) => {
    return (
        <div style={{ width: '100%', height: '100vh', background: 'radial-gradient(circle at center, #1e1e2d 0%, #0c0c0e 100%)' }}>
            <ThreeScene
                graphData={graphData}
                onNodeClick={onNodeClick}
                selectedNode={selectedNode}
                loading={loading}
            />
        </div>
    );
};

export default GalaxyViewport;
