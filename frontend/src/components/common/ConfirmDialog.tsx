import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    loading?: boolean;
}

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    loading = false
}: ConfirmDialogProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl transform transition-all scale-100 opacity-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-gray-400 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-50 ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                                : 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20'
                            }`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
