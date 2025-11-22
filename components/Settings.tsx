
import React, { useState, useEffect } from 'react';
import { getBotSettings, updateBotSettings, restartBot, updateCredentials } from '../services/mockApi';
import { BotSettings } from '../types';
import { translations } from '../utils/translations';

const Settings: React.FC<{ language: 'ru' | 'en' }> = ({ language }) => {
    const t = translations[language].settings;
    const comm = translations[language].common;

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
            if (creds.login) setLogin(creds.login);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value, type } = e.target;
        if (name === 'botToken' || name === 'adminIds' || name === 'botName') return;
        setSettings({ ...settings, [name]: type === 'number' ? parseInt(value) || 0 : value });
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setFeedback('');
        await updateBotSettings(settings);
        setFeedback(comm.success);
        setTimeout(() => setFeedback(''), 3000);
        setSaving(false);
    };
    
    const handleRestart = async () => {
        setFeedback(comm.processing);
        await restartBot();
        setFeedback(comm.online);
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

    if (loading) return <div className="p-4 font-bold">{comm.loading}</div>;
    if (!settings) return <div className="p-4 font-bold text-red-600">{comm.error}</div>;

    const SettingRow: React.FC<{label: string, htmlFor?: string, children: React.ReactNode}> = ({label, htmlFor, children}) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-b border-gray-200 pb-4 last:border-0">
            <label htmlFor={htmlFor} className="font-bold text-sm uppercase tracking-wide text-gray-600">{label}</label>
            <div className="md:col-span-2">{children}</div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
            <div className="card">
                <div className="border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-xl font-black uppercase">{t.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">{t.core_desc}</p>
                </div>
                <div className="space-y-4">
                    <SettingRow label={t.bot_token} htmlFor="botToken">
                        <input type="text" name="botToken" id="botToken" value="8495648412:AAF*****************************" readOnly className="input-field font-mono bg-gray-100 text-gray-500 cursor-not-allowed"/>
                        <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 block">{t.hardcoded}</span>
                    </SettingRow>
                    <SettingRow label={t.bot_name} htmlFor="botName">
                        <div className="flex items-center gap-2">
                            <input type="text" name="botName" id="botName" value={settings.botName} readOnly className="input-field font-mono bg-gray-100 text-gray-500 cursor-not-allowed flex-1"/>
                            <span className="text-xs font-bold bg-green-200 px-2 py-1 border border-green-500 text-green-800">VERIFIED</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 block">{t.synced}</span>
                    </SettingRow>
                    <SettingRow label={t.admin_ids} htmlFor="adminIds">
                        <input type="text" name="adminIds" id="adminIds" value="5680208836" readOnly className="input-field font-mono bg-gray-100 text-gray-500 cursor-not-allowed" />
                    </SettingRow>
                    <SettingRow label={t.cmd_prefix} htmlFor="commandPrefix">
                        <input type="text" name="commandPrefix" id="commandPrefix" value={settings.commandPrefix} onChange={handleChange} className="input-field font-mono w-20"/>
                    </SettingRow>
                     <SettingRow label={t.rate_limit} htmlFor="apiRateLimit">
                        <input type="number" name="apiRateLimit" id="apiRateLimit" value={settings.apiRateLimit} onChange={handleChange} className="input-field font-mono w-32"/>
                    </SettingRow>
                </div>
            </div>

            <div className="card">
                <div className="border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-xl font-black uppercase">{t.security_title}</h2>
                </div>
                <div className="space-y-4">
                     <SettingRow label={t.root_login} htmlFor="login">
                        <input type="text" name="login" id="login" value={login} onChange={(e) => setLogin(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label={t.curr_pass} htmlFor="currentPassword">
                        <input type="password" name="currentPassword" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <SettingRow label={t.new_pass} htmlFor="newPassword">
                        <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field font-mono"/>
                    </SettingRow>
                    <div className="flex justify-end items-center gap-4 pt-2">
                       {securityFeedback.message && <span className={`text-xs font-bold ${securityFeedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{securityFeedback.message}</span>}
                       <button onClick={handleCredentialsChange} className="button">{t.update_creds}</button>
                    </div>
                </div>
            </div>

            <div className="card !border-red-600">
                 <div className="border-b-2 border-red-600 pb-4 mb-6 bg-red-50 -m-6 p-6">
                    <h2 className="text-xl font-black uppercase text-red-600">{t.danger_zone}</h2>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center mt-2 gap-4">
                    <div>
                        <p className="font-bold text-sm">{t.force_reboot}</p>
                        <p className="text-xs text-gray-500 mt-1">{t.reboot_desc}</p>
                    </div>
                    <button onClick={handleRestart} className="button !bg-red-600 !text-white !border-red-800 hover:!bg-red-700">{t.btn_reboot}</button>
                </div>
            </div>

             <div className="sticky bottom-4 flex justify-end items-center gap-4 p-4 bg-white border-2 border-black shadow-hard">
                {feedback && <span className="text-green-600 font-bold animate-pulse">{feedback}</span>}
                <button onClick={handleSave} disabled={saving} className="button bg-black text-white w-full md:w-auto">
                    {saving ? t.saving : t.apply}
                </button>
            </div>
        </div>
    );
};

export default Settings;
