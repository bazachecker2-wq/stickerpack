import React, { useState, useEffect } from 'react';
import { Plugin } from '../types';
import { getPluginConfig, updatePluginConfig } from '../services/mockApi';

interface PluginConfigModalProps {
    plugin: Plugin;
    onClose: () => void;
    onSave: () => void;
}

const PluginConfigModal: React.FC<PluginConfigModalProps> = ({ plugin, onClose, onSave }) => {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            const data = await getPluginConfig(plugin.id);
            if (plugin.id !== 'ai-responder-gemini') {
                setConfig(JSON.stringify(data, null, 2));
            } else {
                setConfig(data);
            }
            setLoading(false);
        };
        fetchConfig();
    }, [plugin.id]);

    const handleGeminiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenericChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setConfig(e.target.value);
        setError('');
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            let configToSave = config;
            if (plugin.id !== 'ai-responder-gemini') {
                 // Validate JSON before saving
                JSON.parse(config);
                configToSave = JSON.parse(config);
            }
            await updatePluginConfig(plugin.id, configToSave);
            onSave();
        } catch (e) {
            setError('Неверный формат JSON. Пожалуйста, проверьте синтаксис.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const renderConfigForm = () => {
        if (loading) return <div className="text-center p-4">Загрузка конфигурации...</div>;

        if (plugin.id === 'ai-responder-gemini' && config) {
            return (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="model" className="block text-sm font-medium text-gray-400">Модель</label>
                        <input type="text" id="model" name="model" value={config.model} onChange={handleGeminiChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md text-white shadow-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label htmlFor="systemInstruction" className="block text-sm font-medium text-gray-400">Системная инструкция</label>
                        <textarea id="systemInstruction" name="systemInstruction" value={config.systemInstruction} onChange={handleGeminiChange} rows={4} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md text-white shadow-sm focus:ring-primary focus:border-primary"></textarea>
                    </div>
                    <div>
                        <label htmlFor="temperature" className="block text-sm font-medium text-gray-400">Температура</label>
                        <input type="number" id="temperature" name="temperature" step="0.1" min="0" max="1" value={config.temperature} onChange={handleGeminiChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md text-white shadow-sm focus:ring-primary focus:border-primary" />
                    </div>
                </div>
            );
        }

        return (
            <div>
                <label htmlFor="json-config" className="block text-sm font-medium text-gray-400">Конфигурация JSON</label>
                <textarea
                    id="json-config"
                    value={config}
                    onChange={handleGenericChange}
                    rows={12}
                    className={`mt-1 block w-full bg-gray-900 border rounded-md text-white font-mono text-xs shadow-sm focus:ring-primary focus:border-primary ${error ? 'border-red-500' : 'border-gray-600'}`}
                    placeholder="Введите корректный JSON..."
                />
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6 text-white">Настройка: {plugin.name}</h2>
                {renderConfigForm()}
                <div className="flex justify-end items-center space-x-4 pt-6 mt-2 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold text-white">Отмена</button>
                    <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-md font-semibold text-white disabled:bg-gray-600">
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PluginConfigModal;
