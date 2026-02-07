import { useState, useEffect } from 'react';
import { X, Lock, User, Key, Eye, EyeOff, Smartphone, Cookie, Plus, Save, Globe } from 'lucide-react';
import api from '../api/client';

const AddAccountModal = ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null;

    const [method, setMethod] = useState(1); // 1=Pass, 2=2FA, 3=Cookie
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        seed_2fa: '',
        proxy: '',
        cookies: ''
    });
    const [proxyType, setProxyType] = useState('http://');
    const [proxyMode, setProxyMode] = useState<'manual' | 'template'>('manual');
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // Quick create template state
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickTemplate, setQuickTemplate] = useState({ name: '', url: '', type: 'http://' });

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/proxies/');
            setTemplates(res.data);
            if (res.data.length > 0) {
                setProxyMode('template');
                setSelectedTemplateId(res.data[0].id.toString());
            } else {
                setProxyMode('manual');
            }
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    const handleCreateTemplate = async () => {
        if (!quickTemplate.name || !quickTemplate.url) return;
        setLoading(true);
        try {
            let proxyUrl = quickTemplate.url;
            if (!proxyUrl.includes('://')) {
                proxyUrl = `${quickTemplate.type}${proxyUrl}`;
            }

            const res = await api.post('/proxies/', {
                name: quickTemplate.name,
                proxy_url: proxyUrl
            });

            const newTemplate = res.data;
            setTemplates([...templates, newTemplate]);
            setSelectedTemplateId(newTemplate.id.toString());
            setProxyMode('template');
            setShowQuickCreate(false);
            setQuickTemplate({ name: '', url: '', type: 'http://' });
        } catch (err: any) {
            alert(err.response?.data?.detail || "Error creating template");
        } finally {
            setLoading(false);
        }
    };

    const isProxyValid = () => {
        // Proxy is now optional
        if (proxyMode === 'manual') {
            return true;
        } else {
            return selectedTemplateId !== '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isProxyValid()) {
            alert("Proxy is required!");
            return;
        }

        setLoading(true);
        try {
            let proxyStr = '';
            if (proxyMode === 'manual') {
                proxyStr = formData.proxy.trim();
                if (proxyStr && !proxyStr.includes('://')) {
                    proxyStr = `${proxyType}${proxyStr}`;
                }
            } else {
                const template = templates.find(t => t.id.toString() === selectedTemplateId);
                if (template) {
                    proxyStr = template.proxy_url;
                }
            }

            let payload: any = {
                username: formData.username,
                login_method: method,
                proxy: proxyStr
            };

            if (method === 1 || method === 2) {
                payload.password = formData.password;
                if (method === 2) payload.seed_2fa = formData.seed_2fa;
            }

            if (method === 3) {
                try {
                    let parsed = JSON.parse(formData.cookies);
                    // Handle array format (EditThisCookie/Chrome)
                    if (Array.isArray(parsed)) {
                        const cookieDict: any = {};
                        parsed.forEach((c: any) => {
                            if (c.name && c.value) {
                                cookieDict[c.name] = c.value;
                            }
                        });
                        payload.cookies = cookieDict;
                    } else {
                        // Assume already dict
                        payload.cookies = parsed;
                    }
                } catch (e) {
                    alert("Invalid JSON for cookies");
                    setLoading(false);
                    return;
                }
            }

            await api.post('/accounts/', payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Error adding account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Connect Instagram</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex space-x-2 mb-6 p-1 bg-gray-800 rounded-lg">
                    {[
                        { id: 1, label: 'Password', icon: Key },
                        { id: 2, label: '2FA', icon: Smartphone },
                        { id: 3, label: 'Cookie', icon: Cookie }
                    ].map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${method === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <m.icon className="w-4 h-4" />
                            <span>{m.label}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="instagram_user"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    </div>

                    {(method === 1 || method === 2) && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type={showPass ? "text" : "password"}
                                    required
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-10 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-gray-500 hover:text-white transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {method === 2 && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">2FA Seed (TOTP Key)</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                placeholder="ABCD 1234 ..."
                                value={formData.seed_2fa}
                                onChange={e => setFormData({ ...formData, seed_2fa: e.target.value })}
                            />
                        </div>
                    )}

                    {method === 3 && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Session Cookies (JSON)</label>
                            <textarea
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs h-32"
                                placeholder='{"sessionid": "..."}'
                                value={formData.cookies}
                                onChange={e => setFormData({ ...formData, cookies: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Proxy (Optional)</label>
                            {templates.length > 0 && !showQuickCreate && (
                                <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setProxyMode('manual')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${proxyMode === 'manual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        MANUAL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProxyMode('template')}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${proxyMode === 'template' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        TEMPLATE
                                    </button>
                                </div>
                            )}
                        </div>

                        {templates.length === 0 || showQuickCreate ? (
                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase">Create First Proxy Template</p>
                                    {templates.length > 0 && (
                                        <button type="button" onClick={() => setShowQuickCreate(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Template Name (e.g. My Proxy 1)"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={quickTemplate.name}
                                    onChange={e => setQuickTemplate({ ...quickTemplate, name: e.target.value })}
                                />
                                <div className="flex space-x-2">
                                    <select
                                        value={quickTemplate.type}
                                        onChange={e => setQuickTemplate({ ...quickTemplate, type: e.target.value })}
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-20"
                                    >
                                        <option value="http://">HTTP</option>
                                        <option value="https://">HTTPS</option>
                                        <option value="socks4://">SOCKS4</option>
                                        <option value="socks5://">SOCKS5</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="user:pass@host:port"
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={quickTemplate.url}
                                        onChange={e => setQuickTemplate({ ...quickTemplate, url: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateTemplate}
                                        disabled={!quickTemplate.name || !quickTemplate.url}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500">Templates allow you to reuse proxies easily across multiple accounts.</p>
                            </div>
                        ) : (
                            <>
                                {proxyMode === 'manual' ? (
                                    <div className="flex space-x-2 overflow-hidden">
                                        <select
                                            value={proxyType}
                                            onChange={(e) => setProxyType(e.target.value)}
                                            className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-20"
                                        >
                                            <option value="http://">HTTP</option>
                                            <option value="https://">HTTPS</option>
                                            <option value="socks4://">SOCKS4</option>
                                            <option value="socks5://">SOCKS5</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                placeholder="user:pass@host:port"
                                                value={formData.proxy}
                                                onChange={e => setFormData({ ...formData, proxy: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex space-x-2">
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                                        >
                                            <option value="">Select a template...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.proxy_url.length > 25 ? t.proxy_url.substring(0, 25) + '...' : t.proxy_url})</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickCreate(true)}
                                            className="bg-gray-800 border border-gray-700 text-gray-400 hover:text-white p-2.5 rounded-xl transition-colors"
                                            title="Add new template"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isProxyValid()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4 shadow-lg shadow-indigo-600/20"
                    >
                        {loading ? 'Processing...' : 'Connect Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;
