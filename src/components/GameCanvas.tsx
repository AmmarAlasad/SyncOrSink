'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import Settings from './GameSettings';

export default function GameCanvas() {
    const { setGameStatus, lobby, localPlayer, updatePlayerPosition, settings } = useStore();
    const { broadcast, sendToHost } = usePeer();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Movement state
    const keysPressed = useRef<Record<string, boolean>>({});
    const lastUpdate = useRef(0);
    const playerPos = useRef({ x: 400, y: 300 });

    // Initialize position if not set
    useEffect(() => {
        const myPlayer = lobby.players.find(p => p.id === localPlayer.id);
        if (myPlayer && !myPlayer.position) {
            updatePlayerPosition(localPlayer.id, 400, 300);
        } else if (myPlayer?.position) {
            playerPos.current = myPlayer.position;
        }
    }, [lobby.players, localPlayer.id, updatePlayerPosition]);

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
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = (timestamp: number) => {
            // Resize canvas
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            // Clear
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid (Chillout Vibe)
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            // Update Local Position
            const speed = 5;
            let moved = false;

            // Use settings keybinds
            // Maps "ArrowUp" -> "ArrowUp" etc.
            // keysPressed uses e.code ("ArrowUp", "KeyW")
            // settings.keybinds values are likely "ArrowUp" or "KeyW"
            // For now, let's map generic directions

            if (keysPressed.current[settings.keybinds.up] || keysPressed.current['KeyW']) { playerPos.current.y -= speed; moved = true; }
            if (keysPressed.current[settings.keybinds.down] || keysPressed.current['KeyS']) { playerPos.current.y += speed; moved = true; }
            if (keysPressed.current[settings.keybinds.left] || keysPressed.current['KeyA']) { playerPos.current.x -= speed; moved = true; }
            if (keysPressed.current[settings.keybinds.right] || keysPressed.current['KeyD']) { playerPos.current.x += speed; moved = true; }

            // Boundary checks
            playerPos.current.x = Math.max(20, Math.min(canvas.width - 20, playerPos.current.x));
            playerPos.current.y = Math.max(20, Math.min(canvas.height - 20, playerPos.current.y));

            if (moved) {
                // Update store locally
                updatePlayerPosition(localPlayer.id, playerPos.current.x, playerPos.current.y);

                // Broadcast network (throttled)
                if (timestamp - lastUpdate.current > 50) { // 20 updates/sec
                    const data = { type: 'PLAYER_MOVE', playerId: localPlayer.id, x: playerPos.current.x, y: playerPos.current.y };
                    broadcast(data);
                    sendToHost(data);
                    lastUpdate.current = timestamp;
                }
            }

            // Render Players
            lobby.players.forEach(p => {
                const isMe = p.id === localPlayer.id;
                const x = isMe ? playerPos.current.x : (p.position?.x || 400);
                const y = isMe ? playerPos.current.y : (p.position?.y || 300);

                // Draw Body
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fillStyle = isMe ? '#6366f1' : '#10b981'; // Indigo for me, Emerald for others
                if (p.isHost && !isMe) ctx.fillStyle = '#f59e0b'; // Amber for host
                ctx.fill();

                // Draw Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = ctx.fillStyle;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Draw Name
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, x, y - 30);
            });

            // Collection Text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.font = '100px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(lobby.selectedCollection || 'Chillout', canvas.width / 2, canvas.height / 2);

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [lobby.players, settings.keybinds]);

    return (
        <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
            <canvas ref={canvasRef} className="block" />

            <div className="absolute top-4 left-4 flex gap-4">
                <button
                    onClick={() => setGameStatus('lobby')}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 p-2 rounded-lg backdrop-blur-sm"
                >
                    <ArrowLeft size={20} /> Leave Game
                </button>

                {/* Info Overlay */}
                <div className="bg-black/40 p-2 rounded-lg backdrop-blur-sm text-white/70 text-sm">
                    Players: {lobby.players.length} | Collection: {lobby.selectedCollection}
                </div>
            </div>

            <div className="absolute top-4 right-4">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-black/40 rounded-lg text-white/70 hover:text-white transition-colors backdrop-blur-sm"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
