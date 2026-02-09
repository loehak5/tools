import React, { useState, useEffect, useRef } from 'react';
import { Image, Heart, UserPlus, Eye, Calendar, Clock, AlertCircle, Loader2, CheckSquare, Square, Trash2, RotateCcw, RotateCw, X, Play, Pause, Video } from 'lucide-react';
import api from '../api/client';
import { Pagination } from '../components/common/Pagination';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface ScheduledTask {
    id: number;
    account_id: number;
    account_username?: string;
    task_type: string;
    scheduled_at: string;
    status: string;
    params: Record<string, unknown>;
    created_at: string;
}

// Helper: Format date for datetime-local input
const formatDateForInput = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Helper: Format time display in local timezone (simple approach)
const formatLocalTime = (utcString: string): string => {
    console.log('[formatLocalTime] Input UTC:', utcString);
    // FIX: Backend sends timestamps without 'Z' suffix - browser interprets as local time!
    const utcStringWithZ = utcString.endsWith('Z') ? utcString : `${utcString}Z`;
    const date = new Date(utcStringWithZ);
    console.log('[formatLocalTime] Date object:', date);
    console.log('[formatLocalTime] getHours():', date.getHours(), 'getUTCHours():', date.getUTCHours());

    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const result = `${day} ${month} ${year}, ${hours}.${minutes}`;
    console.log('[formatLocalTime] Output:', result);
    return result;
};

// Status Badge Component
// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-yellow-500/10 text-yellow-500',
        paused: 'bg-orange-500/10 text-orange-500',
        running: 'bg-blue-500/10 text-blue-500 animate-pulse',
        completed: 'bg-green-500/10 text-green-500',
        failed: 'bg-red-500/10 text-red-500'
    };

    return (
        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-widest ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
};

// Task Type Icon
const TaskTypeIcon = ({ type }: { type: string }) => {
    const icons: Record<string, { icon: React.ElementType; color: string }> = {
        post: { icon: Image, color: 'text-pink-400' },
        like: { icon: Heart, color: 'text-red-400' },
        follow: { icon: UserPlus, color: 'text-blue-400' },
        view: { icon: Eye, color: 'text-purple-400' },
        reels: { icon: Video, color: 'text-indigo-400' },
        story: { icon: Play, color: 'text-amber-400' }
    };

    const { icon: Icon, color } = icons[type] || icons.post;
    return <Icon className={`w-5 h-5 ${color}`} />;
};

const Monitoring = () => {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Filter states
    const [selectedTab, setSelectedTab] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const LIMIT = 20;

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(false);
    const autoRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    // Selection state
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<'bulk-delete' | 'clear-history' | 'delete-one' | null>(null);
    const [confirmData, setConfirmData] = useState<number | null>(null);

    // Edit/Delete states
    const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
    const [editScheduledAt, setEditScheduledAt] = useState('');
    const [editParams, setEditParams] = useState<Record<string, string>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch tasks with pagination and filtering
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const skip = (currentPage - 1) * LIMIT;

            // Handle different filter types
            const statusFilters = ['failed', 'pending', 'paused', 'running', 'completed'];
            const isStatusFilter = statusFilters.includes(selectedTab);
            const typeParam = !isStatusFilter && selectedTab !== 'all' ? selectedTab : undefined;
            const statusParam = isStatusFilter ? selectedTab : undefined;

            const [tasksRes, countRes] = await Promise.all([
                api.get('/tasks', { params: { skip, limit: LIMIT, task_type: typeParam, status: statusParam } }),
                api.get('/tasks/count', { params: { task_type: typeParam, status: statusParam } })
            ]);

            setTasks(tasksRes.data);
            setTotalItems(countRes.data.count);
            setTotalPages(Math.ceil(countRes.data.count / LIMIT));
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-advance page effect (Only when Auto-Refresh is ON)
    useEffect(() => {
        if (autoRefresh && tasks.length > 0 && !loading) {
            // Check if all tasks on current page are finished (completed or failed)
            const allFinished = tasks.every(t => ['completed', 'failed'].includes(t.status));

            // If all finished and we are not on the last page, go to next page
            if (allFinished && currentPage < totalPages) {
                // Add a small delay to allow user to see the "Completed" state briefly
                setTimeout(() => {
                    setCurrentPage(prev => prev + 1);
                }, 1000);
            }
        }
    }, [tasks, autoRefresh, loading, currentPage, totalPages]);

    useEffect(() => {
        fetchTasks();
    }, [currentPage, selectedTab]);

    // Auto-refresh effect
    useEffect(() => {
        if (autoRefresh) {
            autoRefreshInterval.current = setInterval(() => {
                fetchTasks();
            }, 5000); // Refresh every 5 seconds
        } else {
            if (autoRefreshInterval.current) {
                clearInterval(autoRefreshInterval.current);
                autoRefreshInterval.current = null;
            }
        }

        return () => {
            if (autoRefreshInterval.current) {
                clearInterval(autoRefreshInterval.current);
            }
        };
    }, [autoRefresh, currentPage, selectedTab]);

    // Edit task functions
    const handleEditTask = (task: ScheduledTask) => {
        setEditingTask(task);
        const date = new Date(task.scheduled_at);
        setEditScheduledAt(formatDateForInput(date));
        setEditParams(task.params as Record<string, string> || {});
    };

    const handleSaveEdit = async () => {
        if (!editingTask) return;
        setActionLoading(true);

        try {
            await api.patch(`/tasks/${editingTask.id}`, {
                scheduled_at: new Date(editScheduledAt).toISOString(),
                params: editParams
            });
            setEditingTask(null);
            fetchTasks();
        } catch (error) {
            console.error('Failed to update task:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingTask(null);
        setEditScheduledAt('');
        setEditParams({});
    };

    // Selection Logic
    const toggleTaskSelection = (taskId: number) => {
        if (selectedTaskIds.includes(taskId)) {
            setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
        } else {
            setSelectedTaskIds([...selectedTaskIds, taskId]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedTaskIds.length === tasks.length && tasks.length > 0) {
            setSelectedTaskIds([]);
        } else {
            // Only select visible tasks that can be deleted (not running)
            const deletableIds = tasks.filter(t => t.status !== 'running').map(t => t.id);
            setSelectedTaskIds(deletableIds);
        }
    };

    // Bulk Actions Handlers
    const onBulkDeleteClick = () => {
        if (selectedTaskIds.length === 0) return;
        setConfirmType('bulk-delete');
        setConfirmOpen(true);
    };

    const onClearHistoryClick = () => {
        setConfirmType('clear-history');
        setConfirmOpen(true);
    };

    const onDeleteOneClick = (taskId: number) => {
        setConfirmType('delete-one');
        setConfirmData(taskId);
        setConfirmOpen(true);
    };

    // Actual API Calls
    const handleConfirmAction = async () => {
        setActionLoading(true);
        try {
            if (confirmType === 'bulk-delete') {
                await api.post('/tasks/bulk-delete', { ids: selectedTaskIds });
                setSelectedTaskIds([]);
            } else if (confirmType === 'clear-history') {
                const statusFilters = ['failed', 'pending', 'running', 'completed'];
                const historyStatuses = ['completed', 'failed'];
                const isStatusFilter = statusFilters.includes(selectedTab);

                // If it's a status filter like 'pending' or 'running', we don't want to pass it as a status filter 
                // for CLEAR HISTORY because we only clear completed/failed. 
                // In that case, we clear ALL history.
                const statusParam = historyStatuses.includes(selectedTab) ? selectedTab : undefined;

                // If it's a task type filter (post, like, etc.), we pass it.
                const typeParam = !isStatusFilter && selectedTab !== 'all' ? selectedTab : undefined;

                const params: Record<string, string> = {};
                if (typeParam) params.task_type = typeParam;
                if (statusParam) params.status = statusParam;

                await api.delete('/tasks/history', { params });
            }
            else if (confirmType === 'delete-one' && confirmData) {
                await api.delete(`/tasks/${confirmData}`);
            }

            // Refresh and close
            fetchTasks();
            setConfirmOpen(false);
            setConfirmType(null);
            setConfirmData(null);
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRetryTask = async (taskId: number) => {
        setActionLoading(true);
        try {
            await api.post(`/tasks/${taskId}/retry`);
            fetchTasks();
        } catch (error) {
            console.error('Failed to retry task:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        setActionLoading(true);

        try {
            await api.delete(`/tasks/${deleteConfirm}`);
            setDeleteConfirm(null);
            fetchTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
        } finally {
            setActionLoading(false);
        }
    };

    // Get param display value
    const getParamDisplay = (task: ScheduledTask) => {
        const params = task.params || {};
        if (task.task_type === 'like') return params.media_url as string || '';
        if (task.task_type === 'follow') return `@${params.target_username || ''}`;
        if (task.task_type === 'view') return params.story_url as string || '';
        if (task.task_type === 'post' || task.task_type === 'reels' || task.task_type === 'story') {
            return params.caption as string || (task.task_type === 'story' && params.link ? `Link: ${params.link}` : '(no caption)');
        }
        return '';
    };

    // Get param key for editing
    const getParamKey = (taskType: string) => {
        if (taskType === 'like') return 'media_url';
        if (taskType === 'follow') return 'target_username';
        if (taskType === 'view') return 'story_url';
        if (taskType === 'post' || taskType === 'reels' || taskType === 'story') return 'caption';
        return '';
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Monitoring</h1>
                <p className="text-gray-400 mt-1">
                    Pantau semua task yang telah dijadwalkan
                </p>
            </div>

            {/* Scheduled Tasks List */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">Scheduled Tasks</h2>
                        <button
                            onClick={fetchTasks}
                            disabled={loading}
                            className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-white hover:bg-gray-700 transition-all active:scale-95 disabled:opacity-50"
                            title="Refresh Tasks"
                        >
                            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${autoRefresh
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                                }`}
                            title={autoRefresh ? 'Stop Auto-refresh' : 'Start Auto-refresh (5s)'}
                        >
                            {autoRefresh ? (
                                <>
                                    <Pause className="w-4 h-4" />
                                    <span className="hidden sm:inline">Live</span>
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    <span className="hidden sm:inline">Auto</span>
                                </>
                            )}
                        </button>
                        {/* Task Pause/Resume All */}
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    setActionLoading(true);
                                    try {
                                        await api.post('/tasks/pause-all');
                                        fetchTasks();
                                    } catch (err) {
                                        console.error('Failed to pause tasks', err);
                                    } finally {
                                        setActionLoading(false);
                                    }
                                }}
                                disabled={actionLoading}
                                className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-orange-400 hover:bg-orange-500/10 transition-all active:scale-95 disabled:opacity-50"
                                title="Pause All Pending Tasks"
                            >
                                <Pause className="w-4 h-4" />
                            </button>
                            <button
                                onClick={async () => {
                                    setActionLoading(true);
                                    try {
                                        await api.post('/tasks/resume-all');
                                        fetchTasks();
                                    } catch (err) {
                                        console.error('Failed to resume tasks', err);
                                    } finally {
                                        setActionLoading(false);
                                    }
                                }}
                                disabled={actionLoading}
                                className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:text-green-400 hover:bg-green-500/10 transition-all active:scale-95 disabled:opacity-50"
                                title="Resume All Paused Tasks"
                            >
                                <Play className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex bg-gray-800/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {['all', 'post', 'reels', 'story', 'like', 'follow', 'view', 'pending', 'paused', 'running', 'completed', 'failed'].map((type) => (
                            <button
                                key={type}
                                onClick={() => { setSelectedTab(type); setCurrentPage(1); }}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap
                                    ${selectedTab === type
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }
                                `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Bulk Actions Header */}
                    <div className="flex items-center gap-2">
                        {selectedTaskIds.length > 0 ? (
                            <button
                                onClick={onBulkDeleteClick}
                                disabled={actionLoading}
                                className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete {selectedTaskIds.length} Selected
                            </button>
                        ) : (
                            <button
                                onClick={onClearHistoryClick}
                                disabled={actionLoading}
                                className="px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg text-sm font-medium hover:text-red-400 hover:border-red-500/50 transition-colors flex items-center gap-2"
                                title="Delete all completed/failed tasks"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Clear History
                            </button>
                        )}
                    </div>
                </div>

                {/* Select All Checkbox (Only if tasks exist) */}
                {tasks.length > 0 && (
                    <div className="flex items-center justify-between mb-3 px-1">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {selectedTaskIds.length === tasks.length && tasks.length > 0
                                ? <CheckSquare className="w-5 h-5 text-indigo-400" />
                                : <Square className="w-5 h-5" />
                            }
                            Select All (Page)
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-500" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Belum ada task yang dijadwalkan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.map((task) => (
                            <div key={task.id} className={`group bg-gray-900/50 border rounded-2xl transition-all hover:bg-gray-800/30 flex flex-col ${selectedTaskIds.includes(task.id)
                                ? 'border-indigo-500/50 bg-indigo-500/5'
                                : 'border-gray-800 hover:border-gray-700'
                                }`}>
                                {/* Edit Mode */}
                                {editingTask?.id === task.id ? (
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                                <TaskTypeIcon type={task.task_type} />
                                            </div>
                                            <span className="text-white font-medium capitalize">{task.task_type}</span>
                                            <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">Editing</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Schedule Time</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editScheduledAt}
                                                    onChange={(e) => setEditScheduledAt(e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            {task.task_type !== 'post' && (
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1 capitalize">
                                                        {task.task_type === 'like' ? 'Post URL' :
                                                            task.task_type === 'follow' ? 'Target Username' : 'Story URL'}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editParams[getParamKey(task.task_type)] || ''}
                                                        onChange={(e) => setEditParams({
                                                            ...editParams,
                                                            [getParamKey(task.task_type)]: e.target.value
                                                        })}
                                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 justify-end pt-2">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 flex items-center gap-1.5"
                                            >
                                                <X className="w-3 h-3" />
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={actionLoading}
                                                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600 flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : deleteConfirm === task.id ? (
                                    /* Delete Confirmation */
                                    <div className="p-4 flex flex-col justify-center items-center text-center h-full min-h-[140px]">
                                        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                                        <p className="text-red-400 text-sm font-medium mb-4">Cancel this task?</p>
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                                            >
                                                No
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={actionLoading}
                                                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Normal View (Card Layout) */
                                    <div className="p-4 flex flex-col h-full relative">
                                        {/* Header: Icon, Type, Checkbox */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <TaskTypeIcon type={task.task_type} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm tracking-wide capitalize leading-tight">{task.task_type}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-indigo-400 font-bold text-[11px] truncate max-w-[100px]">
                                                            @{task.account_username || 'unknown'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleTaskSelection(task.id)}
                                                disabled={task.status === 'running'}
                                                className={`transition-colors p-1 -mr-2 -mt-2 ${task.status === 'running' ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-400'}`}
                                            >
                                                {selectedTaskIds.includes(task.id)
                                                    ? <CheckSquare className="w-5 h-5 text-indigo-400" />
                                                    : <Square className="w-5 h-5 text-gray-600 group-hover:text-gray-500" />
                                                }
                                            </button>
                                        </div>

                                        {/* Body: Params & Details */}
                                        <div className="flex-1 mb-3">
                                            <div className="bg-gray-950/30 rounded-lg p-2 border border-gray-800/50">
                                                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2" title={getParamDisplay(task)}>
                                                    {getParamDisplay(task) || '(No details)'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Footer: Date & Status */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-800/50 mt-auto">
                                            <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                <Clock className="w-3 h-3 mr-1.5 opacity-40" />
                                                <span title={`UTC: ${task.scheduled_at}`}>{formatLocalTime(task.scheduled_at)}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={task.status} />
                                                {['pending', 'paused', 'failed'].includes(task.status) && (
                                                    <div className="flex gap-1 ml-1 pl-2 border-l border-gray-800">
                                                        {task.status === 'failed' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRetryTask(task.id); }}
                                                                className="text-gray-500 hover:text-green-400 transition-colors"
                                                                title="Retry Task"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {task.status === 'pending' && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await api.post(`/tasks/${task.id}/pause`);
                                                                        fetchTasks();
                                                                    } catch (err) {
                                                                        console.error('Failed to pause task', err);
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                                className="text-gray-500 hover:text-orange-400 transition-colors"
                                                                title="Pause Task"
                                                            >
                                                                <Pause className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {task.status === 'paused' && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await api.post(`/tasks/${task.id}/resume`);
                                                                        fetchTasks();
                                                                    } catch (err) {
                                                                        console.error('Failed to resume task', err);
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                                className="text-gray-500 hover:text-green-400 transition-colors"
                                                                title="Resume Task"
                                                            >
                                                                <Play className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                                            className="text-gray-500 hover:text-indigo-400 transition-colors"
                                                            title="Edit Schedule"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeleteOneClick(task.id); }}
                                                            className="text-gray-500 hover:text-red-400 transition-colors"
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}


                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={LIMIT}
                />
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmAction}
                title={
                    confirmType === 'bulk-delete' ? 'Delete Selected Tasks?' :
                        confirmType === 'clear-history' ? 'Clear Task History?' :
                            'Delete Task?'
                }
                message={
                    confirmType === 'bulk-delete' ? `Are you sure you want to delete ${selectedTaskIds.length} tasks? This action cannot be undone.` :
                        confirmType === 'clear-history' ? (
                            selectedTab === 'all'
                                ? 'Are you sure you want to delete ALL completed and failed tasks? This action cannot be undone.'
                                : `Are you sure you want to delete ALL ${selectedTab} tasks? This action cannot be undone.`
                        ) :
                            'Are you sure you want to delete this task?'
                }
                confirmText={confirmType === 'clear-history' ? 'Yes, Clear All' : 'Yes, Delete'}
                isDestructive={true}
                loading={actionLoading}
            />
        </div>
    );
};

export default Monitoring;
