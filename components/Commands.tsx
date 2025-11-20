import React, { useState, useEffect } from 'react';
import { getBotSettings, updateBotSettings } from '../services/mockApi';
import { BotSettings, BotCommand } from '../types';

const Commands: React.FC = () => {
    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const data = await getBotSettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setFeedback('');
        await updateBotSettings(settings);
        setFeedback('SAVED');
        setTimeout(() => setFeedback(''), 3000);
        setSaving(false);
    };

    const handleCommandChange = (index: number, field: keyof BotCommand, value: string) => {
        if (!settings) return;
        const newCommands = [...settings.commands];
        newCommands[index] = { ...newCommands[index], [field]: value };
        setSettings({ ...settings, commands: newCommands });
    };

    const addCommand = () => {
        if (!settings) return;
        setSettings({ ...settings, commands: [...settings.commands, { command: '', description: '' }] });
    };

    const removeCommand = (index: number) => {
        if (!settings) return;
        const newCommands = settings.commands.filter((_, i) => i !== index);
        setSettings({ ...settings, commands: newCommands });
    };

    const handleMenuButtonChange = (index: number, value: string) => {
        if (!settings) return;
        const newButtons = [...settings.menuButtons];
        newButtons[index] = { text: value };
        setSettings({ ...settings, menuButtons: newButtons });
    };

    const addMenuButton = () => {
        if (!settings) return;
        setSettings({ ...settings, menuButtons: [...settings.menuButtons, { text: '' }] });
    };

    const removeMenuButton = (index: number) => {
        if (!settings) return;
        const newButtons = settings.menuButtons.filter((_, i) => i !== index);
        setSettings({ ...settings, menuButtons: newButtons });
    };

    if (loading) return <p className="p-4 font-bold">LOADING...</p>;
    if (!settings) return <p className="p-4 font-bold text-red-600">ERROR</p>;

    return (
        <div className="h-full flex flex-col p-4 gap-6 overflow-y-auto">
            <div className="card">
                <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
                    <div>
                         <h2 className="text-lg font-black uppercase">Slash Commands</h2>
                         <p className="text-xs text-gray-500 mt-1">Commands starting with /</p>
                    </div>
                    <button onClick={addCommand} className="button text-xs py-1">+ ADD NEW</button>
                </div>
                
                <div className="space-y-2">
                    {settings.commands.map((cmd, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <div className="flex-none w-8 pt-2 font-bold text-gray-400 text-xs">/{index + 1}</div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="command"
                                    value={cmd.command}
                                    onChange={(e) => handleCommandChange(index, 'command', e.target.value)}
                                    className="input-field font-mono"
                                />
                                <input
                                    type="text"
                                    placeholder="description"
                                    value={cmd.description}
                                    onChange={(e) => handleCommandChange(index, 'description', e.target.value)}
                                    className="input-field md:col-span-2"
                                />
                            </div>
                            <button onClick={() => removeCommand(index)} className="button !px-3 hover:bg-red-100 border-red-200 text-red-600">
                                X
                            </button>
                        </div>
                    ))}
                    {settings.commands.length === 0 && <p className="text-gray-400 italic text-sm text-center py-4">No commands defined.</p>}
                </div>
            </div>

            <div className="card">
                 <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-center">
                    <div>
                         <h2 className="text-lg font-black uppercase">Menu Buttons</h2>
                         <p className="text-xs text-gray-500 mt-1">Keyboard buttons under chat</p>
                    </div>
                    <button onClick={addMenuButton} className="button text-xs py-1">+ ADD NEW</button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {settings.menuButtons.map((btn, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Button Label"
                                value={btn.text}
                                onChange={(e) => handleMenuButtonChange(index, e.target.value)}
                                className="input-field text-center"
                            />
                            <button onClick={() => removeMenuButton(index)} className="button !px-2 !py-2 hover:bg-red-100 border-red-200 text-red-600">
                                X
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
             <div className="flex justify-end items-center gap-4 pt-4 border-t-2 border-black">
                {feedback && <span className="text-green-600 font-bold animate-pulse">{feedback}</span>}
                <button onClick={handleSave} disabled={saving} className="button bg-black text-white">
                    {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
            </div>
        </div>
    );
};

export default Commands;