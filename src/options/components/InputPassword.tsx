import React, { useState, InputHTMLAttributes } from 'react';

interface InputPasswordProps extends InputHTMLAttributes<HTMLInputElement> {
  // Component kế thừa tất cả props của native input
}

const InputPassword: React.FC<InputPasswordProps> = ({
  className = '',
  ...inputProps
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`input-wrapper ${className}`} style={{ position: 'relative', width: '100%' }}>
      <input
        {...inputProps}
        type={showPassword ? 'text' : 'password'}
        style={{
          width: '100%',
          paddingRight: '40px', // Để chừa chỗ cho button
          ...inputProps.style
        }}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#666',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? '🙈' : '👁️'}
      </button>
    </div>
  );
};

export default InputPassword;
