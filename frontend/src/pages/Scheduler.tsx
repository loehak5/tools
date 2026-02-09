import React, { useState, useEffect, useRef } from 'react';
import { Image, Heart, UserPlus, Eye, ArrowLeft, Calendar, Upload, X, Clock, User, AlertCircle, Loader2, Shuffle, Zap, CheckSquare, Square, Users, Activity, Video, Play } from 'lucide-react';
import api from '../api/client';

type SchedulerMenu = 'main' | 'post' | 'like' | 'follow' | 'view' | 'reels' | 'story';

interface MenuOption {
    id: SchedulerMenu;
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    gradient: string;
}

interface Account {
    id: number;
    username: string;
    status: string;
    has_threads?: boolean;
}

interface TaskStats {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
}

const menuOptions: MenuOption[] = [
    {
        id: 'post',
        icon: Image,
        title: 'Schedule Post Image',
        description: 'Jadwalkan posting gambar ke akun Instagram Anda',
        color: 'text-pink-400',
        gradient: 'from-pink-500/20 to-rose-500/20'
    },
    {
        id: 'like',
        icon: Heart,
        title: 'Schedule Like',
        description: 'Jadwalkan aksi like otomatis pada post tertentu',
        color: 'text-red-400',
        gradient: 'from-red-500/20 to-orange-500/20'
    },
    {
        id: 'follow',
        icon: UserPlus,
        title: 'Schedule Follow',
        description: 'Jadwalkan aksi follow akun secara otomatis',
        color: 'text-blue-400',
        gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
        id: 'view',
        icon: Eye,
        title: 'Schedule View',
        description: 'Jadwalkan view story atau reels secara otomatis',
        color: 'text-purple-400',
        gradient: 'from-purple-500/20 to-violet-500/20'
    },
    {
        id: 'reels',
        icon: Video,
        title: 'Schedule Reels',
        description: 'Jadwalkan posting video Reels ke Instagram',
        color: 'text-indigo-400',
        gradient: 'from-indigo-500/20 to-cyan-500/20'
    },
    {
        id: 'story',
        icon: Play,
        title: 'Schedule Story',
        description: 'Jadwalkan posting Story dengan link opsional',
        color: 'text-amber-400',
        gradient: 'from-amber-500/20 to-orange-500/20'
    }
];

// Helper: Generate random time within range
const generateRandomSchedule = (minMinutes: number, maxMinutes: number): Date => {
    const now = new Date();
    const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
    return new Date(now.getTime() + randomMinutes * 60000);
};

// Helper: Generate unique random times for multiple accounts
// For < 50 accounts, ensures each account gets a unique time (different by at least 1 second)
// For >= 50 accounts, allows duplicates but still randomizes
const generateUniqueRandomSchedules = (count: number, minMinutes: number, maxMinutes: number): Date[] => {
    const now = new Date();
    const usedTimestamps = new Set<number>();
    const results: Date[] = [];

    // Calculate total seconds in range for better distribution
    const minSeconds = minMinutes * 60;
    const maxSeconds = maxMinutes * 60;
    const rangeSeconds = maxSeconds - minSeconds + 1;

    // If less than 50 accounts, ensure unique times
    const ensureUnique = count < 50;

    for (let i = 0; i < count; i++) {
        let randomSeconds: number;
        let timestamp: number;

        if (ensureUnique && rangeSeconds >= count) {
            // Ensure unique timestamp for each account
            let attempts = 0;
            do {
                randomSeconds = Math.floor(Math.random() * rangeSeconds) + minSeconds;
                timestamp = now.getTime() + randomSeconds * 1000;
                attempts++;
            } while (usedTimestamps.has(timestamp) && attempts < 1000);

            usedTimestamps.add(timestamp);
        } else if (ensureUnique) {
            // Range too small for unique times, distribute evenly with offsets
            const baseSeconds = minSeconds + Math.floor((rangeSeconds / count) * i);
            const offset = Math.floor(Math.random() * Math.max(1, Math.floor(rangeSeconds / count)));
            randomSeconds = Math.min(baseSeconds + offset, maxSeconds);
            timestamp = now.getTime() + randomSeconds * 1000;
        } else {
            // 50+ accounts, just use random (duplicates acceptable)
            randomSeconds = Math.floor(Math.random() * rangeSeconds) + minSeconds;
            timestamp = now.getTime() + randomSeconds * 1000;
        }

        results.push(new Date(timestamp));
    }

    // Shuffle the array to avoid sequential patterns
    for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
    }

    return results;
};

// Helper: Format date for datetime-local input
const formatDateForInput = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Helper: Get timezone info (WIB/UTC+7)
const getTimezoneInfo = (): string => {
    const offset = -new Date().getTimezoneOffset() / 60;
    const sign = offset >= 0 ? '+' : '-';
    return `UTC${sign}${Math.abs(offset)}`;
};

const MenuCard = ({ option, onClick }: { option: MenuOption; onClick: () => void }) => {
    const Icon = option.icon;
    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden p-6 rounded-2xl border border-gray-800 
                bg-gradient-to-br ${option.gradient}
                hover:border-gray-600 hover:scale-[1.02]
                transition-all duration-300 text-left group
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className={`p-3 rounded-xl bg-gray-800/50 w-fit mb-4`}>
                <Icon className={`w-8 h-8 ${option.color}`} />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
            <p className="text-sm text-gray-400">{option.description}</p>

            <div className="mt-4 flex items-center text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Click to schedule</span>
            </div>
        </button>
    );
};

// Multi-Account Selector Component with Task Stats
const MultiAccountSelector = ({
    accounts,
    selectedAccounts,
    setSelectedAccounts,
    taskStats
}: {
    accounts: Account[];
    selectedAccounts: number[];
    setSelectedAccounts: (ids: number[]) => void;
    taskStats: Record<number, TaskStats>;
}) => {
    const activeAccounts = accounts.filter(a => a.status === 'active');
    const allSelected = activeAccounts.length > 0 && selectedAccounts.length === activeAccounts.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(activeAccounts.map(a => a.id));
        }
    };

    const toggleAccount = (id: number) => {
        if (selectedAccounts.includes(id)) {
            setSelectedAccounts(selectedAccounts.filter(i => i !== id));
        } else {
            setSelectedAccounts([...selectedAccounts, id]);
        }
    };

    const getAccountStats = (accountId: number) => {
        return taskStats[accountId] || { pending: 0, running: 0, completed: 0, failed: 0, total: 0 };
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                    <Users className="w-4 h-4 inline mr-2" />
                    Select Accounts ({selectedAccounts.length}/{activeAccounts.length})
                </label>
                <button
                    type="button"
                    onClick={toggleAll}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${allSelected
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                        }`}
                >
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    Select All
                </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-gray-800/50 rounded-xl border border-gray-700">
                {activeAccounts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No active accounts available</p>
                ) : (
                    activeAccounts.map(account => {
                        const stats = getAccountStats(account.id);
                        return (
                            <button
                                key={account.id}
                                type="button"
                                onClick={() => toggleAccount(account.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedAccounts.includes(account.id)
                                    ? 'bg-indigo-500/20 border border-indigo-500/50'
                                    : 'bg-gray-700/50 border border-transparent hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {selectedAccounts.includes(account.id) ? (
                                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-500" />
                                    )}
                                    <span className="text-white">@{account.username}</span>
                                </div>

                                {/* Task Stats Badges */}
                                <div className="flex items-center gap-1.5">
                                    {stats.total > 0 && (
                                        <>
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300" title="Total tasks">
                                                <Activity className="w-3 h-3" />
                                                {stats.total}
                                            </span>
                                            {stats.completed > 0 && (
                                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs" title="Completed">
                                                    ✓{stats.completed}
                                                </span>
                                            )}
                                            {stats.pending > 0 && (
                                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs" title="Pending">
                                                    ⏳{stats.pending}
                                                </span>
                                            )}
                                            {stats.failed > 0 && (
                                                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs" title="Failed">
                                                    ✗{stats.failed}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {stats.total === 0 && (
                                        <span className="px-1.5 py-0.5 bg-gray-600/30 text-gray-500 rounded text-xs">New</span>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Execution Mode Selector Component
const ExecutionModeSelector = ({
    mode,
    setMode,
    scheduledAt,
    setScheduledAt,
    minMinutes,
    setMinMinutes,
    maxMinutes,
    setMaxMinutes,
    onRandomize,
    isMultiAccount = false
}: {
    mode: 'schedule' | 'random' | 'now';
    setMode: (m: 'schedule' | 'random' | 'now') => void;
    scheduledAt: string;
    setScheduledAt: (s: string) => void;
    minMinutes: number;
    setMinMinutes: (n: number) => void;
    maxMinutes: number;
    setMaxMinutes: (n: number) => void;
    onRandomize: () => void;
    isMultiAccount?: boolean;
}) => {
    return (
        <div className="space-y-4">
            {/* Mode Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Execution Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('now')}
                        className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'now'
                            ? 'bg-green-500/20 border-green-500 text-green-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        Execute Now
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('schedule')}
                        className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'schedule'
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Schedule
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('random')}
                        className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'random'
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                    >
                        <Shuffle className="w-4 h-4" />
                        Random
                    </button>
                </div>
            </div>

            {/* Schedule Time Input */}
            {mode === 'schedule' && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Schedule Time ({getTimezoneInfo()}) {isMultiAccount && <span className="text-gray-500">(same for all accounts)</span>}
                    </label>
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        required={mode === 'schedule'}
                    />
                    <p className="mt-1 text-xs text-gray-500">Waktu akan dijadwalkan sesuai timezone lokal Anda</p>
                </div>
            )}

            {/* Random Time Settings */}
            {mode === 'random' && (
                <div className="space-y-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <p className="text-sm text-gray-400">
                        Random delay from now (in minutes)
                        {isMultiAccount && <span className="text-purple-400 ml-1">- each account gets unique time</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                            <input
                                type="number"
                                value={minMinutes}
                                onChange={(e) => setMinMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                            <input
                                type="number"
                                value={maxMinutes}
                                onChange={(e) => setMaxMinutes(Math.max(minMinutes, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                min={minMinutes}
                            />
                        </div>
                    </div>
                    {!isMultiAccount && (
                        <>
                            <button
                                type="button"
                                onClick={onRandomize}
                                className="w-full py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2"
                            >
                                <Shuffle className="w-4 h-4" />
                                Generate Random Time
                            </button>
                            {scheduledAt && (
                                <p className="text-xs text-center text-gray-400">
                                    Scheduled for: <span className="text-purple-400">{new Date(scheduledAt).toLocaleString()}</span>
                                </p>
                            )}
                        </>
                    )}
                    {isMultiAccount && (
                        <p className="text-xs text-center text-purple-400">
                            ⏱️ Random times will be generated for each account on submit
                        </p>
                    )}
                </div>
            )}

            {/* Execute Now Info */}
            {mode === 'now' && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {isMultiAccount
                            ? 'All selected accounts will execute immediately'
                            : 'Task will be executed immediately after submission'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

// Selection Mode Toggle Component
const SelectionModeToggle = ({ isMultiAccount, setMultiAccount }: { isMultiAccount: boolean; setMultiAccount: (v: boolean) => void }) => {
    return (
        <div className="flex p-1 bg-gray-800 rounded-xl border border-gray-700 mb-6">
            <button
                type="button"
                onClick={() => setMultiAccount(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${!isMultiAccount
                    ? 'bg-gray-700 text-white shadow-lg border border-gray-600'
                    : 'text-gray-400 hover:text-gray-300'
                    }`}
            >
                <User className="w-4 h-4" />
                Single Account
            </button>
            <button
                type="button"
                onClick={() => setMultiAccount(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${isMultiAccount
                    ? 'bg-gray-700 text-white shadow-lg border border-gray-600'
                    : 'text-gray-400 hover:text-gray-300'
                    }`}
            >
                <Users className="w-4 h-4" />
                Multi Account
            </button>
        </div>
    );
};

// Schedule Post Image Form (Single/Multi Account)
const SchedulePostForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [caption, setCaption] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('schedule');
    const [minMinutes, setMinMinutes] = useState(5);
    const [maxMinutes, setMaxMinutes] = useState(60);
    const [shareToThreads, setShareToThreads] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

        if (activeSelectedAccounts.length === 0 || !selectedFile) {
            setError('Please select account(s) and upload image');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        try {
            // Pre-generate unique random times for all accounts
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(activeSelectedAccounts.length, minMinutes, maxMinutes)
                : [];

            let succeeded = 0;
            for (let i = 0; i < activeSelectedAccounts.length; i++) {
                const accountId = activeSelectedAccounts[i];
                let finalScheduledAt: string;
                if (mode === 'now') {
                    finalScheduledAt = new Date().toISOString();
                } else if (mode === 'random') {
                    finalScheduledAt = randomSchedules[i].toISOString();
                } else {
                    finalScheduledAt = new Date(scheduledAt).toISOString();
                }

                const formData = new FormData();
                formData.append('account_id', accountId.toString());
                formData.append('scheduled_at', finalScheduledAt);
                formData.append('caption', caption);
                formData.append('image', selectedFile);
                formData.append('share_to_threads', shareToThreads ? 'true' : 'false');
                formData.append('execute_now', mode === 'now' ? 'true' : 'false');

                try {
                    await api.post('/tasks/post', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    succeeded++;
                    setSuccessCount(succeeded);
                } catch (err) {
                    console.error(`Failed to post for account ${accountId}:`, err);
                }
            }

            if (succeeded === activeSelectedAccounts.length) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${activeSelectedAccounts.length} tasks created successfully`);
            }
        } catch (err: unknown) {
            setError('Failed to schedule post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Image className="w-6 h-6 mr-3 text-pink-400" />
                    Schedule Post Image
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Upload className="w-4 h-4 inline mr-2" />
                            Upload Image
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                        />
                        {preview ? (
                            <div className="relative">
                                <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
                                <button
                                    type="button"
                                    onClick={() => { setSelectedFile(null); setPreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-indigo-500 transition-colors"
                            >
                                <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                                <p className="text-gray-400">Click to upload image</p>
                            </button>
                        )}
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Caption</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={4}
                            placeholder="Write your caption here..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                    </div>

                    {/* Execution Mode */}
                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    {/* Share to Threads Toggle */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-sm">Share to Threads</h3>
                                <p className="text-[10px] text-gray-500">Cross-post this image to your Threads account</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShareToThreads(!shareToThreads)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${shareToThreads ? 'bg-indigo-500' : 'bg-gray-700'
                                }`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${shareToThreads ? 'left-5.5' : 'left-0.5'
                                }`} />
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || (isMultiAccount ? selectedAccounts.length === 0 : !selectedAccount)}
                        className={`w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center`}
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isMultiAccount ? `Creating ${successCount}/${selectedAccounts.length}...` : 'Processing...'}</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> Post Now {isMultiAccount && `(${selectedAccounts.length} accounts)`}</>
                        ) : (
                            <><Calendar className="w-5 h-5 mr-2" /> Schedule Post {isMultiAccount && `(${selectedAccounts.length} accounts)`}</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Schedule Like Form (Single/Multi Account)
const ScheduleLikeForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [mediaUrl, setMediaUrl] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('random');
    const [minMinutes, setMinMinutes] = useState(1);
    const [maxMinutes, setMaxMinutes] = useState(30);

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

        if (activeSelectedAccounts.length === 0 || !mediaUrl) {
            setError('Please select at least one account and enter post URL');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        try {
            // Pre-generate unique random times for all accounts
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(activeSelectedAccounts.length, minMinutes, maxMinutes)
                : [];

            const results = await Promise.allSettled(
                activeSelectedAccounts.map(async (accountId, index) => {
                    let finalScheduledAt: string;
                    if (mode === 'now') {
                        finalScheduledAt = new Date().toISOString();
                    } else if (mode === 'random') {
                        // Use pre-generated unique random time for each account
                        finalScheduledAt = randomSchedules[index].toISOString();
                    } else {
                        finalScheduledAt = new Date(scheduledAt).toISOString();
                    }

                    return api.post('/tasks/like', {
                        account_id: accountId,
                        scheduled_at: finalScheduledAt,
                        media_url: mediaUrl,
                        execute_now: mode === 'now'
                    });
                })
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            setSuccessCount(succeeded);

            if (succeeded === activeSelectedAccounts.length) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${activeSelectedAccounts.length} tasks created successfully`);
            }
        } catch {
            setError('Failed to schedule likes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Heart className="w-6 h-6 mr-3 text-red-400" />
                    Schedule Like
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Post URL</label>
                        <input
                            type="url"
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            placeholder="https://instagram.com/p/..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                            required
                        />
                    </div>

                    {/* Execution Mode */}
                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    <button
                        type="submit"
                        disabled={loading || (isMultiAccount ? selectedAccounts.length === 0 : !selectedAccount)}
                        className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating {successCount}/{isMultiAccount ? selectedAccounts.length : 1}...</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> Like Now ({isMultiAccount ? selectedAccounts.length : 1} accounts)</>
                        ) : (
                            <><Heart className="w-5 h-5 mr-2" /> Schedule Like ({isMultiAccount ? selectedAccounts.length : 1} accounts)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Schedule Follow Form (Single/Multi Account)
const ScheduleFollowForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [targetUsername, setTargetUsername] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('random');
    const [minMinutes, setMinMinutes] = useState(1);
    const [maxMinutes, setMaxMinutes] = useState(30);

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targets = targetUsername.split(/[\n,]+/).map(t => t.trim().replace('@', '')).filter(t => t);

        if (activeSelectedAccounts.length === 0 || targets.length === 0) {
            setError('Please select account(s) and enter target username(s)');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        const totalTasksCount = activeSelectedAccounts.length * targets.length;

        try {
            // Pre-generate unique random times for all accounts and targets
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(totalTasksCount, minMinutes, maxMinutes)
                : [];

            let succeeded = 0;
            let taskIndex = 0;

            for (const accountId of activeSelectedAccounts) {
                for (const target of targets) {
                    let finalScheduledAt: string;
                    if (mode === 'now') {
                        finalScheduledAt = new Date().toISOString();
                    } else if (mode === 'random') {
                        // Use pre-generated unique random time for each task
                        finalScheduledAt = randomSchedules[taskIndex].toISOString();
                    } else {
                        finalScheduledAt = new Date(scheduledAt).toISOString();
                    }

                    try {
                        await api.post('/tasks/follow', {
                            account_id: accountId,
                            scheduled_at: finalScheduledAt,
                            target_username: target,
                            execute_now: mode === 'now'
                        });
                        succeeded++;
                        setSuccessCount(succeeded);
                    } catch (err) {
                        console.error(`Failed to create follow task for ${target} from account ${accountId}:`, err);
                    }
                    taskIndex++;
                }
            }

            if (succeeded === totalTasksCount) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${totalTasksCount} tasks created successfully`);
            }
        } catch {
            setError('Failed to schedule follows');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <UserPlus className="w-6 h-6 mr-3 text-blue-400" />
                    Schedule Follow
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Username(s)</label>
                        <textarea
                            value={targetUsername}
                            onChange={(e) => setTargetUsername(e.target.value)}
                            placeholder="@username1, @username2, ..."
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                            required
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                            Separate with commas or newlines for multiple targets.
                        </p>
                    </div>

                    {/* Execution Mode */}
                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    <button
                        type="submit"
                        disabled={loading || (isMultiAccount ? selectedAccounts.length === 0 : !selectedAccount)}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating {successCount}/{activeSelectedAccounts.length * (targetUsername.split(/[\n,]+/).filter(t => t).length)}...</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> Follow Now ({activeSelectedAccounts.length} accounts)</>
                        ) : (
                            <><UserPlus className="w-5 h-5 mr-2" /> Schedule Follow ({activeSelectedAccounts.length} accounts)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Schedule View Form (Single/Multi Account)
const ScheduleViewForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [storyUrl, setStoryUrl] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('random');
    const [minMinutes, setMinMinutes] = useState(1);
    const [maxMinutes, setMaxMinutes] = useState(30);

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

        if (activeSelectedAccounts.length === 0 || !storyUrl) {
            setError('Please select at least one account and enter story URL');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        try {
            // Pre-generate unique random times for all accounts
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(activeSelectedAccounts.length, minMinutes, maxMinutes)
                : [];

            const results = await Promise.allSettled(
                activeSelectedAccounts.map(async (accountId, index) => {
                    let finalScheduledAt: string;
                    if (mode === 'now') {
                        finalScheduledAt = new Date().toISOString();
                    } else if (mode === 'random') {
                        // Use pre-generated unique random time for each account
                        finalScheduledAt = randomSchedules[index].toISOString();
                    } else {
                        finalScheduledAt = new Date(scheduledAt).toISOString();
                    }

                    return api.post('/tasks/view', {
                        account_id: accountId,
                        scheduled_at: finalScheduledAt,
                        story_url: storyUrl,
                        execute_now: mode === 'now'
                    });
                })
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            setSuccessCount(succeeded);

            if (succeeded === activeSelectedAccounts.length) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${activeSelectedAccounts.length} tasks created successfully`);
            }
        } catch {
            setError('Failed to schedule views');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Eye className="w-6 h-6 mr-3 text-purple-400" />
                    Schedule View
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Story/Reel URL</label>
                        <input
                            type="url"
                            value={storyUrl}
                            onChange={(e) => setStoryUrl(e.target.value)}
                            placeholder="https://instagram.com/stories/..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                            required
                        />
                    </div>

                    {/* Execution Mode */}
                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    <button
                        type="submit"
                        disabled={loading || (isMultiAccount ? selectedAccounts.length === 0 : !selectedAccount)}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating {successCount}/{isMultiAccount ? selectedAccounts.length : 1}...</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> View Now ({isMultiAccount ? selectedAccounts.length : 1} accounts)</>
                        ) : (
                            <><Eye className="w-5 h-5 mr-2" /> Schedule View ({isMultiAccount ? selectedAccounts.length : 1} accounts)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ScheduleReelsForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [caption, setCaption] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('schedule');
    const [minMinutes, setMinMinutes] = useState(5);
    const [maxMinutes, setMaxMinutes] = useState(60);
    const [shareToThreads, setShareToThreads] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                setError('Please select a video file');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('Video size must be under 10MB');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

        if (activeSelectedAccounts.length === 0 || !selectedFile) {
            setError('Please select account(s) and upload video');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        try {
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(activeSelectedAccounts.length, minMinutes, maxMinutes)
                : [];

            const results = await Promise.allSettled(
                activeSelectedAccounts.map(async (accountId, index) => {
                    let finalScheduledAt: string;
                    if (mode === 'now') {
                        finalScheduledAt = new Date().toISOString();
                    } else if (mode === 'random') {
                        finalScheduledAt = randomSchedules[index].toISOString();
                    } else {
                        finalScheduledAt = new Date(scheduledAt).toISOString();
                    }

                    const formData = new FormData();
                    formData.append('account_id', accountId.toString());
                    formData.append('scheduled_at', finalScheduledAt);
                    formData.append('caption', caption);
                    formData.append('video', selectedFile);
                    formData.append('share_to_threads', shareToThreads ? 'true' : 'false');
                    formData.append('execute_now', mode === 'now' ? 'true' : 'false');

                    return api.post('/tasks/reels', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                })
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            setSuccessCount(succeeded);

            if (succeeded === activeSelectedAccounts.length) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${activeSelectedAccounts.length} tasks created successfully`);
            }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setError(axiosErr.response?.data?.detail || 'Failed to schedule reels');
            } else {
                setError('Failed to schedule reels');
            }
        } finally {
            setLoading(false);
        }
    };

    const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Video className="w-6 h-6 mr-3 text-indigo-400" />
                    Schedule Reels
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Guidelines Info */}
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <h4 className="flex items-center text-sm font-medium text-indigo-400 mb-2">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Video Guidelines
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-1">
                            <li>Duration: Max <b>90 seconds</b></li>
                            <li>Format: MP4 or MOV (9:16 Vertical)</li>
                            <li>Size: Max <b>10MB</b></li>
                        </ul>
                    </div>

                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    {/* Video Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Upload className="w-4 h-4 inline mr-2" />
                            Upload Video
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="video/*"
                            className="hidden"
                        />
                        {preview ? (
                            <div className="relative">
                                <video src={preview} controls className="w-full max-h-64 rounded-xl" />
                                <button
                                    type="button"
                                    onClick={() => { setSelectedFile(null); setPreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-indigo-500 transition-colors"
                            >
                                <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                                <p className="text-gray-400">Click to upload video</p>
                            </button>
                        )}
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Caption</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={4}
                            placeholder="Write your reels caption here..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                    </div>

                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    {/* Share to Threads Toggle */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-sm">Share to Threads</h3>
                                <p className="text-[10px] text-gray-500">Cross-post this reel to your Threads account</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShareToThreads(!shareToThreads)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${shareToThreads ? 'bg-indigo-500' : 'bg-gray-700'
                                }`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${shareToThreads ? 'left-5.5' : 'left-0.5'
                                }`} />
                        </button>
                    </div>


                    <button
                        type="submit"
                        disabled={loading || activeSelectedAccounts.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating {successCount}/{activeSelectedAccounts.length}...</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> Post Reels Now ({activeSelectedAccounts.length} accounts)</>
                        ) : (
                            <><Calendar className="w-5 h-5 mr-2" /> Schedule Reels ({activeSelectedAccounts.length} accounts)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const ScheduleStoryForm = ({ onBack, accounts, onSuccess, taskStats }: { onBack: () => void; accounts: Account[]; onSuccess: () => void; taskStats: Record<number, TaskStats> }) => {
    const [isMultiAccount, setMultiAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [caption, setCaption] = useState('');
    const [link, setLink] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [mode, setMode] = useState<'schedule' | 'random' | 'now'>('schedule');
    const [minMinutes, setMinMinutes] = useState(5);
    const [maxMinutes, setMaxMinutes] = useState(60);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRandomize = () => {
        const randomDate = generateRandomSchedule(minMinutes, maxMinutes);
        setScheduledAt(formatDateForInput(randomDate));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

        if (activeSelectedAccounts.length === 0 || !selectedFile) {
            setError('Please select account(s) and upload media');
            return;
        }
        if (mode === 'schedule' && !scheduledAt) {
            setError('Please select schedule time');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessCount(0);

        try {
            const randomSchedules = mode === 'random'
                ? generateUniqueRandomSchedules(activeSelectedAccounts.length, minMinutes, maxMinutes)
                : [];

            const results = await Promise.allSettled(
                activeSelectedAccounts.map(async (accountId, index) => {
                    let finalScheduledAt: string;
                    if (mode === 'now') {
                        finalScheduledAt = new Date().toISOString();
                    } else if (mode === 'random') {
                        finalScheduledAt = randomSchedules[index].toISOString();
                    } else {
                        finalScheduledAt = new Date(scheduledAt).toISOString();
                    }

                    const formData = new FormData();
                    formData.append('account_id', accountId.toString());
                    formData.append('scheduled_at', finalScheduledAt);
                    formData.append('caption', caption);
                    formData.append('link', link);
                    formData.append('media', selectedFile);
                    formData.append('execute_now', mode === 'now' ? 'true' : 'false');

                    return api.post('/tasks/story', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                })
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            setSuccessCount(succeeded);

            if (succeeded === activeSelectedAccounts.length) {
                onSuccess();
                onBack();
            } else {
                setError(`${succeeded}/${activeSelectedAccounts.length} tasks created successfully`);
            }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setError(axiosErr.response?.data?.detail || 'Failed to schedule story');
            } else {
                setError('Failed to schedule story');
            }
        } finally {
            setLoading(false);
        }
    };

    const isVideo = selectedFile?.type.startsWith('video/');
    const activeSelectedAccounts = isMultiAccount ? selectedAccounts : (selectedAccount ? [selectedAccount] : []);

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to menu
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    <Play className="w-6 h-6 mr-3 text-amber-400" />
                    Schedule Story
                </h2>

                <SelectionModeToggle isMultiAccount={isMultiAccount} setMultiAccount={setMultiAccount} />

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Guidelines Info */}
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <h4 className="flex items-center text-sm font-medium text-amber-400 mb-2">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Media Guidelines
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-1">
                            <li>Video Duration: Max <b>60 seconds</b></li>
                            <li>Format: MP4 or MOV (9:16 Vertical)</li>
                            <li>Size: Max <b>10MB</b></li>
                        </ul>
                    </div>

                    {/* Account Selection */}
                    {!isMultiAccount ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Select Account
                            </label>
                            <select
                                value={selectedAccount || ''}
                                onChange={(e) => setSelectedAccount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                                required={!isMultiAccount}
                            >
                                <option value="">Choose an account...</option>
                                {accounts.filter(a => a.status === 'active').map(account => (
                                    <option key={account.id} value={account.id}>
                                        @{account.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <MultiAccountSelector
                            accounts={accounts}
                            selectedAccounts={selectedAccounts}
                            setSelectedAccounts={setSelectedAccounts}
                            taskStats={taskStats}
                        />
                    )}

                    {/* Media Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Upload className="w-4 h-4 inline mr-2" />
                            Upload Media (Image or Video)
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,video/*"
                            className="hidden"
                        />
                        {preview ? (
                            <div className="relative">
                                {isVideo ? (
                                    <video src={preview} controls className="w-full max-h-64 rounded-xl" />
                                ) : (
                                    <img src={preview} alt="Story preview" className="w-full max-h-64 rounded-xl object-contain bg-black" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => { setSelectedFile(null); setPreview(null); }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors"
                            >
                                <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                                <p className="text-gray-400">Click to upload story media</p>
                            </button>
                        )}
                    </div>

                    {/* Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Story Link (Optional)</label>
                        <input
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Caption/Sticker Text (Optional)</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={3}
                            placeholder="Write story text here..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                        />
                    </div>

                    <ExecutionModeSelector
                        mode={mode}
                        setMode={setMode}
                        scheduledAt={scheduledAt}
                        setScheduledAt={setScheduledAt}
                        minMinutes={minMinutes}
                        setMinMinutes={setMinMinutes}
                        maxMinutes={maxMinutes}
                        setMaxMinutes={setMaxMinutes}
                        onRandomize={handleRandomize}
                        isMultiAccount={isMultiAccount}
                    />

                    <button
                        type="submit"
                        disabled={loading || activeSelectedAccounts.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating {successCount}/{activeSelectedAccounts.length}...</>
                        ) : mode === 'now' ? (
                            <><Zap className="w-5 h-5 mr-2" /> Post Story Now ({activeSelectedAccounts.length} accounts)</>
                        ) : (
                            <><Play className="w-5 h-5 mr-2" /> Schedule Story ({activeSelectedAccounts.length} accounts)</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Scheduler = () => {
    const [activeMenu, setActiveMenu] = useState<SchedulerMenu>('main');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [taskStats, setTaskStats] = useState<Record<number, TaskStats>>({});

    // Fetch accounts and stats
    const fetchInitialData = async () => {
        try {
            const [accountsRes, statsRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/tasks/stats/by-account')
            ]);
            setAccounts(accountsRes.data);
            setTaskStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleBack = () => setActiveMenu('main');
    const handleSuccess = () => {
        fetchInitialData(); // Refresh stats
    };

    if (activeMenu === 'post') return <SchedulePostForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;
    if (activeMenu === 'like') return <ScheduleLikeForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;
    if (activeMenu === 'follow') return <ScheduleFollowForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;
    if (activeMenu === 'view') return <ScheduleViewForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;
    if (activeMenu === 'reels') return <ScheduleReelsForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;
    if (activeMenu === 'story') return <ScheduleStoryForm onBack={handleBack} accounts={accounts} onSuccess={handleSuccess} taskStats={taskStats} />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Scheduler</h1>
                <p className="text-gray-400 mt-1">
                    Pilih jenis scheduling yang ingin Anda gunakan
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menuOptions.map((option) => (
                    <MenuCard
                        key={option.id}
                        option={option}
                        onClick={() => setActiveMenu(option.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default Scheduler;

