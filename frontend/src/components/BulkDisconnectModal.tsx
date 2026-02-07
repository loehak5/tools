import React, { useState } from 'react';
import { X, Trash2, CheckSquare, Square, AlertTriangle, ShieldAlert, WifiOff, Ban } from 'lucide-react';

interface BulkDisconnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedTypes: string[], selectedStatuses: string[]) => void;
    loading?: boolean;
}

const BulkDisconnectModal: React.FC<BulkDisconnectModalProps> = ({ isOpen, onClose, onConfirm, loading = false }) => {
    if (!isOpen) return null;

    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<'select' | 'confirm'>('select');

    const activityTypes = [
        { id: 'like', label: 'Like Activity', description: 'Accounts that have performed Likes' },
        { id: 'follow', label: 'Follow Activity', description: 'Accounts that have performed Follows' },
        { id: 'view', label: 'View Activity', description: 'Accounts that have performed Story Views' },
        { id: 'post', label: 'Post Activity', description: 'Accounts that have performed Posts' },
    ];

    const statusTypes = [
        { id: 'failed', label: 'Login Failed', description: 'Accounts that failed to login', icon: ShieldAlert },
        { id: 'expired', label: 'Session Expired', description: 'Accounts with expired cookies', icon: ShieldAlert },
        { id: 'banned', label: 'Banned / Inactive', description: 'Accounts marked as banned or inactive', icon: Ban },
        { id: 'offline', label: 'Offline', description: 'Accounts currently offline', icon: WifiOff },
    ];

    const toggleType = (id: string) => {
        const next = new Set(selectedTypes);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedTypes(next);
    };

    const toggleStatus = (id: string) => {
        const next = new Set(selectedStatuses);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedStatuses(next);
    };

    const handleNext = () => {
        if (selectedTypes.size === 0 && selectedStatuses.size === 0) return;
        setStep('confirm');
    };

    const handleBack = () => {
        setStep('select');
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedTypes), Array.from(selectedStatuses));
    };

    const handleClose = () => {
        if (!loading) {
            setStep('select');
            setSelectedTypes(new Set());
            setSelectedStatuses(new Set());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        Bulk Disconnect
                    </h2>
                    <button onClick={handleClose} disabled={loading} className="text-gray-500 hover:text-white disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 'select' ? (
                    <div className="space-y-6">
                        {/* Status Selection */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">By Status</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {statusTypes.map((type) => {
                                    const isSelected = selectedStatuses.has(type.id);
                                    const Icon = type.icon;
                                    return (
                                        <div
                                            key={type.id}
                                            onClick={() => toggleStatus(type.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${isSelected
                                                ? 'bg-red-500/10 border-red-500/50'
                                                : 'bg-gray-800 border-gray-700 hover:bg-gray-800/80'
                                                }`}
                                        >
                                            <div className={`mt-0.5 ${isSelected ? 'text-red-400' : 'text-gray-500'}`}>
                                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                        {type.label}
                                                    </h3>
                                                    {isSelected && <Icon className="w-4 h-4 text-red-400" />}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Activity Selection */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">By Activity</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {activityTypes.map((type) => {
                                    const isSelected = selectedTypes.has(type.id);
                                    return (
                                        <div
                                            key={type.id}
                                            onClick={() => toggleType(type.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${isSelected
                                                ? 'bg-red-500/10 border-red-500/50'
                                                : 'bg-gray-800 border-gray-700 hover:bg-gray-800/80'
                                                }`}
                                        >
                                            <div className={`mt-0.5 ${isSelected ? 'text-red-400' : 'text-gray-500'}`}>
                                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                    {type.label}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleNext}
                                disabled={selectedTypes.size === 0 && selectedStatuses.size === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-4">
                            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-red-400">Warning: Destructive Action</h3>
                                <div className="text-sm text-red-200/70">
                                    You are about to disconnect accounts matching:
                                    <ul className="list-disc list-inside mt-1 font-semibold text-white">
                                        {Array.from(selectedStatuses).map(s => <li key={s}>Status: {s}</li>)}
                                        {Array.from(selectedTypes).map(t => <li key={t}>Activity: {t}</li>)}
                                    </ul>
                                </div>
                                <p className="text-xs text-red-200/50 mt-2">
                                    This action cannot be undone. All data associated with these accounts, including cookies and fingerprints, will be permanently deleted.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 block border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Confirm Disconnect
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkDisconnectModal;
