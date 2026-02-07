import { X, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Result {
    username: string;
    success: boolean;
    error?: string;
    login_status?: string;
    error_reason?: string;
}

interface BulkReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: Result[];
    total: number;
}

const BulkReportModal = ({ isOpen, onClose, results, total }: BulkReportModalProps) => {
    if (!isOpen) return null;

    const successCount = results.filter(r => r.success && r.login_status === 'active').length;
    const failedCount = results.filter(r => !r.success || r.login_status === 'failed' || r.login_status === 'challenge').length;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Bulk Import Report</h2>
                        <p className="text-gray-400 text-sm">Detailed results for {total} accounts</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                        <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{total}</p>
                    </div>
                    <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                        <p className="text-green-500/50 text-xs font-bold uppercase mb-1">Successful</p>
                        <p className="text-2xl font-bold text-green-400">{successCount}</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                        <p className="text-red-500/50 text-xs font-bold uppercase mb-1">Failed</p>
                        <p className="text-2xl font-bold text-red-400">{failedCount}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-800 rounded-xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-800/80 text-gray-400 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 font-medium">Username</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {results.map((result, idx) => (
                                <tr key={idx} className="hover:bg-gray-800/30">
                                    <td className="px-4 py-3 font-medium text-white">@{result.username}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                            {result.success ? (
                                                <>
                                                    {result.login_status === 'active' ? (
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    ) : (result.login_status === 'failed' || result.login_status === 'challenge') ? (
                                                        <XCircle className="w-4 h-4 text-red-400" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                                                    )}
                                                    <span className={
                                                        result.login_status === 'active' ? 'text-green-400' :
                                                            (result.login_status === 'failed' || result.login_status === 'challenge') ? 'text-red-400' :
                                                                'text-yellow-400'
                                                    }>
                                                        {result.login_status || 'pending'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                    <span className="text-red-400">Creation Failed</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {result.error && (
                                            <p className="text-red-400/80 text-xs italic">{result.error}</p>
                                        )}
                                        {result.error_reason && (
                                            <p className="text-red-400/80 text-xs italic">{result.error_reason}</p>
                                        )}
                                        {!result.error && !result.error_reason && result.login_status === 'active' && (
                                            <p className="text-green-400/80 text-xs">Login successful</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkReportModal;
