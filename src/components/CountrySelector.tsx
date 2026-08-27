import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Globe } from 'lucide-react';
import { COUNTRIES, CountryInfo, DEFAULT_COUNTRY } from '../data/countries';

interface CountrySelectorProps {
  selectedCountry: CountryInfo;
  onSelectCountry: (country: CountryInfo) => void;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry = DEFAULT_COUNTRY,
  onSelectCountry,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.nameAr.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative inline-block" ref={dropdownRef} dir="ltr">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="h-full min-h-[42px] px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl flex items-center gap-2 text-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
        title="اختر الدولة ورمز الاتصال"
      >
        <span className="text-xl leading-none">{selectedCountry.flag}</span>
        <span className="text-xs font-mono font-bold text-amber-400">{selectedCountry.dialCode}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-w-[90vw] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالدولة أو الرمز..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                dir="rtl"
              />
            </div>
          </div>

          {/* List of Countries */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/40">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <button
                    key={`${c.code}-${c.dialCode}`}
                    type="button"
                    onClick={() => {
                      onSelectCountry(c);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-500/10 text-amber-300' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 leading-none">{c.flag}</span>
                      <div className="min-w-0 text-right" dir="rtl">
                        <p className="text-xs font-bold text-slate-100 truncate">{c.nameAr}</p>
                        <p className="text-[10px] text-slate-400 truncate">{c.nameEn}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {c.dialCode}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                <Globe className="w-5 h-5 mx-auto mb-1 opacity-40" />
                لم يتم العثور على أي دولة مطابقة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
