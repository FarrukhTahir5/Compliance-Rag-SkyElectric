import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ReactiveBackground - Animated background that reacts to chat states
 * States: 'idle' | 'typing' | 'thinking' | 'response'
 */
const ReactiveBackground = ({ state = 'idle' }) => {
    // Configuration per state
    const stateConfig = {
        idle: {
            colors: ['#4f46e5', '#7c3aed', '#2563eb', '#0ea5e9'],
            opacity: 0.2,
            particleCount: 20
        },
        typing: {
            colors: ['#3b82f6', '#2dd4bf', '#0ea5e9', '#6366f1'],
            opacity: 0.3,
            particleCount: 30
        },
        thinking: {
            colors: ['#a855f7', '#ec4899', '#f43f5e', '#8b5cf6'],
            opacity: 0.4,
            particleCount: 40
        },
        response: {
            colors: ['#10b981', '#34d399', '#059669', '#14b8a6'],
            opacity: 0.5,
            particleCount: 50
        }
    };

    const config = stateConfig[state] || stateConfig.idle;

    // Generate mesh points
    const meshPoints = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 40 + Math.random() * 40, // in % of viewport
            duration: 15 + Math.random() * 15
        }));
    }, []);

    // Generate small particles
    const particles = useMemo(() => {
        return Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 2 + Math.random() * 4,
            duration: 10 + Math.random() * 10
        }));
    }, []);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
            background: '#0f172a'
        }}>
            {/* Mesh Gradient Blobs */}
            {meshPoints.map((point, idx) => (
                <motion.div
                    key={`mesh-${point.id}`}
                    animate={{
                        x: ['0%', '20%', '-20%', '0%'],
                        y: ['0%', '-15%', '15%', '0%'],
                        scale: [1, 1.2, 0.8, 1],
                        rotate: [0, 90, 180, 270, 360]
                    }}
                    transition={{
                        duration: point.duration,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    style={{
                        position: 'absolute',
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                        width: `${point.size}vw`,
                        height: `${point.size}vw`,
                        background: `radial-gradient(circle, ${config.colors[idx % config.colors.length]} 0%, transparent 70%)`,
                        filter: 'blur(80px)',
                        opacity: config.opacity,
                        transformOrigin: 'center center',
                        mixBlendMode: 'screen'
                    }}
                />
            ))}

            {/* Floating Particles */}
            {particles.slice(0, config.particleCount).map((p) => (
                <motion.div
                    key={`particle-${p.id}`}
                    animate={{
                        y: ['0%', '-100%'],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 10
                    }}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        background: 'white',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                    }}
                />
            ))}

            {/* Noise Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.03,
                pointerEvents: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />
        </div>
    );
};

export default ReactiveBackground;
