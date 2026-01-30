import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Float, Stars, Line, Html } from '@react-three/drei';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import * as THREE from 'three';

const Node = ({ position, type, data, onClick, isSelected, onClose }) => {
    const meshRef = useRef();
    const [hovered, setHover] = useState(false);

    // Color based on status or type
    const color = useMemo(() => {
        if (type === 'regulation') return '#a855f7'; // Purple/Pink tone from button
        if (data?.status === 'COMPLIANT') return '#10b981'; // Green
        if (data?.status === 'PARTIAL') return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    }, [type, data]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(data);
                }}
            >
                <sphereGeometry args={[type === 'regulation' ? 0.3 : 0.2, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered || isSelected ? 2 : 0.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {isSelected && (
                <Html distanceFactor={10} position={[0.5, 0.5, 0]} zIndexRange={[100, 0]}>
                    <div className="glass-panel" style={{
                        width: '300px',
                        padding: '16px',
                        fontSize: '12px',
                        color: 'white',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: `1px solid ${color}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold' }}>
                                {type === 'regulation' ? `Regulation ${data.label}` : `Clause ${data.label}`}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>
                        </div>
                        <p style={{ margin: 0, opacity: 0.9 }}>{data.reasoning || data.text}</p>
                        {data.evidence && data.evidence !== 'N/A' && (
                            <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderLeft: '2px solid white' }}>
                                <span style={{ fontSize: '10px', opacity: 0.5 }}>EVIDENCE:</span>
                                <p style={{ margin: 0, fontStyle: 'italic' }}>"{data.evidence}"</p>
                            </div>
                        )}
                    </div>
                </Html>
            )}

            {hovered && !isSelected && (
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Text
                        position={[0, 0.5, 0]}
                        fontSize={0.2}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {type === 'regulation' ? data.label : data.status}
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

const ThreeScene = ({ graphData, onNodeClick, selectedNode, loading }) => {
    const nodesMap = useMemo(() => {
        if (!graphData) return {};
        const map = {};
        graphData.nodes.forEach((node, i) => {
            // Arrange in a galaxy/spiral shape
            const angle = i * 0.4;
            const radius = node.type === 'regulation' ? 5 + Math.random() * 2 : 2 + Math.random() * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 3;
            map[node.id] = [x, y, z];
        });
        return map;
    }, [graphData]);

    if (loading) {
        return (
            <Html center>
                <div style={{ textAlign: 'center', color: 'white', width: '400px' }}>
                    <div className="spinner" style={{
                        width: '60px',
                        height: '60px',
                        border: '6px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }} />
                    <h2 style={{ fontSize: '24px', letterSpacing: '2px', margin: '0 0 10px 0' }}>ANALYZING GALAXY...</h2>
                    <p style={{ opacity: 0.6 }}>LLM is cross-referencing clauses and computing compliance risk.</p>
                </div>
            </Html>
        );
    }

    if (!graphData) return null;

    return (
        <group>
            <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
            <OrbitControls enableDamping dampingFactor={0.05} />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {graphData.nodes.map((node) => (
                <Node
                    key={node.id}
                    position={nodesMap[node.id]}
                    type={node.type}
                    data={node}
                    onClick={onNodeClick}
                    isSelected={selectedNode?.id === node.id}
                    onClose={() => onNodeClick(null)}
                />
            ))}

            {graphData.edges.map((edge, i) => (
                <Connection
                    key={i}
                    start={nodesMap[edge.from]}
                    end={nodesMap[edge.to]}
                    status={edge.status}
                />
            ))}
        </group>
    );
};

const GalaxyViewport = ({ graphData, onNodeClick, selectedNode, loading }) => {
    return (
        <div style={{ width: '100%', height: '100vh', background: 'radial-gradient(circle at center, #1e1e2d 0%, #0c0c0e 100%)' }}>
            <Canvas shadows dpr={[1, 2]}>
                <ThreeScene
                    graphData={graphData}
                    onNodeClick={onNodeClick}
                    selectedNode={selectedNode}
                    loading={loading}
                />
            </Canvas>
            <style jsx="true">{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default GalaxyViewport;
