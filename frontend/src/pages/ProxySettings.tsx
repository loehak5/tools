import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Search, X, Play, Globe, Server, Loader2, XCircle, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import TableSelect from '../components/common/TableSelect';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TestResultModal } from '../components/common/TestResultModal';


interface Account {
    id: number;
    username: string;
    proxy: string | null;
    status: string;
    email?: string; // Optional for now

}

interface ProxyTemplate {
    id: number;
    name: string;
    proxy_url: string;
    description: string | null;
    accounts_count: number;
    created_at: string;
}

const ProxySettings = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [templates, setTemplates] = useState<ProxyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTemplates, setShowTemplates] = useState(true);

    // Form state for new template
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        proxyUsername: '',
        proxyPassword: '',
        proxyHost: '',
        proxyPort: '',
        proxyProtocol: 'http',
        description: ''
    });
    const [isCreating, setIsCreating] = useState(false);
    const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
    const [assigningAccountId, setAssigningAccountId] = useState<number | null>(null);
    const [clearingProxy, setClearingProxy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Distribution state
    const [showDistributeModal, setShowDistributeModal] = useState(false);
    const [distributing, setDistributing] = useState(false);
    const [distributeConfig, setDistributeConfig] = useState({
        maxAccounts: 10,
        overwrite: false
    });

    // Testing state
    const [showTestModal, setShowTestModal] = useState(false);
    const [testingProxy, setTestingProxy] = useState(false);

    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
        latency_ms?: number;
        ip?: string;
        country?: string;
    } | null>(null);

    // Batch Import states
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchRawData, setBatchRawData] = useState('');
    const [isBatchImporting, setIsBatchImporting] = useState(false);
    const [batchResult, setBatchResult] = useState<{
        success: boolean;
        imported_count: number;
        total_processed: number;
        errors: string[];
    } | null>(null);

    // Confirm dialog states
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        onConfirm: () => void;
        isDestructive: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        onConfirm: () => { },
        isDestructive: false
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [accountsRes, templatesRes] = await Promise.all([
                api.get('/accounts/'),
                api.get('/proxies/')
            ]);
            setAccounts(accountsRes.data);
            setTemplates(templatesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);

        if (!newTemplate.name || !newTemplate.proxyHost || !newTemplate.proxyPort) {
            setCreateError("Please provide a name, host, and port");
            return;
        }

        // Build proxy URL
        let proxyUrl = `${newTemplate.proxyProtocol}://`;
        if (newTemplate.proxyUsername && newTemplate.proxyPassword) {
            proxyUrl += `${newTemplate.proxyUsername}:${newTemplate.proxyPassword}@`;
        }
        proxyUrl += `${newTemplate.proxyHost}:${newTemplate.proxyPort}`;

        setIsCreating(true);
        try {
            await api.post('/proxies/', {
                name: newTemplate.name,
                proxy_url: proxyUrl,
                description: newTemplate.description || null
            });
            setNewTemplate({ name: '', proxyUsername: '', proxyPassword: '', proxyHost: '', proxyPort: '', proxyProtocol: 'http', description: '' });
            fetchData();
        } catch (err: any) {
            setCreateError(err.response?.data?.detail || "Failed to create template");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTemplate = async (templateId: number) => {
        const template = templates.find(t => t.id === templateId);
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Proxy Template',
            message: `Are you sure you want to delete the proxy template "${template?.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setDeletingTemplateId(templateId);
                try {
                    await api.delete(`/proxies/${templateId}`);
                    fetchData();
                } catch (err: any) {
                    alert(err.response?.data?.detail || "Failed to delete template");
                } finally {
                    setDeletingTemplateId(null);
                }
            }
        });
    };

    const handleDeleteAllTemplates = () => {
        if (templates.length === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Delete All Templates',
            message: `Are you sure you want to delete ALL ${templates.length} proxy templates? This action cannot be undone.`,
            confirmText: 'Delete All',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setLoading(true);
                try {
                    await api.delete('/proxies/');
                    fetchData();
                } catch (err: any) {
                    setLoading(false);
                    alert(err.response?.data?.detail || "Failed to delete templates");
                }
            }
        });
    };

    const handleAssignTemplate = async (templateId: number, accountId: number) => {
        setAssigningAccountId(accountId);
        try {
            await api.post(`/proxies/${templateId}/assign/${accountId}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to assign proxy");
        } finally {
            setAssigningAccountId(null);
        }
    };

    const handleClearProxy = async (accountId: number) => {
        const account = accounts.find(a => a.id === accountId);
        setConfirmDialog({
            isOpen: true,
            title: 'Remove Proxy',
            message: `Are you sure you want to remove the proxy from @${account?.username}? This account will no longer use a proxy for connections.`,
            confirmText: 'Remove Proxy',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setClearingProxy(true);
                try {
                    await api.post(`/proxies/clear/${accountId}`);
                    fetchData();
                } catch (err: any) {
                    alert(err.response?.data?.detail || "Failed to clear proxy");
                } finally {
                    setClearingProxy(false);
                }
            }
        });
    };

    const handleDistributeProxies = async (e: React.FormEvent) => {
        e.preventDefault();
        setDistributing(true);
        try {
            await api.post('/proxies/distribute', {
                max_accounts_per_proxy: distributeConfig.maxAccounts,
                overwrite_existing: distributeConfig.overwrite
            });
            setShowDistributeModal(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to distribute proxies");
        } finally {
            setDistributing(false);
        }
    };

    const handleResetAllProxies = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Reset All Proxies',
            message: 'Are you sure you want to remove ALL proxy assignments? All accounts will be set to Direct connection.',
            confirmText: 'Reset All',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                setClearingProxy(true); // Reuse state or add new loading state if needed
                try {
                    await api.post('/proxies/reset-all');
                    fetchData();
                } catch (err: any) {
                    alert(err.response?.data?.detail || "Failed to reset all proxies");
                } finally {
                    setClearingProxy(false);
                }
            }
        });
    };

    const handleTestProxy = async (proxyUrl?: string) => {
        // If proxyUrl provided (from existing template or account), use it.
        // Otherwise build from form state.
        let urlToTest = proxyUrl;

        if (!urlToTest) {
            if (!newTemplate.proxyHost || !newTemplate.proxyPort) {
                alert("Please provide host and port to test");
                return;
            }
            urlToTest = `${newTemplate.proxyProtocol}://`;
            if (newTemplate.proxyUsername && newTemplate.proxyPassword) {
                urlToTest += `${newTemplate.proxyUsername}:${newTemplate.proxyPassword}@`;
            }
            urlToTest += `${newTemplate.proxyHost}:${newTemplate.proxyPort}`;
        }

        setShowTestModal(true);
        setTestingProxy(true);
        setTestResult(null);

        try {
            const res = await api.post('/proxies/check', { proxy_url: urlToTest });
            setTestResult(res.data);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.response?.data?.detail || err.message || "Connection failed"
            });
        } finally {
            setTestingProxy(false);
        }
    };



    const handleBatchImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batchRawData.trim()) return;

        setIsBatchImporting(true);
        setBatchResult(null);
        try {
            const res = await api.post('/proxies/batch', { raw_data: batchRawData });
            setBatchResult(res.data);
            if (res.data.imported_count > 0) {
                fetchData();
            }
        } catch (err: any) {
            setBatchResult({
                success: false,
                imported_count: 0,
                total_processed: 0,
                errors: [err.response?.data?.detail || "Failed to import proxies"]
            });
        } finally {
            setIsBatchImporting(false);
        }
    };


    // Filter states
    const [accountSearch, setAccountSearch] = useState('');
    const [proxySearch, setProxySearch] = useState('');

    const filteredAccounts = accounts.filter(acc =>
        acc.username.toLowerCase().includes(accountSearch.toLowerCase())
    );

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(proxySearch.toLowerCase())
    );

    // Split data for 2-column view
    const halfTemplates = Math.ceil(filteredTemplates.length / 2);
    const templatesCol1 = filteredTemplates.slice(0, halfTemplates);
    const templatesCol2 = filteredTemplates.slice(halfTemplates);

    const halfAccounts = Math.ceil(filteredAccounts.length / 2);
    const accountsCol1 = filteredAccounts.slice(0, halfAccounts);
    const accountsCol2 = filteredAccounts.slice(halfAccounts);

    const renderTemplateRow = (template: ProxyTemplate) => (
        <tr key={template.id} className="hover:bg-gray-800/30 transition-colors">
            <td className="px-3 py-3 text-gray-500">{template.id}</td>
            <td className="px-3 py-3 font-medium text-white">{template.name}</td>
            <td className="px-3 py-3 font-mono text-gray-400 text-xs truncate max-w-[150px]" title={template.proxy_url}>
                {template.proxy_url}
            </td>
            <td className="px-3 py-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${template.accounts_count > 0
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}>
                    {template.accounts_count} used
                </span>
            </td>
            <td className="px-3 py-3 text-right">
                <div className="flex justify-end space-x-2">
                    <button onClick={() => handleTestProxy(template.proxy_url)} disabled={testingProxy} className="border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 p-1.5 rounded-lg transition-colors disabled:opacity-50"><Play className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteTemplate(template.id)} disabled={deletingTemplateId === template.id} className="border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 p-1.5 rounded-lg transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </td>
        </tr>
    );

    const renderAccountRow = (account: Account) => (
        <tr key={account.id} className="hover:bg-gray-800/30 transition-colors">
            <td className="px-3 py-3 text-gray-500">{account.id}</td>
            <td className="px-3 py-3 font-medium text-white truncate max-w-[150px]">@{account.username}</td>
            <td className="px-3 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center w-fit
                    ${account.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        account.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {account.status}
                </span>
            </td>
            <td className="px-3 py-3 font-mono text-xs text-gray-400 truncate max-w-[150px]" title={account.proxy || ''}>
                {account.proxy ? account.proxy.split('@').pop() : <span className="text-gray-600 italic">None</span>}
            </td>
            <td className="px-3 py-3 text-right">
                <div className="flex justify-end items-center gap-2">
                    <div className="w-28 relative">
                        <TableSelect
                            options={templates.map(t => ({ value: t.id, label: t.name }))}
                            placeholder="Assign"
                            value={(() => { const match = templates.find(t => t.proxy_url === account.proxy); return match?.id || ''; })()}
                            onChange={(val) => { if (val) handleAssignTemplate(Number(val), account.id); }}
                            disabled={assigningAccountId === account.id}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleClearProxy(account.id)}
                            disabled={!account.proxy || clearingProxy}
                            className={`p-1.5 rounded transition-colors ${!account.proxy ? 'text-gray-700 cursor-not-allowed' : 'text-red-400 hover:text-white hover:bg-red-500/20'}`}
                            title={account.proxy ? "Reset Linked Proxy" : "No Proxy Linked"}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleTestProxy(account.proxy || undefined)} disabled={testingProxy || !account.proxy} className="text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/10 p-1.5 rounded transition-colors disabled:opacity-50" title="Test Connection"><Play className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Proxy Settings</h1>
                <p className="text-gray-400 mt-1">Manage proxy templates and network configurations.</p>
            </div>

            {/* Create Template Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                        <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                        Create Proxy Template
                    </h2>
                    <button
                        onClick={() => { setShowBatchModal(true); setBatchResult(null); }}
                        className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Batch Import</span>
                    </button>
                </div>
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Template Name <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g., US Datacenter 1"
                                value={newTemplate.name}
                                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
                            <input
                                type="text"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g., Fast residential proxy for US region"
                                value={newTemplate.description}
                                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Proxy Connection Details */}
                    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                        <label className="block text-xs font-medium text-gray-400 mb-3">Proxy Connection Details</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Protocol</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newTemplate.proxyProtocol}
                                    onChange={e => setNewTemplate({ ...newTemplate, proxyProtocol: e.target.value })}
                                >
                                    <option value="http">HTTP</option>
                                    <option value="https">HTTPS</option>
                                    <option value="socks4">SOCKS4</option>
                                    <option value="socks5">SOCKS5</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="user"
                                    value={newTemplate.proxyUsername}
                                    onChange={e => setNewTemplate({ ...newTemplate, proxyUsername: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="••••••"
                                    value={newTemplate.proxyPassword}
                                    onChange={e => setNewTemplate({ ...newTemplate, proxyPassword: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Host <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="proxy.example.com"
                                    value={newTemplate.proxyHost}
                                    onChange={e => setNewTemplate({ ...newTemplate, proxyHost: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Port <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="8080"
                                    value={newTemplate.proxyPort}
                                    onChange={e => setNewTemplate({ ...newTemplate, proxyPort: e.target.value.replace(/\D/g, '') })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-start mt-2">
                            <p className="text-xs text-gray-500">Format: {newTemplate.proxyProtocol}://username:password@host:port (username & password optional)</p>
                        </div>
                    </div>

                    {createError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center">
                            <XCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {createError}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleTestProxy()}
                            disabled={isCreating || testingProxy || !newTemplate.proxyHost || !newTemplate.proxyPort}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-xl flex items-center space-x-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {testingProxy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            <span>Test Connection</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || testingProxy || !newTemplate.name || !newTemplate.proxyHost || !newTemplate.proxyPort}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? (
                                <span className="w-4 h-4 block border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            <span>{isCreating ? 'Creating...' : 'Create Template'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Unified Proxy Management Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
                <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900 sticky top-0 z-40 rounded-t-2xl">

                    {/* Tabs */}
                    <div className="flex bg-gray-800/50 p-1 rounded-xl">
                        <button
                            onClick={() => { setShowTemplates(true); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${showTemplates
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <Server className="w-4 h-4" />
                            Saved Templates
                        </button>
                        <button
                            onClick={() => { setShowTemplates(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${!showTemplates
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            <Globe className="w-4 h-4" />
                            Account Proxies
                        </button>
                    </div>

                    {/* Actions & Filters */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                        {showTemplates ? (
                            <>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        className="bg-gray-800 border-gray-700 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                                        value={proxySearch}
                                        onChange={e => setProxySearch(e.target.value)}
                                    />
                                </div>
                                {templates.length > 0 && (
                                    <button
                                        onClick={handleDeleteAllTemplates}
                                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl transition-colors flex items-center space-x-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Delete All</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search accounts..."
                                        className="bg-gray-800 border-gray-700 border rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                                        value={accountSearch}
                                        onChange={e => setAccountSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleResetAllProxies}
                                    className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 text-xs font-medium border border-red-500/20 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Reset All</span>
                                </button>
                                <button
                                    onClick={() => setShowDistributeModal(true)}
                                    className="px-3 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/30 text-xs font-medium border border-indigo-500/20 transition-colors flex items-center gap-2"
                                >
                                    <Shuffle className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Random Distribute</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {showTemplates ? (
                            <motion.div
                                key="templates"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 2xl:grid-cols-2 divide-y 2xl:divide-y-0 2xl:divide-x divide-gray-800"
                            >
                                {/* Templates Column 1 */}
                                <div className="">
                                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                                        <thead className="text-gray-400">
                                            <tr>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium w-12 text-xs uppercase tracking-wider border-b border-gray-800">ID</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Name</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Proxy URL</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Usage</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-right text-xs uppercase tracking-wider border-b border-gray-800">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                                            ) : filteredTemplates.length === 0 ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No templates found.</td></tr>
                                            ) : templatesCol1.map(renderTemplateRow)}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Templates Column 2 */}
                                <div className="border-t border-gray-800 2xl:border-t-0">
                                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                                        <thead className="text-gray-400">
                                            <tr>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium w-12 text-xs uppercase tracking-wider border-b border-gray-800">ID</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Name</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Proxy URL</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Usage</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-right text-xs uppercase tracking-wider border-b border-gray-800">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {templatesCol2.map(renderTemplateRow)}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="accounts"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 2xl:grid-cols-2 divide-y 2xl:divide-y-0 2xl:divide-x divide-gray-800"
                            >
                                {/* Accounts Column 1 */}
                                <div className="">
                                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                                        <thead className="text-gray-400">
                                            <tr>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium w-12 text-xs uppercase tracking-wider border-b border-gray-800">ID</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Username</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Status</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Current Proxy</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-right text-xs uppercase tracking-wider border-b border-gray-800">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                                            ) : filteredAccounts.length === 0 ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No accounts found.</td></tr>
                                            ) : accountsCol1.map(renderAccountRow)}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Accounts Column 2 */}
                                <div className="border-t border-gray-800 2xl:border-t-0">
                                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                                        <thead className="text-gray-400">
                                            <tr>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium w-12 text-xs uppercase tracking-wider border-b border-gray-800">ID</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Username</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Status</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-xs uppercase tracking-wider border-b border-gray-800">Current Proxy</th>
                                                <th className="sticky top-[72px] z-30 bg-gray-900 px-4 py-3 font-medium text-right text-xs uppercase tracking-wider border-b border-gray-800">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {accountsCol2.map(renderAccountRow)}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>


            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                isDestructive={confirmDialog.isDestructive}
                loading={clearingProxy || deletingTemplateId !== null}
            />

            {/* Test Result Modal */}
            <TestResultModal
                isOpen={showTestModal}
                onClose={() => setShowTestModal(false)}
                isLoading={testingProxy}
                result={testResult}
            />

            {/* Distribution Modal */}
            {
                showDistributeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 m-4 shadow-xl">
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                                <Shuffle className="w-5 h-5 mr-2 text-indigo-400" />
                                Random Proxy Distribution
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Randomly assign saved proxy templates to your accounts.
                            </p>

                            <form onSubmit={handleDistributeProxies} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Max Accounts per Proxy</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={distributeConfig.maxAccounts}
                                        onChange={e => setDistributeConfig({ ...distributeConfig, maxAccounts: parseInt(e.target.value) || 1 })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Limit how many accounts can share a single proxy template.
                                    </p>
                                </div>

                                <label className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-600 focus:ring-indigo-500 bg-gray-700"
                                        checked={distributeConfig.overwrite}
                                        onChange={e => setDistributeConfig({ ...distributeConfig, overwrite: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-300">Overwrite existing proxies</span>
                                </label>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowDistributeModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={distributing}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center disabled:opacity-50"
                                    >
                                        {distributing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Distributing...
                                            </>
                                        ) : (
                                            <>
                                                <Shuffle className="w-4 h-4 mr-2" />
                                                Distribute
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Batch Import Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Server className="w-5 h-5 mr-3 text-indigo-400" />
                                    Import Batch Proxies
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Paste multiple proxies in any common format.</p>
                            </div>
                            <button onClick={() => setShowBatchModal(false)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!batchResult ? (
                                <form onSubmit={handleBatchImport} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Proxy List</label>
                                        <textarea
                                            className="w-full h-64 bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3 text-gray-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none scrollbar-thin scrollbar-thumb-gray-800"
                                            placeholder={`http://user:pass@host:port\nhost:port:user:pass\nuser:pass:host:port\nhost:port`}
                                            value={batchRawData}
                                            onChange={e => setBatchRawData(e.target.value)}
                                            required
                                        ></textarea>
                                        <div className="flex items-center text-[10px] text-gray-500 space-x-4 px-1">
                                            <span>• Empty lines ignored</span>
                                            <span>• Comment with #</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                        <button
                                            type="button"
                                            onClick={() => setShowBatchModal(false)}
                                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-all font-inter"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isBatchImporting || !batchRawData.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                                        >
                                            {isBatchImporting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            {isBatchImporting ? 'Importing...' : 'Start Import'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Success</p>
                                            <p className="text-3xl font-black text-emerald-400">{batchResult.imported_count}</p>
                                        </div>
                                        <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Processed</p>
                                            <p className="text-3xl font-black text-white">{batchResult.total_processed}</p>
                                        </div>
                                    </div>

                                    {batchResult.errors.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest flex items-center gap-2">
                                                <XCircle className="w-3 h-3" />
                                                Errors Found ({batchResult.errors.length})
                                            </p>
                                            <div className="max-h-40 overflow-y-auto bg-red-500/5 border border-red-500/10 rounded-2xl p-4 scrollbar-thin scrollbar-thumb-red-500/20">
                                                <ul className="space-y-1.5">
                                                    {batchResult.errors.slice(0, 10).map((err, i) => (
                                                        <li key={i} className="text-xs text-red-400/80 font-medium font-mono">{err}</li>
                                                    ))}
                                                    {batchResult.errors.length > 10 && (
                                                        <li className="text-[10px] text-red-400/50 italic pt-1">... and {batchResult.errors.length - 10} more errors</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4 border-t border-gray-800">
                                        <button
                                            onClick={() => { setShowBatchModal(false); setBatchRawData(''); }}
                                            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all font-inter"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

        </div >
    );
};

export default ProxySettings;
