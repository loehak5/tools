import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, XCircle, Globe, Clock, Zap, Settings, RefreshCw } from 'lucide-react';
import api from '../api/client';

interface BulkAddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJobStarted: (jobId: string) => void;
}

interface ParsedAccount {
    username: string;
    password?: string;
    seed_2fa?: string;
    login_method: number;
    cookies?: any;
    proxy?: string;
}

interface ImportResult {
    username: string;
    success: boolean;
    error?: string;
    account_id?: number;
    login_status?: string;
    error_reason?: string;
}

interface JobStatus {
    job_id: string;
    status: string;
    total: number;
    created: number;
    failed: number;
    pending_login: number;
    logged_in: number;
    login_failed: number;
    results: ImportResult[];
}

const BulkAddAccountModal = ({ isOpen, onClose, onJobStarted }: BulkAddAccountModalProps) => {
    if (!isOpen) return null;
    const [inputText, setInputText] = useState('');
    const [commonProxy, setCommonProxy] = useState('');
    const [proxyType, setProxyType] = useState('http://');
    const [proxyMode, setProxyMode] = useState<'manual' | 'template' | 'pool'>('manual');
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);

    // Staggered login options
    const [staggeredLogin, setStaggeredLogin] = useState(true);
    const [minDelay, setMinDelay] = useState(30);
    const [maxDelay, setMaxDelay] = useState(120);
    const [batchSize, setBatchSize] = useState(10);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Job tracking
    const [, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const pollIntervalRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/proxies/');
            setTemplates(res.data);
        } catch (err) {
            console.error("Failed to fetch templates", err);
        }
    };

    const parseAccounts = (text: string): ParsedAccount[] => {
        // Try parsing as JSON first
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                return json.map((item: any) => {
                    let cookies = item.cookies;
                    // Auto-convert array cookies if needed
                    if (Array.isArray(cookies)) {
                        const cookieDict: any = {};
                        cookies.forEach((c: any) => {
                            if (c.name && c.value) cookieDict[c.name] = c.value;
                        });
                        cookies = cookieDict;
                    }

                    return {
                        username: item.username,
                        password: item.password || '',
                        seed_2fa: item.seed_2fa || '',
                        cookies: cookies,
                        proxy: item.proxy || '',
                        login_method: cookies ? 3 : (item.seed_2fa ? 2 : 1)
                    };
                }).filter(acc => acc.username);
            } else if (json.username && json.cookies) {
                // Single account JSON export
                return [{
                    username: json.username,
                    cookies: json.cookies,
                    password: json.password || '',
                    seed_2fa: json.seed_2fa || '',
                    proxy: json.proxy || '',
                    login_method: 3
                }];
            }
        } catch (e) {
            // Not JSON or single JSON object, fall back to text parsing
        }

        const lines = text.trim().split('\n').filter(line => line.trim());
        const accounts: ParsedAccount[] = [];

        for (const line of lines) {
            const parts = line.trim().split(':');

            // Format 1: username:password
            // Format 2: username:password:2fa
            // Format 3: username:cookie_json
            // Format 4: username:password:cookie_json

            if (parts.length >= 2) {
                const username = parts[0].trim();
                const secondPart = parts[1].trim();

                // Check if second part is a cookie JSON
                let isCookie = false;
                try {
                    const potentialCookies = JSON.parse(secondPart);
                    if (typeof potentialCookies === 'object') {
                        accounts.push({
                            username,
                            cookies: potentialCookies,
                            login_method: 3
                        });
                        isCookie = true;
                    }
                } catch (e) { }

                if (!isCookie) {
                    if (parts.length === 2) {
                        accounts.push({
                            username,
                            password: secondPart,
                            login_method: 1
                        });
                    } else if (parts.length >= 3) {
                        const thirdPart = parts[2].trim();

                        // Check if third part is cookie JSON
                        try {
                            const potentialCookies = JSON.parse(thirdPart);
                            if (typeof potentialCookies === 'object') {
                                accounts.push({
                                    username,
                                    password: secondPart,
                                    cookies: potentialCookies,
                                    login_method: 3
                                });
                                isCookie = true;
                            }
                        } catch (e) { }

                        if (!isCookie) {
                            accounts.push({
                                username,
                                password: secondPart,
                                seed_2fa: thirdPart,
                                login_method: 2
                            });
                        }
                    }
                }
            }
        }
        return accounts;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                handleTextChange(content);
            }
        };
        reader.readAsText(file);
    };

    const handleTextChange = (text: string) => {
        setInputText(text);
        setJobStatus(null);
        setParseError(null);
        if (text.trim()) {
            try {
                const parsed = parseAccounts(text);
                setParsedAccounts(parsed);
                if (parsed.length === 0 && text.trim()) {
                    setParseError('Invalid format. Use username:password or username:password:2fa_seed');
                }
            } catch (e) {
                setParseError('Failed to parse input');
                setParsedAccounts([]);
            }
        } else {
            setParsedAccounts([]);
        }
    };

    const isProxyValid = () => {
        if (proxyMode === 'manual') {
            // Manual proxy is now optional (common_proxy can be empty)
            return true;
        } else if (proxyMode === 'template') {
            return selectedTemplateId !== '';
        } else {
            // If using pool, still requires selection, but we could relax the "10" rule if needed.
            // For now, let's just make common_proxy optional.
            return selectedTemplateIds.length > 0;
        }
    };

    const toggleTemplateSelection = (id: string) => {
        setSelectedTemplateIds(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (parsedAccounts.length === 0) {
            setParseError('No accounts to import');
            return;
        }

        if (!isProxyValid()) {
            const msg = proxyMode === 'pool'
                ? 'Please select at least one proxy template for rotation.'
                : 'Please select a proxy template.';
            setParseError(msg);
            return;
        }

        setLoading(true);
        setJobStatus(null);
        setParseError(null);

        try {
            const pool = proxyMode === 'pool'
                ? templates.filter(t => selectedTemplateIds.includes(t.id.toString())).map(t => t.proxy_url)
                : null;

            const payload = {
                accounts: parsedAccounts.map(acc => ({
                    username: acc.username,
                    password: acc.password,
                    seed_2fa: acc.seed_2fa,
                    cookies: acc.cookies,
                    proxy: acc.proxy,
                    login_method: acc.login_method
                })),
                common_proxy: proxyMode === 'manual'
                    ? ((commonProxy.trim() && !commonProxy.includes('://'))
                        ? `${proxyType}${commonProxy.trim()}`
                        : commonProxy.trim())
                    : (proxyMode === 'template' ? (templates.find(t => t.id.toString() === selectedTemplateId)?.proxy_url || null) : null),
                proxy_pool: pool,
                staggered_login: staggeredLogin,
                min_delay: minDelay,
                max_delay: maxDelay,
                batch_size: batchSize
            };

            const res = await api.post('/accounts/bulk', payload);

            if (res.data.job_id) {
                onJobStarted(res.data.job_id);
                // Call handleClose to reset state and close immediately
                handleClose();
            }
        } catch (err: any) {
            console.error('Bulk import failed:', err);
            setParseError(err.response?.data?.detail || 'Failed to import accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Clean up polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        setInputText('');
        setCommonProxy('');
        setParsedAccounts([]);
        setJobId(null);
        setJobStatus(null);
        setParseError(null);
        onClose();
    };

    const getProgressPercentage = () => {
        if (!jobStatus) return 0;
        const total = jobStatus.pending_login + jobStatus.logged_in + jobStatus.login_failed;
        if (total === 0) return 100;
        return Math.round(((jobStatus.logged_in + jobStatus.login_failed) / total) * 100);
    };

    const getLoginStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="w-3 h-3 text-green-400" />;
            case 'failed':
            case 'challenge':
                return <XCircle className="w-3 h-3 text-red-400" />;
            case 'pending':
            case 'authenticating':
                return <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />;
            default:
                return <Clock className="w-3 h-3 text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-indigo-500/10 p-2 rounded-xl">
                            <Upload className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Bulk Add Accounts</h2>
                            <p className="text-gray-400 text-sm">Import up to 100+ accounts at once</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-500 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Format Info */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                    <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-gray-300 font-medium">Supported Format</p>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Standard</p>
                                    <p className="text-xs text-gray-400 font-mono">
                                        user:pass<br />
                                        user:pass:2fa
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-indigo-400 uppercase font-bold">Cookie Method</p>
                                    <p className="text-xs text-indigo-300/70 font-mono">
                                        user:{"{json_cookies}"}<br />
                                        .JSON / .TXT Upload
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-gray-400">
                            Account Credentials (one per line)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".txt,.json"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="cookie-file-upload"
                            />
                            <label
                                htmlFor="cookie-file-upload"
                                className="text-[10px] bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 px-2 py-1 rounded cursor-pointer border border-indigo-500/30 transition-colors flex items-center gap-1"
                            >
                                <Upload className="w-3 h-3" />
                                Import .TXT / .JSON
                            </label>
                        </div>
                    </div>
                    <textarea
                        value={inputText}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="username1:password1&#10;username2:password2:ABCD1234SEED&#10;username3:{'sessionid': '...'}"
                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder-gray-600"
                        disabled={loading || jobStatus !== null}
                    />
                </div>

                {/* Common Proxy */}
                <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Proxy Configuration (Optional)</label>
                        {templates.length > 0 && (
                            <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                                {[
                                    { id: 'manual', label: 'MANUAL' },
                                    { id: 'template', label: 'SINGLE' },
                                    { id: 'pool', label: 'POOL' }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setProxyMode(m.id as any)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${proxyMode === m.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {proxyMode === 'manual' ? (
                        <div className="flex space-x-2">
                            <div className="relative flex-1">
                                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={commonProxy}
                                    onChange={(e) => setCommonProxy(e.target.value)}
                                    placeholder="user:pass@host:port"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={loading || jobStatus !== null}
                                />
                            </div>
                            <select
                                value={proxyType}
                                onChange={(e) => setProxyType(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-24"
                                disabled={loading || jobStatus !== null}
                            >
                                <option value="http://">HTTP</option>
                                <option value="https://">HTTPS</option>
                                <option value="socks4://">SOCKS4</option>
                                <option value="socks5://">SOCKS5</option>
                            </select>
                        </div>
                    ) : proxyMode === 'template' ? (
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                            disabled={loading || jobStatus !== null}
                        >
                            <option value="">Select a template...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.proxy_url})</option>
                            ))}
                        </select>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className={`font-bold ${selectedTemplateIds.length >= 10 ? 'text-green-400' : 'text-yellow-500'}`}>
                                    {selectedTemplateIds.length} / 10 MINIMUM SELECTED
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTemplateIds(templates.map(t => t.id.toString()))}
                                    className="text-indigo-400 hover:text-indigo-300"
                                >
                                    Select All
                                </button>
                            </div>
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                {templates.map(t => (
                                    <label
                                        key={t.id}
                                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedTemplateIds.includes(t.id.toString()) ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-gray-700/50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTemplateIds.includes(t.id.toString())}
                                            onChange={() => toggleTemplateSelection(t.id.toString())}
                                            className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white font-medium truncate">{t.name}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{t.proxy_url}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-500 flex items-center">
                                <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                                Proxies will be randomly assigned to each account in the list.
                            </p>
                        </div>
                    )}
                </div>

                {/* Staggered Login Toggle */}
                <div className="mb-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <div>
                                <p className="text-sm text-white font-medium">Staggered Login</p>
                                <p className="text-xs text-gray-500">Login accounts gradually with unique delays to avoid bans</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={staggeredLogin}
                                onChange={(e) => setStaggeredLogin(e.target.checked)}
                                className="sr-only peer"
                                disabled={loading || jobStatus !== null}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* Advanced Settings */}
                    {staggeredLogin && (
                        <div className="mt-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white"
                            >
                                <Settings className="w-4 h-4" />
                                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Settings</span>
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Min Delay (sec)</label>
                                        <input
                                            type="number"
                                            value={minDelay}
                                            onChange={(e) => setMinDelay(parseInt(e.target.value) || 30)}
                                            min={10}
                                            max={300}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                            disabled={loading || jobStatus !== null}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Max Delay (sec)</label>
                                        <input
                                            type="number"
                                            value={maxDelay}
                                            onChange={(e) => setMaxDelay(parseInt(e.target.value) || 120)}
                                            min={30}
                                            max={600}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                            disabled={loading || jobStatus !== null}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Batch Size</label>
                                        <input
                                            type="number"
                                            value={batchSize}
                                            onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                                            min={1}
                                            max={50}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                                            disabled={loading || jobStatus !== null}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Parse Error */}
                {parseError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{parseError}</p>
                    </div>
                )}

                {/* Preview / Parsed Accounts */}
                {parsedAccounts.length > 0 && !jobStatus && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <p className="text-sm text-gray-300 font-medium mb-2">
                            Preview: {parsedAccounts.length} account(s) found
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                            {parsedAccounts.slice(0, 20).map((acc, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-white font-medium">@{acc.username}</span>
                                    <span className={`px-2 py-0.5 rounded ${acc.login_method === 3 ? 'bg-indigo-500/10 text-indigo-400' :
                                            acc.login_method === 2 ? 'bg-purple-500/10 text-purple-400' :
                                                'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        {acc.login_method === 3 ? 'Cookie' : acc.login_method === 2 ? '2FA' : 'Password'}
                                    </span>
                                </div>
                            ))}
                            {parsedAccounts.length > 20 && (
                                <p className="text-gray-500 text-xs mt-2">... and {parsedAccounts.length - 20} more</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Job Progress */}
                {jobStatus && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                {jobStatus.status === 'completed' ? (
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                    <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                                )}
                                <p className="text-sm text-white font-medium">
                                    {jobStatus.status === 'completed' ? 'Import Complete' : 'Login in Progress...'}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400">
                                {getProgressPercentage()}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                            <div
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercentage()}%` }}
                            />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-white">{jobStatus.created}</p>
                                <p className="text-xs text-gray-400">Created</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-green-400">{jobStatus.logged_in}</p>
                                <p className="text-xs text-gray-400">Logged In</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-yellow-400">{jobStatus.pending_login}</p>
                                <p className="text-xs text-gray-400">Pending</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-red-400">{jobStatus.login_failed}</p>
                                <p className="text-xs text-gray-400">Failed</p>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {jobStatus.results.map((result, idx) => (
                                <div key={idx} className="text-sm p-2 bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-medium">@{result.username}</span>
                                        <div className="flex items-center space-x-2">
                                            {result.success ? (
                                                <span className="flex items-center text-xs space-x-1">
                                                    {getLoginStatusIcon(result.login_status || 'pending')}
                                                    <span className={
                                                        result.login_status === 'active' ? 'text-green-400' :
                                                            result.login_status === 'failed' ? 'text-red-400' :
                                                                'text-yellow-400'
                                                    }>
                                                        {result.login_status || 'pending'}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-red-400 text-xs">
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    {result.error}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Show error reason if login failed */}
                                    {result.error_reason && (
                                        <div className="mt-1 text-xs text-red-400/80 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                            <span className="font-medium">Reason:</span> {result.error_reason.length > 100 ? result.error_reason.slice(0, 100) + '...' : result.error_reason}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
                    >
                        {jobStatus?.status === 'completed' ? 'Close' : 'Cancel'}
                    </button>
                    {!jobStatus && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || parsedAccounts.length === 0 || !isProxyValid()}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Import {parsedAccounts.length} Account{parsedAccounts.length !== 1 ? 's' : ''}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Staggered Login Info */}
                {staggeredLogin && !jobStatus && parsedAccounts.length > 0 && (
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Estimated time: ~{Math.ceil(parsedAccounts.length * ((minDelay + maxDelay) / 2) / 60)} minutes
                            (with delays between {minDelay}-{maxDelay}s)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkAddAccountModal;
