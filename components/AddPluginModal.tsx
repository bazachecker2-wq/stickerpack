import React, { useState } from 'react';

interface AddPluginModalProps {
    onClose: () => void;
    onAdd: (name: string, description: string, author: string, code: string) => void;
}

const AddPluginModal: React.FC<AddPluginModalProps> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [author, setAuthor] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && description && author) {
            const placeholderCode = `# This plugin was created manually via the Telegent UI.
#
# To add functionality, edit this code based on the universal plugin template.
# See the documentation or other plugins for examples.

from telegram import Update
from telegram.ext import CallbackContext, CommandHandler

class TelegentPlugin:
    def __init__(self):
        self.name = "${name}"
        self.version = "1.0"

    def setup(self, dispatcher):
        # Add your command handlers here, for example:
        # dispatcher.add_handler(CommandHandler("mycommand", self.handle_my_command))
        pass

    def handle_my_command(self, update: Update, context: CallbackContext):
        update.message.reply_text("Manual plugin is working!")

def create_plugin():
    return TelegentPlugin()
`;
            onAdd(name, description, author, placeholderCode);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-white">Добавить плагин вручную</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="plugin-name" className="block text-sm font-medium text-gray-400">Название плагина</label>
                        <input type="text" id="plugin-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-white" required />
                    </div>
                    <div>
                        <label htmlFor="plugin-author" className="block text-sm font-medium text-gray-400">Автор</label>
                        <input type="text" id="plugin-author" value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-white" required />
                    </div>
                    <div>
                        <label htmlFor="plugin-desc" className="block text-sm font-medium text-gray-400">Описание</label>
                        <textarea id="plugin-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary text-white" required></textarea>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold text-white">Отмена</button>
                        <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-md font-semibold text-white">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPluginModal;