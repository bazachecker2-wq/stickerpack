
import React, { useState, useEffect, useCallback } from 'react';
import { Plugin } from '../types';
import { getPlugins, togglePlugin, deletePlugin } from '../services/mockApi';
import PluginConfigModal from './PluginConfigModal';
import EditIcon from './icons/EditIcon';

interface PluginsProps {
    isReadOnly?: boolean;
    onOpenIDE: (plugin: Plugin | null) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{
            position: 'absolute',
            cursor: 'pointer',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: checked ? 'var(--success-color)' : '#ccc',
            transition: '.4s',
            borderRadius: '34px'
        }}>
            <span style={{
                position: 'absolute',
                content: '""',
                height: '20px',
                width: '20px',
                left: '2px',
                bottom: '2px',
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%',
                transform: checked ? 'translateX(20px)' : 'translateX(0)'
            }}></span>
        </span>
    </label>
);


const Plugins: React.FC<PluginsProps> = ({ isReadOnly = false, onOpenIDE }) => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [configuringPlugin, setConfiguringPlugin] = useState<Plugin | null>(null);
    
    const fetchPlugins = useCallback(async () => {
        setLoading(true);
        const data = await getPlugins();
        setPlugins(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPlugins();
    }, [fetchPlugins]);

    const handleToggle = async (id: string) => {
        await togglePlugin(id);
        fetchPlugins();
    };
    
    const handleDelete = async (id: string) => {
        // Direct delete without confirm dialog to prevent sandbox blocking
        await deletePlugin(id);
        fetchPlugins();
    };

    if (loading) return <p>Загрузка плагинов...</p>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
             <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                {!isReadOnly && (
                    <button className="button" onClick={() => onOpenIDE(null)}>
                        <EditIcon className="w-5 h-5"/>
                        Создать плагин в IDE
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {plugins.map(plugin => (
                    <div className="card" key={plugin.id} style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{flex: 1}}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{plugin.name} <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>v{plugin.version}</span></h3>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>{plugin.description}</p>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '12px' }}>Автор: {plugin.author}</p>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                               {!isReadOnly && (
                                   <div style={{display: 'flex', gap: '0.5rem'}}>
                                       <button className="button secondary" onClick={() => onOpenIDE(plugin)}>Изменить</button>
                                       {plugin.hasConfig && <button className="button secondary" onClick={() => setConfiguringPlugin(plugin)}>Настроить</button>}
                                       <button className="button secondary" style={{color: 'var(--danger-color)'}} onClick={() => handleDelete(plugin.id)}>Удалить</button>
                                   </div>
                               )}
                                <ToggleSwitch checked={plugin.enabled} onChange={() => handleToggle(plugin.id)} disabled={isReadOnly}/>
                           </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {plugins.length === 0 && (
                <div className="card text-center">
                    <p>Нет установленных плагинов. Нажмите "Создать плагин в IDE", чтобы начать.</p>
                </div>
            )}

            {configuringPlugin && <PluginConfigModal plugin={configuringPlugin} onClose={() => setConfiguringPlugin(null)} onSave={() => setConfiguringPlugin(null)} />}
        </div>
    );
};

export default Plugins;
