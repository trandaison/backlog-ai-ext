import React, { useState } from 'react';
import { EncryptionService } from "../../shared/encryption";

interface APIKeyInputProps {
  value?: string; // Optional encrypted key for initial value
  label: string;
  placeholder: string;
  hint: string;
  onVerify: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  onSave: (apiKey: string) => Promise<void>;
}

export const APIKeyInput: React.FC<APIKeyInputProps> = ({
  label,
  placeholder,
  hint,
  value = '',
  onVerify,
  onSave
}) => {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationState, setVerificationState] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  React.useEffect(() => {
    const loadStoredKey = async () => {
      setIsLoadingKey(true);
      setStoredKey(value);
      setApiKey(value);
      setIsLoadingKey(false);
    };

    loadStoredKey();
  }, [value]);

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setVerificationState('error');
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsVerifying(true);
    setVerificationState('idle');
    setErrorMessage('');

    try {
      const result = await onVerify(apiKey);

      if (result.success) {
        setVerificationState('success');

        // Save key using popup storage format (encrypted)
        try {
          const valueToStore = await EncryptionService.encryptApiKey(apiKey);
          onSave(valueToStore);
          setStoredKey(apiKey);
        } catch (error) {
          console.error('Failed to save API key:', error);
        }

        setTimeout(() => {
          setVerificationState('idle');
        }, 2000);
      } else {
        setVerificationState('error');
        setErrorMessage(result.error || 'Verification failed');
      }
    } catch (error) {
      setVerificationState('error');
      setErrorMessage('Network error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetToStoredKey = () => {
    setApiKey(storedKey);
    setVerificationState('idle');
    setErrorMessage('');
  };

  const handleClear = async () => {
    setApiKey('');
    setVerificationState('idle');
    setErrorMessage('');

    // Clear from storage
    try {
      await onSave(''); // Save empty string to clear
      setStoredKey('');
    } catch (error) {
      console.error('Failed to clear API key:', error);
    }
  };

  const getSaveButtonContent = () => {
    if (isVerifying) return 'Saving...';
    if (verificationState === 'success') return 'Saved';
    return 'Save';
  };

  return (
    <div className='api-key-input-group'>
      <label className='setting-label'>{label}</label>
      <div className='api-key-input-container'>
        <div className='input-with-controls'>
          <div className='input-wrapper'>
            <input
              type={showPassword ? 'text' : 'password'}
              className='setting-input api-key-input'
              placeholder={isLoadingKey ? 'Loading...' : placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoadingKey}
            />
            <button
              type='button'
              className='input-toggle-button-inside'
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide API key' : 'Show API key'}
              disabled={isLoadingKey}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button
            type='button'
            className={`verify-button ${verificationState}`}
            onClick={handleVerify}
            disabled={isVerifying || isLoadingKey}
          >
            {getSaveButtonContent()}
          </button>
          <button
            type='button'
            className='clear-button'
            onClick={handleClear}
            disabled={isVerifying || isLoadingKey}
            title='Clear API key'
          >
            Clear
          </button>
          {apiKey !== storedKey && !isLoadingKey && (
            <button
              type='button'
              className='reset-button'
              onClick={resetToStoredKey}
              title='Reset to saved key'
            >
              ↶
            </button>
          )}
        </div>
      </div>
      {errorMessage && <div className='error-message'>{errorMessage}</div>}
      <div className='hint-text'>
        {hint.includes('http') ? (
          <span>
            {hint.split('https://')[0]}
            <a
              href={`https://${hint.split('https://')[1]}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              https://{hint.split('https://')[1]}
            </a>
          </span>
        ) : (
          hint
        )}
      </div>
    </div>
  );
};
