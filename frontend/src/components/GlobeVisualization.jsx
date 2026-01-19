import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import api from '../api';
import { Box, Typography, Paper, CircularProgress, Chip } from '@mui/material';

// --- Constants ---
const EARTH_RADIUS = 5;

// --- Helper Functions ---
// Convert Lat/Lng to Vector3 on sphere
function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// Generate curve points for arc between two points
function getSplineFromCoords(startLat, startLng, endLat, endLng, radius) {
    const start = latLngToVector3(startLat, startLng, radius);
    const end = latLngToVector3(endLat, endLng, radius);

    // Midpoint for curve height
    // Determine height based on distance
    const distance = start.distanceTo(end);
    const height = distance * 0.5; // simple heuristic

    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius + height);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve;
}

// --- Components ---

function Earth() {
    const textureLoader = new THREE.TextureLoader();
    // Using a valid placeholder or color if texture fails
    // Ideally, include assets/earth_texture.jpg in project
    return (
        <mesh>
            <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
            <meshStandardMaterial
                color="#1a237e"
                roughness={0.6}
                metalness={0.1}
                emissive="#0d47a1"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

function RouteArc({ route, radius }) {
    const curve = useMemo(() => {
        return getSplineFromCoords(route.start_lat, route.start_lng, route.end_lat, route.end_lng, radius);
    }, [route, radius]);

    const points = useMemo(() => curve.getPoints(50), [curve]);

    // Determine color based on simple intensity heuristic (just strictly green -> red for now)
    // Real implementation could map emissions value to HSL
    const color = new THREE.Color().setHSL(Math.max(0, 0.33 - (route.emissions / 1000 * 0.33)), 1, 0.5); // Green (0.33) to Red (0)

    return (
        <line>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    itemSize={3}
                    array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                />
            </bufferGeometry>
            <lineBasicMaterial color={color} linewidth={2} transparent opacity={0.6} />
        </line>
    );
}

function HotspotMarker({ marker, radius, onClick }) {
    const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius), [marker, radius]);

    // Height/Size based on emissions
    // Log scale to prevent massive pillars
    const height = Math.log(marker.emissions + 1) * 0.5 + 0.5;

    // Look at center of earth so cylinder stands up
    const meshRef = useRef();
    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.lookAt(0, 0, 0);
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(marker); }}>
                {/* Visual cylinder pointing out */}
                <cylinderGeometry args={[0.1, 0.1, height, 8]} />
                <meshStandardMaterial color="#ff5252" emissive="#ff0000" emissiveIntensity={0.5} />
            </mesh>
            {/* Invisible larger hit sphere for easier clicking */}
            <mesh visible={false} onClick={(e) => { e.stopPropagation(); onClick(marker); }}>
                <sphereGeometry args={[0.3, 8, 8]} />
            </mesh>
        </group>
    );
}

function LocationLabel({ marker, radius }) {
    const position = useMemo(() => latLngToVector3(marker.lat, marker.lng, radius * 1.05), [marker, radius]);
    return (
        <Html position={position} center distanceFactor={15}>
            <div style={{ color: 'white', fontSize: '8px', textShadow: '0 0 2px black', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>
                {marker.location_name}
            </div>
        </Html>
    )
}


export default function GlobeVisualization({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState(null);

    useEffect(() => {
        if (!projectId) return;

        setLoading(true);
        api.get(`/globe-data/${projectId}/`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch globe data", err);
                setLoading(false);
            });
    }, [projectId]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px" bgcolor="#000">
                <CircularProgress />
            </Box>
        );
    }

    if (data?.error) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="400px" bgcolor="#000">
            <Typography color="error">Error loading map: {data.error}</Typography>
        </Box>
    );

    if (!data) return <Typography>No data available</Typography>;

    return (
        <Box position="relative" height="600px" width="100%" bgcolor="#050510" borderRadius={2} overflow="hidden">

            {/* Overlay Stats */}
            <Paper
                elevation={3}
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 10,
                    p: 2,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    maxWidth: 300
                }}
            >
                <Typography variant="h6" gutterBottom>Supply Chain Footprint</Typography>
                {data.statistics ? (
                    <>
                        <Typography variant="body2">Mapped Emissions: <strong>{data.statistics.mapped_emissions?.toFixed(2) || "0.00"}</strong> tCO₂e</Typography>
                        <Typography variant="body2">Total Emissions: <strong>{data.statistics.total_emissions?.toFixed(2) || "0.00"}</strong> tCO₂e</Typography>
                        <Box mt={1}>
                            <Chip
                                size="small"
                                label={`${((data.statistics.mapped_emissions / (data.statistics.total_emissions || 1)) * 100).toFixed(0)}% Mapped`}
                                color={data.statistics.mapped_emissions > 0 ? "success" : "warning"}
                            />
                        </Box>
                    </>
                ) : (
                    <Typography variant="body2" color="warning.main">Statistics unavailable</Typography>
                )}

                {selectedMarker && (
                    <Box mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.2)">
                        <Typography variant="subtitle2" color="primary.light">Selected Location:</Typography>
                        <Typography variant="body1" fontWeight="bold">{selectedMarker.location_name}</Typography>
                        <Typography variant="body2">{selectedMarker.name}</Typography>
                        <Typography variant="body2" color="error">{selectedMarker.emissions.toFixed(2)} tCO₂e</Typography>
                        <Typography variant="caption" display="block" sx={{ opacity: 0.7 }}>Type: {selectedMarker.type}</Typography>
                    </Box>
                )}
            </Paper>

            {/* 3D Scene */}
            <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <group>
                    <Earth />
                    {data.routes?.map((route, i) => (
                        <RouteArc key={i} route={route} radius={EARTH_RADIUS} />
                    ))}
                    {data.markers?.map((marker, i) => (
                        <React.Fragment key={i}>
                            <HotspotMarker
                                marker={marker}
                                radius={EARTH_RADIUS}
                                onClick={setSelectedMarker}
                            />
                            <LocationLabel marker={marker} radius={EARTH_RADIUS} />
                        </React.Fragment>
                    ))}
                </group>

                <OrbitControls
                    enablePan={false}
                    minDistance={8}
                    maxDistance={20}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>
        </Box>
    );
}
