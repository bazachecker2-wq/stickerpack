import React, { useState } from 'react';
import { Plugin } from '../types';

interface PluginCodeModalProps {
    plugin: Plugin;
    onClose: () => void;
}

const PluginCodeModal: React.FC<PluginCodeModalProps> = ({ plugin, onClose }) => {
    const [copyText, setCopyText] = useState('Копировать код');

    const handleCopy = () => {
        if (plugin.code) {
            navigator.clipboard.writeText(plugin.code);
            setCopyText('Скопировано!');
            setTimeout(() => setCopyText('Копировать код'), 2000);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-full">
                <header className="p-4 sm:p-6 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Код плагина</h2>
                        <p className="text-sm text-primary">{plugin.name}.py</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <main className="p-4 sm:p-6 overflow-y-auto bg-gray-900">
                    <pre className="text-sm text-cyan-300 font-mono whitespace-pre-wrap break-words">
                        <code>{plugin.code || '# Код для этого плагина отсутствует.'}</code>
                    </pre>
                </main>

                <footer className="p-4 flex justify-end items-center space-x-4 border-t border-gray-700 flex-shrink-0">
                    <button onClick={handleCopy} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold text-white text-sm transition-colors">{copyText}</button>
                    <button onClick={onClose} className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-md font-semibold text-white text-sm">Закрыть</button>
                </footer>
            </div>
        </div>
    );
};

export default PluginCodeModal;