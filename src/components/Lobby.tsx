'use client';

import React, { useState } from 'react';
import { useStore, CollectionType } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { Users, Play, LogOut, Copy, Check, Settings as SettingsIcon } from 'lucide-react';
import GameSettings from './GameSettings';

const COLLECTIONS: CollectionType[] = [
    '2players', '3players', '4players', '5players',
    '6players', '7players', '8players', '9players', '10players'
];

export default function Lobby() {
    const { lobby, localPlayer, createLobby, removePlayer, setCollection, setGameStatus, setSpawnGuard, setSpawnDog, setSpawnDrone, setSpawnCamera } = useStore();
    const { broadcast, sendToHost } = usePeer();
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const isHost = localPlayer.id === lobby.players.find(p => p.isHost)?.id;

    const handleCopyId = () => {
        if (lobby.hostPeerId) {
            navigator.clipboard.writeText(lobby.hostPeerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKick = (playerId: string) => {
        if (!isHost) return;
        broadcast({ type: 'KICK_PLAYER', targetId: playerId });
        removePlayer(playerId);
    };

    const handleStartGame = () => {
        if (!lobby.selectedCollection) return;
        setGameStatus('playing');
        const updatedLobby = useStore.getState().lobby;
        broadcast({ type: 'GAME_START', lobbyState: updatedLobby });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 relative">
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-colors backdrop-blur-sm border border-slate-700"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-700">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Lobby
                    </h1>
                    <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg">
                        <span className="text-slate-400 text-sm mr-2" id="lobby-id-label">Lobby ID:</span>
                        <code className="text-blue-300 font-mono">{lobby.hostPeerId}</code>
                        <button onClick={handleCopyId} className="hover:text-white transition-colors" id="copy-lobby-id">
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Users size={20} /> Players ({lobby.players.length}/10)
                        </h2>
                        <div className="space-y-3">
                            {lobby.players.map((player) => (
                                <div key={player.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg border border-slate-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">
                                            {player.name[0].toUpperCase()}
                                        </div>
                                        <span>{player.name} {player.isHost && <span className="text-xs text-yellow-400 ml-1">(Host)</span>}</span>
                                    </div>
                                    {isHost && !player.isHost && (
                                        <button
                                            onClick={() => handleKick(player.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-full transition-colors"
                                            id={`kick-${player.id}`}
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Play size={20} /> Game Setup
                        </h2>

                        {isHost ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Select Collection</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {COLLECTIONS.map((col) => {
                                            const playerCount = parseInt(col);
                                            const isDisabled = lobby.players.length > playerCount;
                                            return (
                                                <button
                                                    key={col}
                                                    id={`collection-${col}`}
                                                    disabled={isDisabled}
                                                    onClick={() => {
                                                        setCollection(col);
                                                        broadcast({ type: 'COLLECTION_SELECTED', collection: col });
                                                    }}
                                                    className={`p-3 rounded-lg border text-sm transition-all ${lobby.selectedCollection === col
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                        : isDisabled
                                                            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                                            : 'bg-slate-800 border-slate-600 hover:border-slate-500 text-slate-300'
                                                        }`}
                                                >
                                                    {col}
                                                    {isDisabled && <span className="block text-[10px] mt-1 text-red-500/70">Too many players</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Include Guard</span>
                                            <span className="text-xs text-slate-400">Spawn a patrolling guard</span>
                                        </div>
                                        <button
                                            id="toggle-guard"
                                            onClick={() => {
                                                const newState = !lobby.spawnGuard;
                                                setSpawnGuard(newState);
                                                broadcast({ type: 'SET_SPAWN_GUARD', spawnGuard: newState });
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${lobby.spawnGuard ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${lobby.spawnGuard ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Include Dog</span>
                                            <span className="text-xs text-slate-400">Spawn a fast, lethal dog</span>
                                        </div>
                                        <button
                                            id="toggle-dog"
                                            onClick={() => {
                                                const newState = !lobby.spawnDog;
                                                setSpawnDog(newState);
                                                broadcast({ type: 'SET_SPAWN_DOG', spawnDog: newState });
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${lobby.spawnDog ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${lobby.spawnDog ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Include Drone</span>
                                            <span className="text-xs text-slate-400">Patrols and calls backup</span>
                                        </div>
                                        <button
                                            id="toggle-drone"
                                            onClick={() => {
                                                const newState = !lobby.spawnDrone;
                                                setSpawnDrone(newState);
                                                broadcast({ type: 'SET_SPAWN_DRONE', spawnDrone: newState });
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${lobby.spawnDrone ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${lobby.spawnDrone ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">Include Camera</span>
                                            <span className="text-xs text-slate-400">Stationary monitoring unit</span>
                                        </div>
                                        <button
                                            id="toggle-camera"
                                            onClick={() => {
                                                const newState = !lobby.spawnCamera;
                                                setSpawnCamera(newState);
                                                broadcast({ type: 'SET_SPAWN_CAMERA', spawnCamera: newState });
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${lobby.spawnCamera ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${lobby.spawnCamera ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-600">
                                    <button
                                        id="start-game-btn"
                                        onClick={handleStartGame}
                                        disabled={!lobby.selectedCollection}
                                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                                    >
                                        Start Game
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                <p>Waiting for host to start...</p>
                                {lobby.selectedCollection && (
                                    <p className="text-blue-400">Host selected: <span className="font-bold">{lobby.selectedCollection}</span></p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showSettings && <GameSettings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
