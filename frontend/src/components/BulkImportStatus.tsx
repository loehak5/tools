import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, XCircle, FileText, ChevronRight } from 'lucide-react';
import api from '../api/client';
import BulkReportModal from './BulkReportModal';

interface BulkImportStatusProps {
    jobId: string;
    onComplete?: () => void;
}

const BulkImportStatus = ({ jobId, onComplete }: BulkImportStatusProps) => {
    const [status, setStatus] = useState<any>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const pollIntervalRef = useRef<any>(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get(`/accounts/bulk/status/${jobId}`);
            setStatus(res.data);
            if (res.data.status === 'completed') {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                if (onComplete) onComplete();
            }
        } catch (err) {
            console.error('Failed to fetch job status:', err);
        }
    };

    useEffect(() => {
        fetchStatus();
        pollIntervalRef.current = setInterval(fetchStatus, 3000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [jobId]);

    if (!status) return null;

    const totalToProcess = status.total;
    const processed = status.logged_in + status.login_failed + status.failed;
    const percentage = totalToProcess > 0 ? Math.round((processed / totalToProcess) * 100) : 0;
    const isCompleted = status.status === 'completed';

    return (
        <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-4 shadow-lg shadow-indigo-600/5 mb-6 animate-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl ${isCompleted ? 'bg-green-500/10' : 'bg-indigo-500/10'}`}>
                        {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-white">
                                {isCompleted ? 'Bulk Import Completed' : 'Bulk Import in Progress...'}
                            </h3>
                            <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                                ID: {jobId.slice(0, 8)}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center text-xs text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {status.logged_in} Success
                            </div>
                            <div className="flex items-center text-xs text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                {status.login_failed + status.failed} Failed
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                {status.pending_login} Remaining
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 max-w-md">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-wider">
                        <span>Progress</span>
                        <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-700 flex items-center"
                    >
                        <FileText className="w-3.5 h-3.5 mr-2" />
                        Show Report
                        <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-50" />
                    </button>
                </div>
            </div>

            <BulkReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                results={status.results}
                total={status.total}
            />
        </div>
    );
};

export default BulkImportStatus;
