'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { Check, Copy, Settings as SettingsIcon } from 'lucide-react';
import GameSettings from './GameSettings';
import PlayerList from './lobby/PlayerList';
import GameSetup from './lobby/GameSetup';

export default function Lobby() {
    const { lobby, localPlayer, removePlayer, setGameStatus } = useStore();
    const { broadcast } = usePeer();
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
                    <PlayerList handleKick={handleKick} isHost={isHost} />
                    <GameSetup isHost={isHost} handleStartGame={handleStartGame} />
                </div>
            </div>
            {showSettings && <GameSettings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
