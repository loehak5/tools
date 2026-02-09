import React, { useState, useEffect, useRef } from 'react';
import { Activity, Heart, UserPlus, Eye, Image, Upload, X, Calendar, Shuffle, Zap, Loader2, AlertCircle, CheckCircle, Info, CheckSquare, Square, Camera, RotateCcw, Video } from 'lucide-react';
import api from '../api/client';

type ActionType = 'like' | 'follow' | 'view' | 'post' | 'story' | 'reels';
type ExecutionMode = 'now' | 'schedule' | 'random';
type FilterType = 'all' | 'like' | 'follow' | 'view' | 'post' | 'story' | 'reels' | 'new';

interface Account {
    id: number;
    username: string;
    status: string;
    proxy: string | null;
    profile_picture?: string;
}

interface ActionStats {
    like: number;
    follow: number;
    view: number;
    post: number;
    story: number;
    reels: number;
    total: number;
}



// Helper: Generate unique random times for multiple accounts
const generateUniqueRandomSchedules = (count: number, minMinutes: number, maxMinutes: number): Date[] => {
    const schedules: Date[] = [];
    const rangeMs = (maxMinutes - minMinutes) * 60 * 1000;
    const minMs = minMinutes * 60 * 1000;
    const now = Date.now();

    console.log(`[DEBUG] Generating ${count} random schedules`);
    console.log(`[DEBUG] Now (timestamp):`, now);
    console.log(`[DEBUG] Now (local):`, new Date(now).toLocaleString());
    console.log(`[DEBUG] Range: ${minMinutes}-${maxMinutes} minutes`);

    if (count < 50) {
        // For less than 50 accounts, ensure unique times (at least 1 second apart)
        const usedTimes = new Set<number>();
        for (let i = 0; i < count; i++) {
            let randomMs: number;
            let attempts = 0;
            do {
                randomMs = Math.floor(Math.random() * rangeMs) + minMs;
                // Round to nearest second
                randomMs = Math.floor(randomMs / 1000) * 1000;
                attempts++;
            } while (usedTimes.has(randomMs) && attempts < 1000);
            usedTimes.add(randomMs);
            const scheduledDate = new Date(now + randomMs);
            schedules.push(scheduledDate);
            if (i < 3) {  // Log first 3 for debugging
                console.log(`[DEBUG] Schedule ${i}: Local=${scheduledDate.toLocaleString()}, UTC=${scheduledDate.toISOString()}`);
            }
        }
    } else {
        // For 50+ accounts, just generate random times (may have duplicates)
        for (let i = 0; i < count; i++) {
            const randomMs = Math.floor(Math.random() * rangeMs) + minMs;
            schedules.push(new Date(now + randomMs));
        }
    }

    // Sort by time for predictable execution order
    return schedules.sort((a, b) => a.getTime() - b.getTime());
};



const Automation = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [actionStats, setActionStats] = useState<Record<number, ActionStats>>({});
    const [loading, setLoading] = useState(true);
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [expiredTasks, setExpiredTasks] = useState<any[]>([]);
    const [selectedExpiredTaskIds, setSelectedExpiredTaskIds] = useState<number[]>([]);
    const [expiredLoading, setExpiredLoading] = useState(false);

    // Scroll handling for header
    const [showTableHead, setShowTableHead] = useState(true);
    const lastScrollY = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Action configuration
    const [actionType, setActionType] = useState<ActionType>('like');
    const [targetUrl, setTargetUrl] = useState('');
    const [targetUsername, setTargetUsername] = useState('');
    const [caption, setCaption] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Execution mode
    const [executionMode, setExecutionMode] = useState<ExecutionMode>('random');
    const [scheduledAt, setScheduledAt] = useState('');
    const [minMinutes, setMinMinutes] = useState(1);
    const [maxMinutes, setMaxMinutes] = useState(30);
    const [shareToThreads, setShareToThreads] = useState(false);

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successCount, setSuccessCount] = useState(0);
    const [totalToSubmit, setTotalToSubmit] = useState(0);

    // Search/filter/sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');

    // Auto select state
    const [autoSelectCount, setAutoSelectCount] = useState<number>(0);
    const [selectionPriority, setSelectionPriority] = useState<string>('lower_follow');

    const performAutoSelect = (count: number, priority: string) => {
        if (count <= 0) {
            setSelectedAccounts([]);
            return;
        }

        const sorted = [...filteredAccounts].sort((a, b) => {
            const statsA = actionStats[a.id] || { like: 0, follow: 0, view: 0, post: 0, story: 0, reels: 0, total: 0 };
            const statsB = actionStats[b.id] || { like: 0, follow: 0, view: 0, post: 0, story: 0, reels: 0, total: 0 };

            if (priority === 'lower_follow') return statsA.follow - statsB.follow;
            if (priority === 'higher_follow') return statsB.follow - statsA.follow;
            if (priority === 'lower_like') return statsA.like - statsB.like;
            if (priority === 'higher_like') return statsB.like - statsA.like;
            if (priority === 'no_activity') return statsA.total - statsB.total;
            return 0;
        });

        const selected = sorted.slice(0, count).map(acc => acc.id);
        setSelectedAccounts(selected);
    };

    useEffect(() => {
        if (actionType === 'like' || actionType === 'follow') {
            performAutoSelect(autoSelectCount, selectionPriority);
        } else if (autoSelectCount > 0) {
            setAutoSelectCount(0);
        }
    }, [autoSelectCount, selectionPriority, actionType, accounts, actionStats, searchQuery, filterType]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current) return;
            const currentScrollY = scrollRef.current.scrollTop;

            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                // Scrolling down & passed threshold -> Hide
                setShowTableHead(false);
            } else {
                // Scrolling up -> Show
                setShowTableHead(true);
            }
            lastScrollY.current = currentScrollY;
        };

        const div = scrollRef.current;
        if (div) {
            div.addEventListener('scroll', handleScroll, { passive: true });
        }
        return () => div?.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [accountsRes, statsRes] = await Promise.all([
                api.get('/accounts/'),
                api.get('/tasks/stats/actions-by-account')
            ]);
            setAccounts(accountsRes.data);
            setActionStats(statsRes.data);
            await fetchExpiredTasks();
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiredTasks = async () => {
        setExpiredLoading(true);
        try {
            const res = await api.get('/tasks/expired-sessions');
            setExpiredTasks(res.data);
        } catch (err) {
            console.error('Failed to fetch expired tasks:', err);
        } finally {
            setExpiredLoading(false);
        }
    };

    // Filter active accounts
    const activeAccounts = accounts.filter(acc => acc.status === 'active');
    const filteredAccounts = activeAccounts.filter(acc => {
        const matchesSearch = acc.username.toLowerCase().includes(searchQuery.toLowerCase());
        const stats = actionStats[acc.id] || { like: 0, follow: 0, view: 0, post: 0, story: 0, reels: 0, total: 0 };

        let matchesFilter = true;
        if (filterType === 'like') matchesFilter = stats.like > 0;
        else if (filterType === 'follow') matchesFilter = stats.follow > 0;
        else if (filterType === 'view') matchesFilter = stats.view > 0;
        else if (filterType === 'post') matchesFilter = stats.post > 0;
        else if (filterType === 'story') matchesFilter = stats.story > 0;
        else if (filterType === 'reels') matchesFilter = stats.reels > 0;
        else if (filterType === 'new') matchesFilter = stats.total === 0;

        return matchesSearch && matchesFilter;
    });

    // Selection handlers
    const toggleAccount = (id: number) => {
        setSelectedAccounts(prev =>
            prev.includes(id)
                ? prev.filter(accId => accId !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedAccounts.length === filteredAccounts.length) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(filteredAccounts.map(acc => acc.id));
        }
    };

    // File handling for Post action
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Submit automation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (selectedAccounts.length === 0) {
            setError('Pilih minimal satu akun');
            return;
        }

        if (actionType === 'like' && !targetUrl) {
            setError('Masukkan URL post untuk Like');
            return;
        }

        if (actionType === 'follow' && !targetUsername) {
            setError('Masukkan username target untuk Follow');
            return;
        }

        if (actionType === 'view' && !targetUrl) {
            setError('Masukkan URL story/reel untuk View');
            return;
        }

        if (actionType === 'post' && !selectedFile) {
            setError('Upload gambar untuk Post');
            return;
        }

        if (actionType === 'story' && !selectedFile) {
            setError('Upload media (gambar/video) untuk Story');
            return;
        }

        if (actionType === 'reels' && !selectedFile) {
            setError('Upload video untuk Reels');
            return;
        }

        if (executionMode === 'schedule' && !scheduledAt) {
            setError('Pilih waktu schedule');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccessCount(0);

        let totalTasksCount = selectedAccounts.length;
        if (actionType === 'follow') {
            const targets = targetUsername.split(/[\n,]+/).map(t => t.trim()).filter(t => t);
            totalTasksCount = selectedAccounts.length * targets.length;
        }
        setTotalToSubmit(totalTasksCount);

        try {
            const randomSchedules = executionMode === 'random'
                ? generateUniqueRandomSchedules(totalTasksCount, minMinutes, maxMinutes)
                : [];

            // 1. Create TaskBatch
            let batchId: number | null = null;
            try {
                const batchRes = await api.post('/reporting/batches', {
                    task_type: actionType,
                    total_count: totalTasksCount,
                    params: {
                        target_url: targetUrl,
                        target_username: targetUsername,
                        execution_mode: executionMode
                    }
                });
                batchId = batchRes.data.id;
            } catch (err) {
                console.error("Failed to create task batch", err);
            }

            let succeeded = 0;
            let taskIndex = 0;

            // 2. Prepare Task Queue (Flattening Account x Target)
            const taskQueue: any[] = [];
            const targets = actionType === 'follow'
                ? targetUsername.split(/[\n,]+/).map(t => t.trim().replace('@', '')).filter(t => t)
                : [null]; // For other types, we just have one "operation" per account

            for (const accountId of selectedAccounts) {
                for (const target of targets) {
                    taskQueue.push({ accountId, target });
                }
            }

            // 3. Shuffle Task Queue to distribute load evenly
            for (let i = taskQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [taskQueue[i], taskQueue[j]] = [taskQueue[j], taskQueue[i]];
            }

            // 4. Submit tasks from the shuffled queue
            for (const item of taskQueue) {
                const { accountId, target } = item;

                let finalScheduledAt: string;
                if (executionMode === 'now') {
                    finalScheduledAt = new Date().toISOString();
                } else if (executionMode === 'random') {
                    finalScheduledAt = randomSchedules[taskIndex].toISOString();
                } else {
                    finalScheduledAt = new Date(scheduledAt).toISOString();
                }

                try {
                    if (actionType === 'follow') {
                        await api.post('/tasks/follow', {
                            account_id: accountId,
                            scheduled_at: finalScheduledAt,
                            target_username: target,
                            execute_now: executionMode === 'now',
                            batch_id: batchId
                        });
                    } else if (actionType === 'like') {
                        await api.post('/tasks/like', {
                            account_id: accountId,
                            scheduled_at: finalScheduledAt,
                            media_url: targetUrl,
                            execute_now: executionMode === 'now',
                            batch_id: batchId
                        });
                    } else if (actionType === 'view') {
                        await api.post('/tasks/view', {
                            account_id: accountId,
                            scheduled_at: finalScheduledAt,
                            story_url: targetUrl,
                            execute_now: executionMode === 'now',
                            batch_id: batchId
                        });
                    } else if (actionType === 'post') {
                        const formData = new FormData();
                        formData.append('account_id', accountId.toString());
                        formData.append('scheduled_at', finalScheduledAt);
                        formData.append('caption', caption);
                        formData.append('image', selectedFile!);
                        formData.append('share_to_threads', shareToThreads ? 'true' : 'false');
                        formData.append('execute_now', executionMode === 'now' ? 'true' : 'false');
                        if (batchId) formData.append('batch_id', batchId.toString());

                        await api.post('/tasks/post', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } else if (actionType === 'story') {
                        const formData = new FormData();
                        formData.append('account_id', accountId.toString());
                        formData.append('scheduled_at', finalScheduledAt);
                        if (caption) formData.append('caption', caption);
                        if (targetUrl) formData.append('link', targetUrl);
                        formData.append('media', selectedFile!);
                        formData.append('execute_now', executionMode === 'now' ? 'true' : 'false');
                        if (batchId) formData.append('batch_id', batchId.toString());

                        await api.post('/tasks/story', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } else if (actionType === 'reels') {
                        const formData = new FormData();
                        formData.append('account_id', accountId.toString());
                        formData.append('scheduled_at', finalScheduledAt);
                        formData.append('caption', caption);
                        formData.append('video', selectedFile!);
                        formData.append('share_to_threads', shareToThreads ? 'true' : 'false');
                        formData.append('execute_now', executionMode === 'now' ? 'true' : 'false');
                        if (batchId) formData.append('batch_id', batchId.toString());

                        await api.post('/tasks/reels', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    }
                    succeeded++;
                    setSuccessCount(succeeded);
                } catch (err) {
                    console.error(`Failed to create task for account ${accountId}:`, err);
                }
                taskIndex++;
            }

            if (succeeded === totalTasksCount) {
                // Reset form
                setSelectedAccounts([]);
                setTargetUrl('');
                setTargetUsername('');
                setCaption('');
                setSelectedFile(null);
                setPreview(null);
                setError('');
                fetchInitialData(); // Refresh stats
            } else {
                setError(`${succeeded}/${selectedAccounts.length} tasks berhasil dibuat`);
                fetchInitialData(); // Refresh stats even if some failed
            }
        } catch (err) {
            setError('Gagal membuat automation tasks');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkRetryExpired = async () => {
        if (selectedExpiredTaskIds.length === 0) return;
        setSubmitting(true);
        try {
            await api.post('/tasks/bulk-retry', { ids: selectedExpiredTaskIds });
            setSelectedExpiredTaskIds([]);
            await fetchExpiredTasks();
            fetchInitialData();
            setSuccessCount(selectedExpiredTaskIds.length);
            setTotalToSubmit(selectedExpiredTaskIds.length);
        } catch (err) {
            setError('Gagal mengulangi tasks');
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Activity className="w-7 h-7 text-indigo-400" />
                    Automation
                </h1>
                <p className="text-gray-400 mt-1">
                    Jalankan aksi bulk untuk semua akun sekaligus. Fingerprint dan proxy mengikuti pengaturan masing-masing akun.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Account Selection */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                            Pilih Akun
                        </h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as FilterType)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="all">Semua Akun</option>
                                <option value="like">Sudah Like</option>
                                <option value="follow">Sudah Follow</option>
                                <option value="view">Sudah View</option>
                                <option value="post">Sudah Post</option>
                                <option value="story">Sudah Story</option>
                                <option value="reels">Sudah Reels</option>
                                <option value="new">Belum Ada Aksi</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Cari..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-32"
                            />
                            <span className="text-xs text-gray-400 min-w-fit">
                                {selectedAccounts.length} / {filteredAccounts.length} dipilih
                            </span>
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className="overflow-x-auto max-h-[500px] overflow-y-auto relative scroll-smooth"
                    >
                        <table className="w-full text-left text-sm relative">
                            <thead className={`bg-gray-900 text-gray-400 sticky top-0 z-10 transition-transform duration-300 ease-in-out ${showTableHead ? 'translate-y-0' : '-translate-y-full'}`}>
                                <tr>
                                    <th className="px-4 py-3 font-medium w-12">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            {selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0 ? (
                                                <CheckSquare className="w-5 h-5 text-indigo-400" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 font-medium">Username</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Proxy</th>
                                    <th className="px-4 py-3 font-medium text-center"><Heart className="w-3 h-3 inline mr-1 text-red-400" /> Like</th>
                                    <th className="px-4 py-3 font-medium text-center"><UserPlus className="w-3 h-3 inline mr-1 text-blue-400" /> Follow</th>
                                    <th className="px-4 py-3 font-medium text-center"><Eye className="w-3 h-3 inline mr-1 text-purple-400" /> View</th>
                                    <th className="px-4 py-3 font-medium text-center"><Image className="w-3 h-3 inline mr-1 text-pink-400" /> Post</th>
                                    <th className="px-4 py-3 font-medium text-center"><Camera className="w-3 h-3 inline mr-1 text-orange-400" /> Story</th>
                                    <th className="px-4 py-3 font-medium text-center"><Video className="w-3 h-3 inline mr-1 text-indigo-400" /> Reels</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading akun...
                                        </td>
                                    </tr>
                                ) : filteredAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                            {accounts.length === 0
                                                ? 'Belum ada akun. Tambah akun di menu Accounts.'
                                                : activeAccounts.length === 0
                                                    ? 'Tidak ada akun aktif. Login ulang akun di menu Accounts.'
                                                    : 'Tidak ada akun yang cocok dengan pencarian.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAccounts.map(account => (
                                        <tr
                                            key={account.id}
                                            className={`hover:bg-gray-800/30 transition-colors cursor-pointer ${selectedAccounts.includes(account.id) ? 'bg-indigo-500/5' : ''
                                                }`}
                                            onClick={() => toggleAccount(account.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleAccount(account.id); }}
                                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                >
                                                    {selectedAccounts.includes(account.id) ? (
                                                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white">
                                                @{account.username}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    {account.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {account.proxy ? (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-fit">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Connected
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">Direct</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 text-red-400 font-bold text-xs">
                                                    {actionStats[account.id]?.like || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs">
                                                    {actionStats[account.id]?.follow || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">
                                                    {actionStats[account.id]?.view || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 font-bold text-xs">
                                                    {actionStats[account.id]?.post || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 font-bold text-xs">
                                                    {actionStats[account.id]?.story || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                                                    {actionStats[account.id]?.reels || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredAccounts.length > 0 && (
                        <div className="p-3 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center">
                            <button
                                onClick={toggleSelectAll}
                                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {selectedAccounts.length === filteredAccounts.length
                                    ? 'Batalkan Semua'
                                    : `Pilih Semua (${filteredAccounts.length})`}
                            </button>
                            <span className="text-sm text-gray-400">
                                Total akun aktif: {activeAccounts.length}
                            </span>
                        </div>
                    )}

                    {/* Failed Tasks Section */}
                    <div className="mt-8 border-t border-gray-800 pt-8 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                Retryable Failed Tasks
                            </h2>
                            {selectedExpiredTaskIds.length > 0 && (
                                <button
                                    onClick={handleBulkRetryExpired}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                    Retry {selectedExpiredTaskIds.length} Failed Tasks
                                </button>
                            )}
                        </div>

                        <div className="bg-gray-800/20 border border-gray-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-800/50 text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 w-12">
                                            <button
                                                onClick={() => {
                                                    if (selectedExpiredTaskIds.length === expiredTasks.length) setSelectedExpiredTaskIds([]);
                                                    else setSelectedExpiredTaskIds(expiredTasks.map(t => t.id));
                                                }}
                                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                            >
                                                {selectedExpiredTaskIds.length === expiredTasks.length && expiredTasks.length > 0 ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-400" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3">Account</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Error Message</th>
                                        <th className="px-4 py-3 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {expiredLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                                Loading failed tasks...
                                            </td>
                                        </tr>
                                    ) : expiredTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                Tidak ada task gagal yang bisa diulang otomatis.
                                            </td>
                                        </tr>
                                    ) : (
                                        expiredTasks.map(task => (
                                            <tr
                                                key={task.id}
                                                className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${selectedExpiredTaskIds.includes(task.id) ? 'bg-indigo-500/5' : ''}`}
                                                onClick={() => {
                                                    if (selectedExpiredTaskIds.includes(task.id)) setSelectedExpiredTaskIds(prev => prev.filter(id => id !== task.id));
                                                    else setSelectedExpiredTaskIds(prev => [...prev, task.id]);
                                                }}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <div className="p-1">
                                                        {selectedExpiredTaskIds.includes(task.id) ? (
                                                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-gray-600" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-white">
                                                    @{task.account_username || 'unknown'}
                                                </td>
                                                <td className="px-4 py-3 capitalize text-gray-400">{task.task_type}</td>
                                                <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate" title={task.error_message}>
                                                    {task.error_message}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-500 text-[11px]">
                                                    {new Date(task.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Action Configuration */}
                <div className="space-y-4">
                    {/* Action Type Selection */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Pilih Aksi</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setActionType('like')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'like'
                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Heart className="w-4 h-4" />
                                Like
                            </button>
                            <button
                                onClick={() => setActionType('follow')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'follow'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <UserPlus className="w-4 h-4" />
                                Follow
                            </button>
                            <button
                                onClick={() => setActionType('view')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'view'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Eye className="w-4 h-4" />
                                View
                            </button>
                            <button
                                onClick={() => setActionType('post')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'post'
                                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Image className="w-4 h-4" />
                                Post
                            </button>
                            <button
                                onClick={() => setActionType('story')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'story'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Camera className="w-4 h-4" />
                                Story
                            </button>
                            <button
                                onClick={() => setActionType('reels')}
                                className={`py-3 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${actionType === 'reels'
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Video className="w-4 h-4" />
                                Reels
                            </button>
                        </div>
                    </div>

                    {/* Auto Select Accounts - Only for Like and Follow */}
                    {(actionType === 'like' || actionType === 'follow') && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                Auto Select Akun
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Jumlah Akun</label>
                                    <input
                                        type="number"
                                        value={autoSelectCount || ''}
                                        onChange={(e) => setAutoSelectCount(Math.max(0, parseInt(e.target.value) || 0))}
                                        placeholder="Contoh: 10"
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Prioritas Pemilihan</label>
                                    <select
                                        value={selectionPriority}
                                        onChange={(e) => setSelectionPriority(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-sm"
                                    >
                                        <option value="lower_follow">1. Select by lower follow activity</option>
                                        <option value="higher_follow">2. Select by higher follow activity</option>
                                        <option value="lower_like">3. Select by lower like activity</option>
                                        <option value="higher_like">4. Select by higher like activity</option>
                                        <option value="no_activity">5. Select by no activity</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-500">
                                    Sistem akan otomatis memilih akun berdasarkan kriteria di atas dari daftar akun yang tersedia (terfilter).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Target Input */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">
                            {actionType === 'like' && 'URL Post'}
                            {actionType === 'follow' && 'Target Username'}
                            {actionType === 'view' && 'URL Story/Reel'}
                            {actionType === 'story' && 'Upload Story'}
                            {actionType === 'post' && 'Upload Gambar'}
                            {actionType === 'reels' && 'Upload Reels'}
                        </h3>

                        {(actionType === 'like' || actionType === 'view' || actionType === 'story') && (
                            <div className="mb-3">
                                {actionType === 'story' && <p className="text-xs text-gray-500 mb-2">Link (Optional)</p>}
                                <input
                                    type="url"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder={actionType === 'like'
                                        ? 'https://instagram.com/p/...'
                                        : actionType === 'view'
                                            ? 'https://instagram.com/stories/...'
                                            : 'https://example.com/link (Optional)'}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        )}

                        {actionType === 'follow' && (
                            <div className="space-y-2">
                                <textarea
                                    value={targetUsername}
                                    onChange={(e) => setTargetUsername(e.target.value)}
                                    placeholder="@username1, @username2, ..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                                />
                                <p className="text-[10px] text-gray-500">
                                    Pisahkan dengan koma atau baris baru untuk banyak target.
                                </p>
                            </div>
                        )}

                        {(actionType === 'post' || actionType === 'story' || actionType === 'reels') && (
                            <div className="space-y-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept={actionType === 'story' ? "image/*,video/*" : actionType === 'reels' ? "video/*" : "image/*"}
                                    className="hidden"
                                />
                                {preview ? (
                                    <div className="relative">
                                        {selectedFile?.type.startsWith('video') ? (
                                            <video src={preview} controls className="w-full max-h-40 object-cover rounded-xl" />
                                        ) : (
                                            <img src={preview} alt="Preview" className="w-full max-h-40 object-cover rounded-xl" />
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
                                        className="w-full p-6 border-2 border-dashed border-gray-700 rounded-xl hover:border-pink-500 transition-colors"
                                    >
                                        <Upload className="w-6 h-6 mx-auto text-gray-500 mb-2" />
                                        <p className="text-gray-400 text-sm">Klik untuk upload</p>
                                    </button>
                                )}
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    rows={3}
                                    placeholder="Tulis caption di sini..."
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                                />
                            </div>
                        )}

                        {/* Share to Threads Toggle - Only for Post and Reels */}
                        {(actionType === 'post' || actionType === 'reels') && (
                            <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-400" />
                                    <div>
                                        <p className="text-xs font-medium text-white">Share to Threads</p>
                                        <p className="text-[10px] text-gray-500">Cross-post ke Threads</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShareToThreads(!shareToThreads)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${shareToThreads ? 'bg-indigo-500' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${shareToThreads ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Execution Mode */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">Mode Eksekusi</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setExecutionMode('now')}
                                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1 ${executionMode === 'now'
                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <Zap className="w-3 h-3" />
                                    Now
                                </button>
                                <button
                                    onClick={() => setExecutionMode('schedule')}
                                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1 ${executionMode === 'schedule'
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <Calendar className="w-3 h-3" />
                                    Schedule
                                </button>
                                <button
                                    onClick={() => setExecutionMode('random')}
                                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1 ${executionMode === 'random'
                                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <Shuffle className="w-3 h-3" />
                                    Random
                                </button>
                            </div>

                            {executionMode === 'schedule' && (
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            )}

                            {executionMode === 'random' && (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">Random delay (menit)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                                            <input
                                                type="number"
                                                value={minMinutes}
                                                onChange={(e) => setMinMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                                            <input
                                                type="number"
                                                value={maxMinutes}
                                                onChange={(e) => setMaxMinutes(Math.max(minMinutes, parseInt(e.target.value) || 0))}
                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                                                min={minMinutes}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-purple-400">
                                        ⏱️ Setiap akun akan mendapat waktu unik
                                    </p>
                                </div>
                            )}

                            {executionMode === 'now' && (
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Semua akun akan dieksekusi segera
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Success Display */}
                    {submitting && successCount > 0 && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            {successCount}/{totalToSubmit} tasks dibuat...
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || selectedAccounts.length === 0}
                        className={`w-full py-4 font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${submitting || selectedAccounts.length === 0
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : `bg-gradient-to-r ${actionType === 'like' ? 'from-red-500 to-orange-500' :
                                actionType === 'follow' ? 'from-blue-500 to-cyan-500' :
                                    actionType === 'view' ? 'from-purple-500 to-violet-500' :
                                        actionType === 'story' ? 'from-orange-500 to-amber-500' :
                                            'from-pink-500 to-rose-500'
                            } text-white hover:opacity-90`
                            }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Membuat tasks... ({successCount}/{totalToSubmit})
                            </>
                        ) : (
                            <>
                                <Activity className="w-5 h-5" />
                                Jalankan {actionType.charAt(0).toUpperCase() + actionType.slice(1)} ({selectedAccounts.length} akun)
                            </>
                        )}
                    </button>

                    {/* Info Panel */}
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                        <h4 className="text-sm font-medium text-indigo-400 flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4" />
                            Info Automation
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• Fingerprint mengikuti pengaturan saat login awal</li>
                            <li>• Proxy mengikuti konfigurasi di Proxy Settings</li>
                            <li>• Mode Random memberikan waktu unik per akun</li>
                            <li>• Lihat progress di menu Scheduler</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Automation;
