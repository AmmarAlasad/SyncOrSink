'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { ArrowLeft, Settings as SettingsIcon, Users } from 'lucide-react';
import Settings from './GameSettings';

export default function GameCanvas() {
    const { setGameStatus, lobby, localPlayer, updatePlayerPosition, settings } = useStore();
    const { broadcast } = usePeer();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Use refs to avoid loop restarts on every store update
    const lobbyRef = useRef(lobby);
    const localPlayerRef = useRef(localPlayer);
    useEffect(() => { lobbyRef.current = lobby; }, [lobby]);
    useEffect(() => { localPlayerRef.current = localPlayer; }, [localPlayer]);

    // Movement state
    const keysPressed = useRef<Record<string, boolean>>({});
    const lastUpdate = useRef(0);
    const lastFrameTime = useRef(0);

    // World coordinates (0-2000 range for consistency)
    const playerPos = useRef({ x: 1000, y: 1000 });
    const remoteDisplayPos = useRef<Record<string, { x: number, y: number }>>({});

    // Initialize position
    useEffect(() => {
        const myPlayer = lobby.players.find(p => p.id === localPlayer.id);
        if (myPlayer?.position) {
            playerPos.current = { ...myPlayer.position };
        } else {
            // New player start at center of world
            updatePlayerPosition(localPlayer.id, 1000, 1000);
        }
    }, []);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;

        const render = (timestamp: number) => {
            if (!lastFrameTime.current) lastFrameTime.current = timestamp;
            const deltaTime = Math.min((timestamp - lastFrameTime.current) / 1000, 0.1);
            lastFrameTime.current = timestamp;

            // Handle Resize
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            // --- MOVEMENT ---
            const BASE_SPEED = 450;
            const speed = BASE_SPEED * deltaTime;
            let moved = false;

            if (keysPressed.current[settings.keybinds.up] || keysPressed.current['KeyW']) { playerPos.current.y -= speed; moved = true; }
            if (keysPressed.current[settings.keybinds.down] || keysPressed.current['KeyS']) { playerPos.current.y += speed; moved = true; }
            if (keysPressed.current[settings.keybinds.left] || keysPressed.current['KeyA']) { playerPos.current.x -= speed; moved = true; }
            if (keysPressed.current[settings.keybinds.right] || keysPressed.current['KeyD']) { playerPos.current.x += speed; moved = true; }

            // Fixed World Boundary (Uniform across all windows)
            const WORLD_SIZE = 2000;
            playerPos.current.x = Math.max(50, Math.min(WORLD_SIZE - 50, playerPos.current.x));
            playerPos.current.y = Math.max(50, Math.min(WORLD_SIZE - 50, playerPos.current.y));

            if (moved && timestamp - lastUpdate.current > 33) {
                updatePlayerPosition(localPlayerRef.current.id, playerPos.current.x, playerPos.current.y);
                broadcast({
                    type: 'PLAYER_MOVE',
                    playerId: localPlayerRef.current.id,
                    x: playerPos.current.x,
                    y: playerPos.current.y
                });
                lastUpdate.current = timestamp;
            }

            // --- RENDERING ---
            // Camera Logic: Center on player
            const camX = playerPos.current.x - canvas.width / 2;
            const camY = playerPos.current.y - canvas.height / 2;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid (Translated by Camera)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            const gridSize = 80;
            const startX = -(camX % gridSize);
            const startY = -(camY % gridSize);

            for (let x = startX; x < canvas.width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = startY; y < canvas.height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            // World Boundary visualization (Optional)
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.strokeRect(-camX, -camY, WORLD_SIZE, WORLD_SIZE);

            // Draw Players
            const currentPlayers = lobbyRef.current.players;
            currentPlayers.forEach(p => {
                const isMe = p.id === localPlayerRef.current.id;
                let worldX, worldY;

                if (isMe) {
                    worldX = playerPos.current.x;
                    worldY = playerPos.current.y;
                } else {
                    const targetX = p.position?.x ?? 1000;
                    const targetY = p.position?.y ?? 1000;

                    if (!remoteDisplayPos.current[p.id]) {
                        remoteDisplayPos.current[p.id] = { x: targetX, y: targetY };
                    }

                    const lerpAmount = 1 - Math.exp(-15 * deltaTime);
                    remoteDisplayPos.current[p.id].x += (targetX - remoteDisplayPos.current[p.id].x) * lerpAmount;
                    remoteDisplayPos.current[p.id].y += (targetY - remoteDisplayPos.current[p.id].y) * lerpAmount;

                    worldX = remoteDisplayPos.current[p.id].x;
                    worldY = remoteDisplayPos.current[p.id].y;
                }

                // Screen coordinates
                const x = worldX - camX;
                const y = worldY - camY;

                // Only render if in viewport
                if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) return;

                // Draw Body
                ctx.beginPath();
                ctx.arc(x, y, 22, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // No highlight or selection rings per user request
                // We keep a subtle stroke for clarity
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Name Tab
                const nameY = y - 40;
                ctx.font = 'bold 16px sans-serif';
                const nameWidth = ctx.measureText(p.name).width;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                ctx.roundRect(x - (nameWidth + 20) / 2, nameY - 20, nameWidth + 20, 25, 6);
                ctx.fill();

                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, x, nameY);

                // Role/You Tags
                if (isMe || p.isHost) {
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillStyle = isMe ? '#818cf8' : '#f59e0b';
                    ctx.fillText(isMe ? 'YOU' : 'HOST', x, nameY - 22);
                }
            });

            // Collection Text (Fixed in world center)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.font = '900 150px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lobbyRef.current.selectedCollection || 'Sync', WORLD_SIZE / 2 - camX, WORLD_SIZE / 2 - camY);

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [settings.keybinds]); // Now independent of lobby updates!

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none">
            <canvas ref={canvasRef} className="block cursor-none" />

            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <div className="flex gap-4 pointer-events-auto">
                    <button
                        onClick={() => setGameStatus('lobby')}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-slate-900/80 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-800"
                    >
                        <ArrowLeft size={18} /> Exit
                    </button>
                    <div className="bg-slate-900/80 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-800 text-slate-300 text-sm flex items-center gap-2">
                        <Users size={16} className="text-indigo-400" />
                        <span>{lobby.players.length} Players</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-bold text-indigo-400 uppercase tracking-wider">{lobby.selectedCollection}</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-right-4">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-slate-900/80 rounded-xl text-slate-400 hover:text-white transition-all hover:scale-110 border border-slate-800 backdrop-blur-md"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            {/* Hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500 text-xs font-medium tracking-widest uppercase opacity-50 pointer-events-none">
                Use Arrow Keys or WASD to move
            </div>

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
