'use client';

import React from 'react';
import { useStore } from '@/store/store';
import { X, Volume2, Keyboard } from 'lucide-react';

export default function GameSettings({ onClose }: { onClose: () => void }) {
    const { settings, updateSettings } = useStore();

    const handleKeybindChange = (action: string, code: string) => {
        updateSettings({ keybinds: { ...settings.keybinds, [action]: code } });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Audio */}
                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-indigo-400 font-semibold">
                            <Volume2 size={20} /> Audio
                        </h3>
                        <div>
                            <label className="flex justify-between text-sm text-slate-300 mb-2">
                                <span>Master Volume</span>
                                <span>{settings.volume}%</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.volume}
                                onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Keybinds */}
                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-indigo-400 font-semibold">
                            <Keyboard size={20} /> Keybinds
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(settings.keybinds).map(([action, code]) => (
                                <div key={action} className="bg-slate-700/50 p-3 rounded-lg flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 uppercase font-bold">{action}</span>
                                    <button
                                        className="text-white font-mono bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm hover:border-indigo-500 transition-colors text-left"
                                        onClick={() => {
                                            const newKey = prompt(`Press new key for ${action}`, code);
                                            if (newKey) handleKeybindChange(action, newKey);
                                        }}
                                    >
                                        {code}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
}
