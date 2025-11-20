import React from 'react';
import { AILogEntry } from '../types';

interface LogsModalProps {
    logs: AILogEntry[];
    onClose: () => void;
}

const LogsModal: React.FC<LogsModalProps> = ({ logs, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[70vh] flex flex-col">
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Журналы AI</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </header>
                <main className="flex-1 p-4 bg-gray-900 overflow-y-auto font-mono text-sm">
                    <div className="space-y-2">
                        {logs.map((log, index) => (
                            <div key={index} className="flex">
                                <span className="text-gray-500 mr-4">{log.timestamp}</span>
                                <span className="text-gray-300 flex-1 whitespace-pre-wrap break-words">{log.message}</span>
                            </div>
                        ))}
                         {logs.length === 0 && <p className="text-gray-500">Журналы пока пусты.</p>}
                    </div>
                </main>
                <footer className="p-4 flex justify-end border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-md font-semibold text-white">Закрыть</button>
                </footer>
            </div>
        </div>
    );
};

export default LogsModal;
