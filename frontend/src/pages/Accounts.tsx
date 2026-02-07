import React, { useEffect, useState } from 'react';
import { Plus, ShieldCheck, ShieldAlert, Smartphone, Trash2, LogOut, Heart, UserPlus, Eye, Image, Upload, Filter, Calendar, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import AddAccountModal from '../components/AddAccountModal';
import BulkAddAccountModal from '../components/BulkAddAccountModal';
import BulkImportStatus from '../components/BulkImportStatus';
import BulkDisconnectModal from '../components/BulkDisconnectModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

const Accounts = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    // Change to Sets to handle multiple loading states
    const [checkingIds, setCheckingIds] = useState<Set<number>>(new Set());
    const [reloginIds, setReloginIds] = useState<Set<number>>(new Set());
    const [isPolling, setIsPolling] = useState(false);

    // Dialog states
    const [deleteDialogState, setDeleteDialogState] = useState<{ isOpen: boolean; accountId: number | null; username: string }>({ isOpen: false, accountId: null, username: '' });
    const [bulkReloginDialogState, setBulkReloginDialogState] = useState<{ isOpen: boolean; count: number }>({ isOpen: false, count: 0 });

    // Explicit bulk loading states for header buttons
    const [isBulkChecking, setIsBulkChecking] = useState(false);
    const [isBulkRelogging, setIsBulkRelogging] = useState(false);
    const [isBulkDisconnectOpen, setIsBulkDisconnectOpen] = useState(false);
    const [isBulkDisconnecting, setIsBulkDisconnecting] = useState(false);
    const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // Action stats per account: { accountId: { like: X, follow: Y, view: Z, post: W, total: N } }
    const [actionStats, setActionStats] = useState<Record<number, { like: number; follow: number; view: number; post: number; total: number }>>({});

    // Filter States
    const [loginAfter, setLoginAfter] = useState('');
    const [loginBefore, setLoginBefore] = useState('');
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]); // ['like', 'follow', etc.]
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    useEffect(() => {
        fetchAccounts();
        fetchActionStats();
        fetchActiveJobs();
    }, [loginAfter, loginBefore, selectedActivities, selectedStatuses]);

    const fetchActiveJobs = async () => {
        try {
            const res = await api.get('/accounts/bulk/active');
            // If there's an active (logging_in or creating) job, set it as activeJobId
            // Take the most recent one
            const activeJobs = res.data.filter((j: any) => j.status === 'logging_in' || j.status === 'creating');
            if (activeJobs.length > 0) {
                // Sorting by job_id isn't ideal but we don't have timestamp here.
                // Assuming the last one in the list is the most recent or relevant.
                setActiveJobId(activeJobs[activeJobs.length - 1].job_id);
            }
        } catch (err) {
            console.error('Failed to fetch active bulk jobs', err);
        }
    };

    // Poll for updates when isPolling is true
    // Check for authenticating accounts to auto-start polling
    useEffect(() => {
        const hasAuthenticating = accounts.some(a => a.status === 'authenticating');
        if (hasAuthenticating && !isPolling) {
            setIsPolling(true);
        }
    }, [accounts, isPolling]);

    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(() => {
            fetchAccounts(false); // Silent fetch
        }, 2000);

        // Stop polling after 30 seconds automatically to save resources
        const timeout = setTimeout(() => {
            setIsPolling(false);
        }, 30000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [isPolling]);

    const fetchAccounts = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const params: any = {};
            if (loginAfter) params.login_after = new Date(loginAfter).toISOString();
            if (loginBefore) {
                const date = new Date(loginBefore);
                date.setHours(23, 59, 59, 999);
                params.login_before = date.toISOString();
            }
            // params serializer for array

            let queryStr = '/accounts/?';
            if (loginAfter) queryStr += `login_after=${new Date(loginAfter).toISOString()}&`;
            if (loginBefore) {
                const date = new Date(loginBefore);
                date.setHours(23, 59, 59, 999);
                queryStr += `login_before=${date.toISOString()}&`;
            }
            selectedActivities.forEach(act => queryStr += `has_executed=${act}&`);
            selectedStatuses.forEach(status => queryStr += `status=${status}&`);

            const res = await api.get(queryStr);
            const newAccounts = res.data;
            setAccounts(newAccounts);

            // Update reloginIds: remove ID if status is no longer 'offline', 'failed', 'expired' (meaning it changed to active or something else)
            // Or more robustly: remove if status changed from what triggered the login.
            setReloginIds(prev => {
                const next = new Set(prev);
                newAccounts.forEach((acc: any) => {
                    // Only remove from loading set if status is definitively success or a NEW failure (not the old one)
                    // Simple heuristic: If active, done. If failed, also done (user needs to see it failed).
                    if (prev.has(acc.id)) {
                        if (acc.status === 'active') {
                            next.delete(acc.id);
                        } else if (acc.status === 'failed') {
                            // If it failed, show failed.
                            next.delete(acc.id);
                        } else if (acc.status === 'challenge') {
                            next.delete(acc.id);
                        }
                    }
                });
                return next;
            });

            // If we are polling and no more reloginIds, maybe stop polling?
            // keeping the 30s timeout is safe.
        } catch (err) {
            console.error(err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchActionStats = async () => {
        try {
            const res = await api.get('/tasks/stats/actions-by-account');
            setActionStats(res.data);
        } catch (err) {
            console.error('Failed to fetch action stats', err);
        }
    };

    const handleLogoutClick = (accountId: number, username: string) => {
        setDeleteDialogState({ isOpen: true, accountId, username });
    };

    const confirmLogout = async () => {
        const { accountId } = deleteDialogState;
        if (!accountId) return;

        setDeletingId(accountId);
        try {
            await api.delete(`/accounts/${accountId}`);
            fetchAccounts();
            setDeleteDialogState({ isOpen: false, accountId: null, username: '' });
        } catch (err: any) {
            console.error("Delete failed", err);
            alert(`Failed to delete account: ${err.message || 'Unknown error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleChecker = async (accountId: number) => {
        try {
            await api.post(`/accounts/${accountId}/toggle-checker`);
            // Refresh accounts to reflect the change
            fetchAccounts(false);
        } catch (err: any) {
            console.error("Toggle checker failed", err);
            alert(`Failed to set checker account: ${err.message || 'Unknown error'}`);
        }
    };

    const handleCheckSession = async (accountId: number) => {
        setCheckingIds(prev => new Set(prev).add(accountId));
        try {
            const res = await api.post(`/accounts/${accountId}/check`);
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, status: res.data.valid ? 'active' : 'expired' } : acc
            ));
        } catch (err: any) {
            console.error("Check session failed", err);
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, status: 'failed' } : acc
            ));
        } finally {
            setCheckingIds(prev => {
                const next = new Set(prev);
                next.delete(accountId);
                return next;
            });
        }
    };

    const handleRelogin = async (accountId: number) => {
        setReloginIds(prev => new Set(prev).add(accountId));
        setIsPolling(true); // Start polling
        try {
            await api.post(`/accounts/${accountId}/login`);
        } catch (err: any) {
            console.error("Relogin failed", err);
            alert("Failed to start re-login process");
            setReloginIds(prev => {
                const next = new Set(prev);
                next.delete(accountId);
                return next;
            });
        }
        // Identifier remains in reloginIds until status changes (handled by fetchAccounts logic/effect)
    };

    const handleRotateFingerprint = async (accountId: number) => {
        if (!confirm("Are you sure you want to rotate the device fingerprint? This will clear current session and cookies.")) return;

        try {
            await api.post(`/accounts/${accountId}/rotate-fingerprint`);
            alert("Fingerprint rotated. Please re-login to start a fresh session.");
            fetchAccounts();
        } catch (err: any) {
            console.error("Rotate fingerprint failed", err);
            alert(`Failed to rotate fingerprint: ${err.message || 'Unknown error'}`);
        }
    };

    const handleBulkCheck = async () => {
        const ids = accounts.map(a => a.id);
        if (ids.length === 0) return;

        setIsBulkChecking(true);
        // Mark all as checking for row feedback
        setCheckingIds(new Set(ids));

        try {
            const batchSize = 3;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await Promise.all(batch.map(async (id) => {
                    try {
                        const res = await api.post(`/accounts/${id}/check`);
                        setAccounts(prev => prev.map(acc =>
                            acc.id === id ? { ...acc, status: res.data.valid ? 'active' : 'expired' } : acc
                        ));
                    } catch (err) {
                        console.error(`Check failed for ${id}`, err);
                        setAccounts(prev => prev.map(acc =>
                            acc.id === id ? { ...acc, status: 'failed' } : acc
                        ));
                    } finally {
                        setCheckingIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    }
                }));
            }
        } finally {
            setIsBulkChecking(false);
        }
    };

    const handleBulkRelogin = async () => {
        const expiredOrFailed = accounts.filter(a =>
            ['expired', 'failed', 'challenge', 'offline'].includes(a.status)
        );

        if (expiredOrFailed.length === 0) {
            alert("No expired, failed, or offline accounts found.");
            return;
        }

        setBulkReloginDialogState({ isOpen: true, count: expiredOrFailed.length });
    };

    const confirmBulkRelogin = async () => {
        const expiredOrFailed = accounts.filter(a =>
            ['expired', 'failed', 'challenge', 'offline'].includes(a.status)
        );

        setBulkReloginDialogState({ isOpen: false, count: 0 });

        if (expiredOrFailed.length === 0) return;

        const ids = expiredOrFailed.map(a => Number(a.id));

        setIsBulkRelogging(true);
        setReloginIds(new Set(ids));
        setIsPolling(true);

        try {
            const batchSize = 3;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await Promise.all(batch.map(async (id) => {
                    try {
                        await api.post(`/accounts/${id}/login`);
                    } catch (err) {
                        console.error(`Relogin failed for ${id}`, err);
                        setReloginIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    }
                }));
            }
        } catch (e) {
            console.error("Bulk relogin error:", e);
        } finally {
            setIsBulkRelogging(false);
        }
    };

    const handleBulkDisconnect = async (selectedTypes: string[], selectedStatuses: string[]) => {
        setIsBulkDisconnecting(true);
        try {
            await api.post('/accounts/bulk-disconnect', {
                activity_types: selectedTypes,
                statuses: selectedStatuses
            });
            setIsBulkDisconnectOpen(false);
            fetchAccounts();
            fetchActionStats(); // Refresh stats too
        } catch (err: any) {
            console.error("Bulk disconnect failed", err);
            alert(`Failed to disconnect accounts: ${err.message || 'Unknown error'}`);
        } finally {
            setIsBulkDisconnecting(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            active: 'bg-green-500/10 text-green-400 border-green-500/20',
            offline: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
            banned: 'bg-red-500/10 text-red-400 border-red-500/20',
            inactive: 'bg-red-500/10 text-red-400 border-red-500/20',
            challenge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            failed: 'bg-red-500/10 text-red-400 border-red-500/20',
            authenticating: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        };
        const style = styles[status as keyof typeof styles] || styles.offline;

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style} flex items-center w-fit space-x-1`}>
                {status === 'active' && <ShieldCheck className="w-3 h-3" />}
                {status === 'expired' && <ShieldAlert className="w-3 h-3" />}
                {(status === 'banned' || status === 'failed' || status === 'inactive') && <ShieldAlert className="w-3 h-3" />}
                {status === 'authenticating' && <span className="w-3 h-3 block border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>}
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </span>
        );
    };

    const statusSummary = React.useMemo(() => {
        return accounts.reduce((acc, curr) => {
            const status = curr.status || 'offline';
            if (status === 'inactive') {
                acc.banned = (acc.banned || 0) + 1;
            } else {
                acc[status] = (acc[status] || 0) + 1;
            }
            acc.total += 1;
            return acc;
        }, { active: 0, failed: 0, challenge: 0, offline: 0, banned: 0, authenticating: 0, expired: 0, total: 0 });
    }, [accounts]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Account Manager</h1>
                    <p className="text-gray-400 mt-1">Manage credentials, proxies, and fingerprints.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleBulkCheck}
                        disabled={isBulkChecking || checkingIds.size > 0}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-xl flex items-center space-x-2 font-medium transition-colors disabled:opacity-50"
                    >
                        {isBulkChecking ? (
                            <span className="w-4 h-4 block border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>{isBulkChecking ? 'Check All' : 'Check All'}</span>
                    </button>
                    <button
                        onClick={handleBulkRelogin}
                        disabled={isBulkRelogging || reloginIds.size > 0}
                        className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-4 py-2 rounded-xl flex items-center space-x-2 font-medium transition-colors disabled:opacity-50"
                    >
                        {isBulkRelogging ? (
                            <span className="w-4 h-4 block border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <LogOut className="w-4 h-4 rotate-180" />
                        )}
                        <span>{isBulkRelogging ? 'Relogging...' : 'Relogin Expired'}</span>
                    </button>
                    <button
                        onClick={() => setIsBulkDisconnectOpen(true)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Disconnect</span>
                    </button>
                    <button
                        onClick={() => setIsBulkAddOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Bulk Add</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Account</span>
                    </button>
                </div>
            </div>

            {activeJobId && (
                <BulkImportStatus
                    jobId={activeJobId}
                    onComplete={() => {
                        fetchAccounts(false);
                        // We might want to clear it eventually, but letting the user see "completed" is good.
                    }}
                />
            )}

            {/* Status Summary Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Accounts', count: statusSummary.total, color: 'text-white', bg: 'bg-gray-800/50', icon: Smartphone },
                    { label: 'Active', count: statusSummary.active, color: 'text-green-400', bg: 'bg-green-500/10', icon: ShieldCheck },
                    { label: 'Failed', count: statusSummary.failed + statusSummary.expired, color: 'text-red-400', bg: 'bg-red-500/10', icon: ShieldAlert },
                    { label: 'Challenge', count: statusSummary.challenge, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: ShieldAlert },
                    { label: 'Offline', count: statusSummary.offline, color: 'text-gray-400', bg: 'bg-gray-500/10', icon: ShieldAlert },
                    { label: 'Banned', count: statusSummary.banned, color: 'text-red-600', bg: 'bg-red-600/10', icon: ShieldAlert },
                ].map((item, idx) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 rounded-2xl border border-gray-800/50 ${item.bg} flex flex-col justify-between h-24`}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
                            <item.icon className={`w-4 h-4 ${item.color} opacity-50`} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                            <span className="text-gray-600 text-[10px] font-medium">accounts</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Pinned Checker Account Section */}
            {accounts.some(a => a.is_checker) && (
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-indigo-500/5">
                    <div className="flex items-center space-x-4">
                        <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-600/20">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">Checker Account</h2>
                                <span className="bg-green-500/20 text-green-400 text-[10px] uppercase px-2 py-0.5 rounded-full border border-green-500/20 font-bold tracking-wider">Active</span>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Designated account for Instagram data verification and reporting:
                                <span className="text-indigo-400 font-bold ml-1">@{accounts.find(a => a.is_checker)?.username}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <StatusBadge status={accounts.find(a => a.is_checker)?.status || "offline"} />
                        <button
                            onClick={() => handleCheckSession(accounts.find(a => a.is_checker)?.id)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-gray-700"
                        >
                            Refresh Status
                        </button>
                    </div>
                </div>
            )}

            {!accounts.some(a => a.is_checker) && (
                <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="bg-gray-800 p-3 rounded-xl">
                        <ShieldAlert className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-300">No Checker Account Set</h3>
                        <p className="text-gray-500 text-sm max-w-sm">
                            Please designate one account as a "Checker" to enable Instagram verification reports.
                            Use the shield icon in the account list below.
                        </p>
                    </div>
                </div>
            )}

            {/* Sticky Filter Section */}
            <div className="sticky top-0 z-40 bg-gray-950 -mx-4 px-4 border-b border-gray-800 py-1">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
                            <Filter className="w-4 h-4" />
                            Filters
                        </div>
                        {(loginAfter || loginBefore || selectedActivities.length > 0 || selectedStatuses.length > 0) && (
                            <button
                                onClick={() => { setLoginAfter(''); setLoginBefore(''); setSelectedActivities([]); setSelectedStatuses([]); }}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg transition-colors"
                            >
                                <X className="w-3 h-3" /> Clear All
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Date Range Filter */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Last Login Date
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={loginAfter}
                                    onChange={(e) => setLoginAfter(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none w-full"
                                    placeholder="From"
                                />
                                <span className="text-gray-600">-</span>
                                <input
                                    type="date"
                                    value={loginBefore}
                                    onChange={(e) => setLoginBefore(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none w-full"
                                    placeholder="To"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> Account Status
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['active', 'failed', 'challenge', 'offline', 'banned'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setSelectedStatuses(prev => {
                                                const isAlreadySelected = prev.includes(status);
                                                if (status === 'banned') {
                                                    // If banned is selected, we also add/remove inactive to keep it synced
                                                    const next = prev.filter(s => s !== 'banned' && s !== 'inactive');
                                                    return isAlreadySelected ? next : [...next, 'banned', 'inactive'];
                                                }
                                                return isAlreadySelected ? prev.filter(s => s !== status) : [...prev, status];
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center gap-2 border transition-all ${selectedStatuses.includes(status)
                                            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200'
                                            }`}
                                    >
                                        {status === 'active' && <ShieldCheck className="w-3 h-3" />}
                                        {(status === 'failed' || status === 'banned') && <ShieldAlert className="w-3 h-3" />}
                                        {status === 'challenge' && <ShieldAlert className="w-3 h-3" />}
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Activity Filter */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> Has Executed Activity
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['like', 'follow', 'view', 'post'].map(activity => (
                                    <button
                                        key={activity}
                                        onClick={() => {
                                            setSelectedActivities(prev =>
                                                prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
                                            );
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize flex items-center gap-2 border transition-all ${selectedActivities.includes(activity)
                                            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200'
                                            }`}
                                    >
                                        {activity === 'like' && <Heart className="w-3 h-3" />}
                                        {activity === 'follow' && <UserPlus className="w-3 h-3" />}
                                        {activity === 'view' && <Eye className="w-3 h-3" />}
                                        {activity === 'post' && <Image className="w-3 h-3" />}
                                        {activity}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <BulkAddAccountModal
                isOpen={isBulkAddOpen}
                onClose={() => setIsBulkAddOpen(false)}
                onJobStarted={(jobId) => {
                    setActiveJobId(jobId);
                    fetchAccounts(false);
                }}
            />

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAccounts}
            />

            <ConfirmDialog
                isOpen={deleteDialogState.isOpen}
                onClose={() => setDeleteDialogState({ ...deleteDialogState, isOpen: false })}
                onConfirm={confirmLogout}
                title="Disconnect Account"
                message={`Are you sure you want to disconnect @${deleteDialogState.username}? This will remove the account data and fingerprint from the system.`}
                confirmText="Disconnect"
                isDestructive={true}
                loading={deletingId === deleteDialogState.accountId}
            />

            <ConfirmDialog
                isOpen={bulkReloginDialogState.isOpen}
                onClose={() => setBulkReloginDialogState({ ...bulkReloginDialogState, isOpen: false })}
                onConfirm={confirmBulkRelogin}
                title="Bulk Relogin"
                message={`Found ${bulkReloginDialogState.count} accounts to re-login. Proceed with bulk login process?`}
                confirmText="Start Relogin"
                loading={false}
            />

            <BulkDisconnectModal
                isOpen={isBulkDisconnectOpen}
                onClose={() => setIsBulkDisconnectOpen(false)}
                onConfirm={handleBulkDisconnect}
                loading={isBulkDisconnecting}
            />

            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
                <div className="">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="text-gray-400">
                            <tr>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium border-b border-gray-800">Username</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium border-b border-gray-800">Status</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium border-b border-gray-800">Method</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium border-b border-gray-800">Fingerprint</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-center border-b border-gray-800">
                                    <span className="flex items-center justify-center gap-1">
                                        <Heart className="w-3.5 h-3.5 text-red-400" />
                                        Like
                                    </span>
                                </th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-center border-b border-gray-800">
                                    <span className="flex items-center justify-center gap-1">
                                        <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                        Follow
                                    </span>
                                </th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-center border-b border-gray-800">
                                    <span className="flex items-center justify-center gap-1">
                                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                                        View
                                    </span>
                                </th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-center border-b border-gray-800">
                                    <span className="flex items-center justify-center gap-1">
                                        <Image className="w-3.5 h-3.5 text-pink-400" />
                                        Post
                                    </span>
                                </th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium border-b border-gray-800">Last Login</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-center border-b border-gray-800">Checker</th>
                                <th className="sticky top-[114px] z-30 bg-gray-900 px-6 py-4 font-medium text-right border-b border-gray-800">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">Loading accounts...</td></tr>
                            ) : accounts.length === 0 ? (
                                <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">No accounts found. Add one to get started.</td></tr>
                            ) : accounts.map((account) => (
                                <tr key={account.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">@{account.username}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            {checkingIds.has(account.id) ? (
                                                <span className="text-gray-400 text-xs font-medium flex items-center">
                                                    <span className="w-3 h-3 block border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                                                    Checking...
                                                </span>
                                            ) : (reloginIds.has(account.id) || account.status === 'authenticating') ? (
                                                <span className="text-yellow-400 text-xs font-medium flex items-center">
                                                    <span className="w-3 h-3 block border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mr-2"></span>
                                                    Logging in...
                                                </span>
                                            ) : (
                                                <StatusBadge status={account.status || "offline"} />
                                            )}
                                            {/* Show error reason for failed accounts */}
                                            {account.status === 'failed' && account.last_error && (
                                                <span
                                                    className="text-xs text-red-400/70 mt-1 max-w-[200px] truncate cursor-help"
                                                    title={account.last_error}
                                                >
                                                    {account.last_error.length > 40 ? account.last_error.slice(0, 40) + '...' : account.last_error}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {account.login_method === 1 && 'Pass'}
                                        {account.login_method === 2 && '2FA'}
                                        {account.login_method === 3 && 'Cookie'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center text-gray-400 text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700 w-fit">
                                            <Smartphone className="w-3 h-3 mr-1" /> Android
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-sm font-medium ${(actionStats[account.id]?.like || 0) > 0
                                            ? 'bg-red-500/10 text-red-400'
                                            : 'text-gray-600'
                                            }`}>
                                            {actionStats[account.id]?.like || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-sm font-medium ${(actionStats[account.id]?.follow || 0) > 0
                                            ? 'bg-blue-500/10 text-blue-400'
                                            : 'text-gray-600'
                                            }`}>
                                            {actionStats[account.id]?.follow || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-sm font-medium ${(actionStats[account.id]?.view || 0) > 0
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : 'text-gray-600'
                                            }`}>
                                            {actionStats[account.id]?.view || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-lg text-sm font-medium ${(actionStats[account.id]?.post || 0) > 0
                                            ? 'bg-pink-500/10 text-pink-400'
                                            : 'text-gray-600'
                                            }`}>
                                            {actionStats[account.id]?.post || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {(account.last_login || account.created_at) ? new Date(account.last_login || account.created_at).toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleChecker(account.id)}
                                            className={`transition-all duration-300 p-2 rounded-xl border ${account.is_checker
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                                                : 'text-gray-500 border-gray-800 hover:border-indigo-500/50 hover:text-indigo-400'
                                                }`}
                                            title={account.is_checker ? "This is the Checker Account" : "Set as Checker Account"}
                                        >
                                            <ShieldCheck className={`w-5 h-5 ${account.is_checker ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end">
                                        <button
                                            onClick={() => handleLogoutClick(account.id, account.username)}
                                            disabled={deletingId === account.id}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors disabled:opacity-50"
                                            title="Disconnect Account"
                                        >
                                            {deletingId === account.id ? (
                                                <span className="w-4 h-4 block border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleCheckSession(account.id)}
                                            disabled={checkingIds.has(account.id)}
                                            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 p-2 rounded-lg transition-colors disabled:opacity-50 ml-1"
                                            title="Check Session Status"
                                        >
                                            {checkingIds.has(account.id) ? (
                                                <span className="w-4 h-4 block border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                                            ) : (
                                                <ShieldCheck className="w-4 h-4" />
                                            )}
                                        </button>
                                        {(['failed', 'expired', 'challenge', 'offline', 'banned'].includes(account.status) || reloginIds.has(account.id)) && (
                                            <>
                                                <button
                                                    onClick={() => handleRelogin(account.id)}
                                                    disabled={reloginIds.has(account.id) || account.status === 'authenticating'}
                                                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 p-2 rounded-lg transition-colors disabled:opacity-50 ml-1"
                                                    title="Re-login"
                                                >
                                                    {(reloginIds.has(account.id) || account.status === 'authenticating') ? (
                                                        <span className="w-4 h-4 block border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                                                    ) : (
                                                        <LogOut className="w-4 h-4 rotate-180" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleRotateFingerprint(account.id)}
                                                    disabled={reloginIds.has(account.id) || account.status === 'authenticating'}
                                                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 p-2 rounded-lg transition-colors disabled:opacity-50 ml-1"
                                                    title="Rotate Fingerprint (and Clear Session)"
                                                >
                                                    <Smartphone className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div >
            </div >
        </div >
    );
};

export default Accounts;
