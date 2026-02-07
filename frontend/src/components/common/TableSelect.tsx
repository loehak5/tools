import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface TableSelectProps {
    options: Option[];
    value?: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string; // Wrapper class
}

const TableSelect: React.FC<TableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Assign",
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() =>
        options.find(o => o.value === value),
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        if (!search.trim()) {
            return options;
        }
        const searchTerm = search.toLowerCase().trim();
        return options.filter(option => {
            const labelLower = option.label.toLowerCase();
            return labelLower.includes(searchTerm);
        });
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (e: React.MouseEvent, optionValue: string | number) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(optionValue);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
                    }
                }}
                disabled={disabled}
                className={`w-full group bg-gray-800/50 hover:bg-gray-800 border ${disabled ? 'border-gray-800 opacity-50' : 'border-gray-700 hover:border-gray-600'} 
                    rounded-lg px-2 py-1.5 text-xs text-white transition-all flex items-center justify-between
                    ${isOpen ? 'ring-1 ring-indigo-500 border-indigo-500' : ''}`}
            >
                <span className={`truncate mr-2 ${selectedOption ? 'text-white' : 'text-gray-500'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-500 group-hover:text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                placeholder="Search..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-md pl-7 pr-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-gray-500"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-xs text-center">
                                No proxies found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={`opt-${option.value}`}
                                    onClick={(e) => handleSelect(e, option.value)}
                                    className={`px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition-colors group ${option.value === value
                                        ? 'bg-indigo-600/10 text-indigo-400'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {option.value === value && <Check className="w-3 h-3 flex-shrink-0" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableSelect;
