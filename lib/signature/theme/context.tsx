'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SignatureTheme, defaultSignatureTheme } from './types';

interface SignatureThemeContextValue {
  theme: SignatureTheme;
  setTheme: (theme: Partial<SignatureTheme>) => void;
  resetTheme: () => void;
}

const SignatureThemeContext = createContext<SignatureThemeContextValue | undefined>(undefined);

interface SignatureThemeProviderProps {
  children: ReactNode;
  initialTheme?: Partial<SignatureTheme>;
}

export function SignatureThemeProvider({ 
  children, 
  initialTheme 
}: SignatureThemeProviderProps) {
  const [theme, setThemeState] = useState<SignatureTheme>({
    ...defaultSignatureTheme,
    ...initialTheme,
  });

  const setTheme = (updates: Partial<SignatureTheme>) => {
    setThemeState(prev => ({ ...prev, ...updates }));
  };

  const resetTheme = () => {
    setThemeState(defaultSignatureTheme);
  };

  return (
    <SignatureThemeContext.Provider value={{ theme, setTheme, resetTheme }}>
      {children}
    </SignatureThemeContext.Provider>
  );
}

export function useSignatureTheme() {
  const context = useContext(SignatureThemeContext);
  if (!context) {
    // Return default theme if not in provider
    return {
      theme: defaultSignatureTheme,
      setTheme: () => {},
      resetTheme: () => {},
    };
  }
  return context;
}
