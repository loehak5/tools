import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}: PaginationProps) => {
    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 mt-4">
            <div className="text-sm text-gray-400 order-2 sm:order-1">
                {totalItems !== undefined && itemsPerPage !== undefined ? (
                    <span>
                        Showing <span className="text-white font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white font-medium">{totalItems}</span> results
                    </span>
                ) : (
                    <span>Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span></span>
                )}
            </div>

            <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((p) => (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === p
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
