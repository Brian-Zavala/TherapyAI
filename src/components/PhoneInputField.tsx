'use client';

import { useState, useEffect } from 'react';
import { Phone, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Popular country codes
const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+44', country: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
];

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}

export default function PhoneInputField({
  value = '',
  onChange,
  placeholder = '(555) 123-4567',
  className = '',
  name = 'phone',
  required = false
}: PhoneInputFieldProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      // Check if value starts with a country code
      const matchedCode = COUNTRY_CODES.find(c => value.startsWith(c.code));
      if (matchedCode) {
        setCountryCode(matchedCode.code);
        setPhoneNumber(formatPhoneNumber(value.substring(matchedCode.code.length)));
      } else {
        setPhoneNumber(formatPhoneNumber(value));
      }
    }
  }, []);

  // Format phone number based on US/CA format (can be extended for other countries)
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Apply US/CA formatting
    if (countryCode === '+1') {
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length <= 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
    }
    
    // Generic formatting for other countries
    if (digits.length <= 4) {
      return digits;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else {
      return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    setPhoneNumber(formatted);
    
    // Validate phone number length
    const digits = input.replace(/\D/g, '');
    setIsValid(digits.length === 0 || (digits.length >= 7 && digits.length <= 15));
    
    // Update parent component
    onChange(`${countryCode} ${formatted}`);
  };

  const selectCountryCode = (code: typeof COUNTRY_CODES[0]) => {
    setCountryCode(code.code);
    setShowCountryDropdown(false);
    onChange(`${code.code} ${phoneNumber}`);
  };

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className="flex items-center gap-2 px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/15 focus:border-blue-400 focus:outline-none transition-all h-full"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.code}</span>
            <ChevronDown size={16} className={`transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showCountryDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute z-50 mt-2 w-64 bg-gray-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                <div className="max-h-64 overflow-y-auto">
                  {COUNTRY_CODES.map(country => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => selectCountryCode(country)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/10 transition-colors ${
                        country.code === countryCode ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{country.flag}</span>
                        <div>
                          <div className="font-medium">{country.name}</div>
                          <div className="text-xs opacity-70">{country.code}</div>
                        </div>
                      </div>
                      {country.code === countryCode && <Check size={16} className="text-blue-400" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Phone Number Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Phone size={18} className={`${!isValid && phoneNumber ? 'text-red-400' : 'text-gray-400'}`} />
          </div>
          <input
            type="tel"
            name={name}
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            required={required}
            className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-all ${
              !isValid && phoneNumber 
                ? 'border-red-500/50 focus:border-red-400' 
                : 'border-white/20 focus:border-blue-400'
            }`}
          />
          {!isValid && phoneNumber && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-5 left-0 text-xs text-red-400"
            >
              Please enter a valid phone number
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}