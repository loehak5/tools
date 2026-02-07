
import React from 'react';
import { CheckCircle, XCircle, Loader2, Globe, Clock, Network } from 'lucide-react';

interface TestResult {
    success: boolean;
    message: string;
    latency_ms?: number;
    ip?: string;
    country?: string;
}

interface TestResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: TestResult | null;
}

export const TestResultModal: React.FC<TestResultModalProps> = ({
    isOpen,
    onClose,
    isLoading,
    result
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <XCircle className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-semibold text-white mb-6 text-center">
                    Proxy Connection Test
                </h3>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 text-indigo-400">
                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                        <span className="text-gray-300">Testing connection...</span>
                    </div>
                ) : result ? (
                    <div className="space-y-6">
                        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${result.success
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            {result.success ? (
                                <CheckCircle className="w-12 h-12 mb-2" />
                            ) : (
                                <XCircle className="w-12 h-12 mb-2" />
                            )}
                            <span className="font-medium text-lg text-center">{result.message}</span>
                        </div>

                        {result.success && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center text-gray-400">
                                        <Clock className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Latency</span>
                                    </div>
                                    <span className="text-white font-mono">{result.latency_ms} ms</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center text-gray-400">
                                        <Network className="w-4 h-4 mr-2" />
                                        <span className="text-sm">IP Address</span>
                                    </div>
                                    <span className="text-white font-mono">{result.ip}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center text-gray-400">
                                        <Globe className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Location</span>
                                    </div>
                                    <span className="text-white">{result.country || 'Unknown'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

                {!isLoading && (
                    <button
                        onClick={onClose}
                        className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl transition-colors font-medium"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};
