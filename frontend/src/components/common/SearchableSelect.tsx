import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value?: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
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
            // Remove @ symbol for comparison if present
            const labelWithoutAt = option.label.replace('@', '').toLowerCase();
            const labelLower = option.label.toLowerCase();
            return labelLower.includes(searchTerm) || labelWithoutAt.includes(searchTerm);
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

    // Reset search when dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setSearch('');
        }
    }, [isOpen]);

    const handleSelect = (e: React.MouseEvent, optionValue: string | number) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(optionValue);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setSearch(e.target.value);
    };

    const handleInputClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) {
                            setTimeout(() => inputRef.current?.focus(), 50);
                        }
                    }
                }}
                className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white cursor-pointer flex items-center justify-between transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
                    } ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
            >
                <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center space-x-2">
                    {selectedOption && (
                        <button
                            onClick={handleClear}
                            className="text-gray-500 hover:text-white p-0.5"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={handleInputChange}
                                onClick={handleInputClick}
                                placeholder="Search accounts..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-500"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-gray-500 text-sm text-center">
                                No accounts found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={`option-${option.value}`}
                                    onClick={(e) => handleSelect(e, option.value)}
                                    className={`px-4 py-2.5 cursor-pointer transition-colors ${option.value === value
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
