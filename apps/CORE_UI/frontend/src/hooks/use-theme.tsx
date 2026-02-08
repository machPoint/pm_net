'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  BaseTheme,
  ColorScheme,
  ThemeConfig,
  GlassEffect,
  getBaseThemes,
  getColorSchemes,
  applyThemeConfig,
  applyGlassEffect,
  isThemeDark,
} from '@/lib/themes/theme-config';

interface ThemeContextType {
  baseTheme: BaseTheme;
  colorScheme: ColorScheme;
  glassEffect: GlassEffect;
  setBaseTheme: (theme: BaseTheme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setGlassEffect: (effect: GlassEffect) => void;
  toggleBaseTheme: () => void;
  availableBaseThemes: BaseTheme[];
  availableColorSchemes: ColorScheme[];
  availableGlassEffects: GlassEffect[];
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>('dark');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('standard');
  const [glassEffect, setGlassEffectState] = useState<GlassEffect>('flat');

  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage
    const savedBaseTheme = localStorage.getItem('baseTheme') as BaseTheme | null;
    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme | null;
    const savedGlassEffect = localStorage.getItem('glassEffect') as GlassEffect | null;

    if (savedBaseTheme && getBaseThemes().includes(savedBaseTheme)) {
      setBaseThemeState(savedBaseTheme);
    }

    if (savedColorScheme && getColorSchemes().includes(savedColorScheme)) {
      setColorSchemeState(savedColorScheme);
    }

    if (savedGlassEffect && ['flat', 'glass'].includes(savedGlassEffect)) {
      setGlassEffectState(savedGlassEffect);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      const config: ThemeConfig = { baseTheme, colorScheme };
      applyThemeConfig(config);
      applyGlassEffect(glassEffect);
      localStorage.setItem('baseTheme', baseTheme);
      localStorage.setItem('colorScheme', colorScheme);
      localStorage.setItem('glassEffect', glassEffect);
    }
  }, [baseTheme, colorScheme, glassEffect, mounted]);

  const setBaseTheme = (theme: BaseTheme) => {
    setBaseThemeState(theme);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  const setGlassEffect = (effect: GlassEffect) => {
    setGlassEffectState(effect);
  };

  const toggleBaseTheme = () => {
    setBaseThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value: ThemeContextType = {
    baseTheme,
    colorScheme,
    glassEffect,
    setBaseTheme,
    setColorScheme,
    setGlassEffect,
    toggleBaseTheme,
    availableBaseThemes: getBaseThemes(),
    availableColorSchemes: getColorSchemes(),
    availableGlassEffects: ['flat', 'glass'],
    isDarkMode: isThemeDark(baseTheme),
  };

  if (!mounted) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
