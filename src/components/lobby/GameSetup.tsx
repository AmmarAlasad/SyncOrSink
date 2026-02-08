'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { useStore, CollectionType } from '@/store/store';
import { usePeer } from '@/context/PeerContext';

const COLLECTIONS: CollectionType[] = [
    '2players', '3players', '4players', '5players',
    '6players', '7players', '8players', '9players', '10players'
];

interface GameSetupProps {
    isHost: boolean;
    handleStartGame: () => void;
}

export default function GameSetup({ isHost, handleStartGame }: GameSetupProps) {
    const { lobby, setCollection, setSpawnGuard, setSpawnDog, setSpawnDrone, setSpawnCamera } = useStore();
    const { broadcast } = usePeer();

    if (!isHost) {
        return (
            <div className="bg-slate-700/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Play size={20} /> Game Setup
                </h2>
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p>Waiting for host to start...</p>
                    {lobby.selectedCollection && (
                        <p className="text-blue-400">Host selected: <span className="font-bold">{lobby.selectedCollection}</span></p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play size={20} /> Game Setup
            </h2>

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
                    <ToggleOption
                        label="Include Guard"
                        subLabel="Spawn a patrolling guard"
                        checked={lobby.spawnGuard}
                        onChange={(val) => {
                            setSpawnGuard(val);
                            broadcast({ type: 'SET_SPAWN_GUARD', spawnGuard: val });
                        }}
                    />
                    <ToggleOption
                        label="Include Dog"
                        subLabel="Spawn a fast, lethal dog"
                        checked={lobby.spawnDog}
                        onChange={(val) => {
                            setSpawnDog(val);
                            broadcast({ type: 'SET_SPAWN_DOG', spawnDog: val });
                        }}
                    />
                    <ToggleOption
                        label="Include Drone"
                        subLabel="Patrols and calls backup"
                        checked={lobby.spawnDrone}
                        onChange={(val) => {
                            setSpawnDrone(val);
                            broadcast({ type: 'SET_SPAWN_DRONE', spawnDrone: val });
                        }}
                    />
                    <ToggleOption
                        label="Include Camera"
                        subLabel="Stationary monitoring unit"
                        checked={lobby.spawnCamera}
                        onChange={(val) => {
                            setSpawnCamera(val);
                            broadcast({ type: 'SET_SPAWN_CAMERA', spawnCamera: val });
                        }}
                    />
                </div>

                <div className="pt-4 border-t border-slate-600">
                    <button
                        onClick={handleStartGame}
                        disabled={!lobby.selectedCollection}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleOption({ label, subLabel, checked, onChange }: { label: string, subLabel: string, checked: boolean, onChange: (val: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{label}</span>
                <span className="text-xs text-slate-400">{subLabel}</span>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-slate-600'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
            </button>
        </div>
    );
}
