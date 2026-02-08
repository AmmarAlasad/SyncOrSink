'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { ArrowLeft, Settings as SettingsIcon, Users, RefreshCw } from 'lucide-react';
import Settings from './GameSettings';
import { GameEngine } from '@/game/core/GameEngine';

export default function GameCanvas() {
    const { setGameStatus, lobby, localPlayer } = useStore();
    const { broadcast } = usePeer();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Initialize Game Engine
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new GameEngine({
            canvas,
            store: useStore,
            network: { broadcast }
        });

        engine.start();
        engineRef.current = engine;

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, [broadcast]);

    const handleRestart = () => {
        if (lobby.players.find(p => p.id === localPlayer.id)?.isHost) {
            setGameStatus('playing');
            const updatedLobby = useStore.getState().lobby;
            broadcast({ type: 'GAME_START', lobbyState: updatedLobby });
        }
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none">
            <canvas ref={canvasRef} className="block cursor-default" />

            {/* Top Controls */}
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

            {/* Settings Button */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-slate-900/80 rounded-xl text-slate-400 hover:text-white transition-all hover:scale-110 border border-slate-800 backdrop-blur-md"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            {/* Game Over Screen */}
            {lobby.status === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="bg-slate-900 p-12 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/10 flex flex-col items-center max-w-md text-center">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                            <RefreshCw size={40} className="animate-spin-slow" />
                        </div>
                        <h2 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase italic">Game Over</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">The mission was compromised. Reset to try again.</p>
                        {localPlayer.id === lobby.players.find(p => p.isHost)?.id ? (
                            <button
                                onClick={handleRestart}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-900/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={20} /> Restart Mission
                            </button>
                        ) : (
                            <div className="bg-slate-800 px-6 py-4 rounded-2xl text-slate-400 flex items-center gap-3">
                                <div className="animate-pulse w-2 h-2 bg-slate-500 rounded-full"></div> Waiting for Host to restart...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
