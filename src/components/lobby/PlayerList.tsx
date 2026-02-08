'use client';

import React from 'react';
import { Users, LogOut } from 'lucide-react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';

interface PlayerListProps {
    handleKick: (playerId: string) => void;
    isHost: boolean;
}

export default function PlayerList({ handleKick, isHost }: PlayerListProps) {
    const { lobby } = useStore();

    return (
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
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
