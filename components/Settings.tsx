
import React, { useState, useEffect } from 'react';
import { getBotSettings, updateBotSettings, restartBot, updateCredentials } from '../services/mockApi';
import { BotSettings } from '../types';

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<BotSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');
    
    const [login, setLogin] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [securityFeedback, setSecurityFeedback] = useState({ message: '', type: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const data = await getBotSettings();
            setSettings(data);
            const creds = JSON.parse(localStorage.getItem('telegentCredentials') || '{}');
            if (creds.login) {
                setLogin(creds.login);
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value, type } = e.target;
        if (name === 'adminIds') {
            setSettings({ ...settings, [name]: value.split(',').map(id => id.trim()) });
        } else {
            setSettings({ ...settings, [name]: type === 'number' ? parseInt(value) || 0 : value });
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setFeedback('');
        await updateBotSettings(settings);
        setFeedback('SETTINGS SAVED');
        setTimeout(() => setFeedback(''), 3000);
        setSaving(false);
    };
    
    const handleRestart = async () => {
        // Removed confirm dialog to prevent sandboxing issues
        setFeedback('REBOOTING...');
        await restartBot();
        setFeedback('SYSTEM ONLINE');
        setTimeout(() => setFeedback(''), 3000);
    }
    
    const handleCredentialsChange = async () => {
        setSecurityFeedback({ message: '', type: '' });
        if (!currentPassword || !login || !newPassword) {
            setSecurityFeedback({ message: 'FIELDS REQUIRED', type: 'error' });
            return;
        }
        const result = await updateCredentials(currentPassword, login, newPassword);
        setSecurityFeedback({ message: result.message.toUpperCase(), type: result.success ? 'success' : 'error' });
        if(result.success) {
            setCurrentPassword('');
            setNewPassword('');
        }
        setTimeout(() => setSecurityFeedback({ message: '', type: '' }), 5000);
    };

    if (loading) return <div className="p-4 font-bold">LOADING...</div>;
    if (!settings) return <div className="p-4 font-bold text-red-600">ERROR</div>;

    const SettingRow: React.FC<{label: string, htmlFor?: string, children: React.ReactNode}> = ({label, htmlFor, children}) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-gray-200 pb-4 last:border-0">
            <label htmlFor={htmlFor} className="font-bold text-sm uppercase tracking-wide text-gray-600">{label}</label>
            <div className="md:col-span-2">{children}</div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8">
            <div className="card">
                <div className="border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-xl font-black uppercase">System Configuration</h2>
                </div>
                <div className="space-y-4">
                    <SettingRow label="Bot Token" htmlFor="botToken">
                        <input type="password" name="botToken" id="botToken" value={settings.botToken} onChange={handleChange} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label="Bot Name" htmlFor="botName">
                        <input type="text" name="botName" id="botName" value={settings.botName} onChange={handleChange} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label="Command Prefix" htmlFor="commandPrefix">
                        <input type="text" name="commandPrefix" id="commandPrefix" value={settings.commandPrefix} onChange={handleChange} className="input-field font-mono w-20"/>
                    </SettingRow>
                    <SettingRow label="Admin IDs" htmlFor="adminIds">
                        <input type="text" name="adminIds" id="adminIds" value={settings.adminIds.join(', ')} onChange={handleChange} className="input-field font-mono" placeholder="ID, ID, ..."/>
                    </SettingRow>
                     <SettingRow label="Rate Limit (RPM)" htmlFor="apiRateLimit">
                        <input type="number" name="apiRateLimit" id="apiRateLimit" value={settings.apiRateLimit} onChange={handleChange} className="input-field font-mono w-32"/>
                    </SettingRow>
                </div>
            </div>

            <div className="card">
                <div className="border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-xl font-black uppercase">Security Access</h2>
                </div>
                <div className="space-y-4">
                     <SettingRow label="Root Login" htmlFor="login">
                        <input type="text" name="login" id="login" value={login} onChange={(e) => setLogin(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label="Current Password" htmlFor="currentPassword">
                        <input type="password" name="currentPassword" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label="New Password" htmlFor="newPassword">
                        <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <div className="flex justify-end items-center gap-4 pt-2">
                       {securityFeedback.message && <span className={`text-xs font-bold ${securityFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{securityFeedback.message}</span>}
                       <button onClick={handleCredentialsChange} className="button">UPDATE CREDENTIALS</button>
                    </div>
                </div>
            </div>

            <div className="card !border-red-600">
                 <div className="border-b-2 border-red-600 pb-4 mb-6 bg-red-50 -m-6 p-6">
                    <h2 className="text-xl font-black uppercase text-red-600">Danger Zone</h2>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div>
                        <p className="font-bold text-sm">FORCE REBOOT</p>
                        <p className="text-xs text-gray-500 mt-1">Restarting allows new configurations to take effect.</p>
                    </div>
                    <button onClick={handleRestart} className="button !bg-red-600 !text-white !border-red-800 hover:!bg-red-700">REBOOT</button>
                </div>
            </div>

             <div className="sticky bottom-4 flex justify-end items-center gap-4 p-4 bg-white border-2 border-black shadow-hard">
                {feedback && <span className="text-green-600 font-bold animate-pulse">{feedback}</span>}
                <button onClick={handleSave} disabled={saving} className="button bg-black text-white w-full md:w-auto">
                    {saving ? 'SAVING...' : 'APPLY ALL CHANGES'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
