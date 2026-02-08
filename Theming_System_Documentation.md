# PM_NET Theming System Documentation

## Overview

The PM_NET application uses a **2x2 matrix theming system** that provides flexible visual customization through two independent settings:

1. **Base Theme**: Light or Dark mode
2. **Color Scheme**: Standard, Colorful, or Monotone

This creates **6 possible theme combinations** that users can mix and match according to their preferences.

---

## Architecture

### Theme Configuration Structure

```
Base Theme (2 options)     Color Scheme (3 options)     Result
─────────────────────      ───────────────────────      ──────
Light                  ×   Standard                  =  Light Standard
Light                  ×   Colorful                  =  Light Colorful
Light                  ×   Monotone                  =  Light Monotone
Dark                   ×   Standard                  =  Dark Standard
Dark                   ×   Colorful                  =  Dark Colorful
Dark                   ×   Monotone                  =  Dark Monotone
```

### Key Concepts

- **Base Theme**: Controls the overall brightness (light/dark backgrounds and text)
- **Color Scheme**: Controls the color palette (standard balanced colors, vibrant colorful accents, or pure grayscale)
- **CSS Variables**: All colors are applied via CSS custom properties for dynamic theming
- **Persistence**: User preferences are saved to localStorage and persist across sessions

---

## File Structure

### Core Theme Files

```
apps/CORE_UI/frontend/src/
├── lib/themes/
│   ├── theme-config.ts          # Theme configuration and color definitions
│   └── README.md                # Theme system documentation
├── hooks/
│   └── use-theme.tsx            # React context provider for theme management
├── app/
│   ├── globals.css              # Global CSS with theme variables
│   └── layout.tsx               # Root layout with ThemeProvider
└── components/
    └── theme/
        └── ThemeSwitcher.tsx    # Theme switching UI components (optional)
```

---

## Theme Configuration (`theme-config.ts`)

### Type Definitions

```typescript
export type BaseTheme = 'light' | 'dark';
export type ColorScheme = 'standard' | 'colorful' | 'monotone';

export interface ThemeConfig {
  baseTheme: BaseTheme;
  colorScheme: ColorScheme;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  // Sidebar-specific colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}
```

### Color Scheme Definitions

The system defines colors for each combination of base theme and color scheme:

```typescript
const THEME_COLORS: Record<BaseTheme, Record<ColorScheme, ThemeColors>> = {
  light: {
    standard: { /* Light mode with balanced colors */ },
    colorful: { /* Light mode with vibrant blues, purples, pinks */ },
    monotone: { /* Light mode with pure grayscale */ }
  },
  dark: {
    standard: { /* Dark mode with balanced colors */ },
    colorful: { /* Dark mode with vibrant accent colors */ },
    monotone: { /* Dark mode with pure grayscale */ }
  }
};
```

### Helper Functions

```typescript
// Get all available base themes
export function getBaseThemes(): BaseTheme[]

// Get all available color schemes
export function getColorSchemes(): ColorScheme[]

// Get theme colors for a specific configuration
export function getThemeColors(config: ThemeConfig): ThemeColors

// Get color scheme metadata
export function getColorSchemeInfo(scheme: ColorScheme): ColorSchemeMetadata

// Check if base theme is dark
export function isThemeDark(baseTheme: BaseTheme): boolean

// Apply theme configuration to CSS variables
export function applyThemeConfig(config: ThemeConfig): void
```

---

## Theme Provider (`use-theme.tsx`)

### Context API

The `ThemeProvider` component wraps the entire application and provides theme state and controls:

```typescript
interface ThemeContextType {
  baseTheme: BaseTheme;
  colorScheme: ColorScheme;
  setBaseTheme: (theme: BaseTheme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleBaseTheme: () => void;
  availableBaseThemes: BaseTheme[];
  availableColorSchemes: ColorScheme[];
  isDarkMode: boolean;
}
```

### Usage in Components

```typescript
import { useTheme } from '@/hooks/use-theme';

function MyComponent() {
  const { 
    baseTheme, 
    colorScheme, 
    setBaseTheme, 
    setColorScheme 
  } = useTheme();

  return (
    <div>
      <button onClick={() => setBaseTheme('light')}>Light Mode</button>
      <button onClick={() => setBaseTheme('dark')}>Dark Mode</button>
      <button onClick={() => setColorScheme('colorful')}>Colorful</button>
    </div>
  );
}
```

### Persistence

Theme preferences are automatically saved to localStorage:
- `baseTheme`: Stores the selected base theme (light/dark)
- `colorScheme`: Stores the selected color scheme (standard/colorful/monotone)

---

## Global Styles (`globals.css`)

### CSS Variable Application

The theme system uses CSS custom properties that are dynamically updated:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --primary: 0 0% 20%;
  /* ... all other theme variables */
}

.dark {
  --background: 0 0% 9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  /* ... dark mode overrides */
}
```

### Using Theme Variables in Components

```tsx
// In Tailwind classes
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>

// In custom CSS
.my-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

---

## Settings Page Integration

### User Interface

The settings page (`app/settings/page.tsx`) provides two separate controls:

1. **Base Theme Selector**
   - 2 cards: Light and Dark
   - Shows description for each mode
   - Highlights active selection

2. **Color Scheme Selector**
   - 3 cards: Standard, Colorful, Monotone
   - Shows description for each scheme
   - Highlights active selection

3. **Preview Examples**
   - Live preview of buttons, cards, badges, and form elements
   - Updates instantly when theme changes

### Implementation

```typescript
const { 
  baseTheme, 
  colorScheme, 
  setBaseTheme, 
  setColorScheme,
  availableBaseThemes,
  availableColorSchemes 
} = useTheme();

// Base Theme Selection
{availableBaseThemes.map((theme) => (
  <button 
    key={theme}
    onClick={() => setBaseTheme(theme)}
    className={baseTheme === theme ? 'active' : ''}
  >
    {theme}
  </button>
))}

// Color Scheme Selection
{availableColorSchemes.map((scheme) => (
  <button 
    key={scheme}
    onClick={() => setColorScheme(scheme)}
    className={colorScheme === scheme ? 'active' : ''}
  >
    {getColorSchemeInfo(scheme).name}
  </button>
))}
```

---

## Theme Combinations

### 1. Light + Standard
- **Use Case**: Classic light mode for daytime work
- **Colors**: Neutral grays with subtle accents
- **Best For**: Professional environments, long reading sessions

### 2. Light + Colorful
- **Use Case**: Bright and energetic workspace
- **Colors**: Vibrant blues (#3B82F6), purples (#A855F7), pinks (#EC4899)
- **Best For**: Creative work, presentations, visual design

### 3. Light + Monotone
- **Use Case**: Distraction-free light mode
- **Colors**: Pure grayscale (no color)
- **Best For**: Focus work, reducing visual noise, accessibility

### 4. Dark + Standard (Default)
- **Use Case**: Classic dark mode for low-light environments
- **Colors**: Dark backgrounds with subtle light accents
- **Best For**: Night work, reducing eye strain

### 5. Dark + Colorful
- **Use Case**: Dark mode with vibrant accents
- **Colors**: Dark backgrounds with bright blue, purple, pink accents
- **Best For**: Creative work in low-light, modern aesthetic

### 6. Dark + Monotone
- **Use Case**: Pure grayscale dark mode
- **Colors**: Dark grays with no color
- **Best For**: Maximum focus, terminal-like aesthetic, accessibility

---

## Adding New Color Schemes

To add a new color scheme (e.g., "warm" or "cool"):

### 1. Update Type Definition

```typescript
// In theme-config.ts
export type ColorScheme = 'standard' | 'colorful' | 'monotone' | 'warm';
```

### 2. Add Metadata

```typescript
export const COLOR_SCHEME_INFO: Record<ColorScheme, ColorSchemeMetadata> = {
  // ... existing schemes
  warm: {
    name: 'Warm',
    description: 'Warm oranges and browns',
  },
};
```

### 3. Define Colors

```typescript
const THEME_COLORS: Record<BaseTheme, Record<ColorScheme, ThemeColors>> = {
  light: {
    // ... existing schemes
    warm: {
      background: '30 40% 98%',
      foreground: '30 40% 10%',
      primary: '25 95% 53%',
      // ... all other color properties
    }
  },
  dark: {
    // ... existing schemes
    warm: {
      background: '30 20% 12%',
      foreground: '30 20% 98%',
      primary: '25 95% 53%',
      // ... all other color properties
    }
  }
};
```

### 4. Test All Combinations

Ensure the new scheme works with both light and dark base themes.

---

## Troubleshooting

### Theme Not Applying

1. **Check ThemeProvider**: Ensure `ThemeProvider` wraps your app in `layout.tsx`
2. **Check localStorage**: Clear browser localStorage if theme seems stuck
3. **Check CSS Variables**: Verify variables are defined in `globals.css`
4. **Check Component Classes**: Ensure components use theme-aware classes (e.g., `bg-background` not `bg-white`)

### Hardcoded Colors

If a component doesn't respond to theme changes:

1. Search for hardcoded colors: `bg-[#...]` or `text-[#...]`
2. Replace with theme variables: `bg-background`, `text-foreground`, etc.
3. For sidebars: Use `bg-sidebar`, `text-sidebar-foreground`

### Example Fix

```tsx
// ❌ Bad: Hardcoded colors
<div className="bg-[#1c1c1c] text-[#dbdbdb]">

// ✅ Good: Theme-aware
<div className="bg-sidebar text-sidebar-foreground">
```

---

## Best Practices

### 1. Always Use Theme Variables

```tsx
// ✅ Good
<div className="bg-background text-foreground border-border">

// ❌ Bad
<div className="bg-white text-black border-gray-300">
```

### 2. Use Semantic Color Names

```tsx
// ✅ Good - Semantic meaning
<button className="bg-primary text-primary-foreground">

// ❌ Bad - Specific color
<button className="bg-blue-500 text-white">
```

### 3. Test All Theme Combinations

When adding new components, test with:
- Light + Standard
- Dark + Standard
- Light + Colorful
- Dark + Colorful
- Light + Monotone
- Dark + Monotone

### 4. Respect User Preferences

```typescript
// Don't force a theme
// ❌ setBaseTheme('dark');

// Let users choose
// ✅ const { baseTheme } = useTheme();
```

---

## API Reference

### `useTheme()` Hook

```typescript
const {
  baseTheme,              // Current base theme ('light' | 'dark')
  colorScheme,            // Current color scheme ('standard' | 'colorful' | 'monotone')
  setBaseTheme,           // Function to change base theme
  setColorScheme,         // Function to change color scheme
  toggleBaseTheme,        // Toggle between light and dark
  availableBaseThemes,    // Array of available base themes
  availableColorSchemes,  // Array of available color schemes
  isDarkMode              // Boolean: true if dark mode
} = useTheme();
```

### Theme Configuration Functions

```typescript
// Get all base themes
const themes = getBaseThemes(); // ['light', 'dark']

// Get all color schemes
const schemes = getColorSchemes(); // ['standard', 'colorful', 'monotone']

// Get colors for a configuration
const colors = getThemeColors({ 
  baseTheme: 'dark', 
  colorScheme: 'colorful' 
});

// Get scheme info
const info = getColorSchemeInfo('colorful');
// { name: 'Colorful', description: 'Vibrant blues, purples, and pinks' }

// Check if theme is dark
const isDark = isThemeDark('dark'); // true

// Apply theme (usually called by ThemeProvider)
applyThemeConfig({ baseTheme: 'dark', colorScheme: 'colorful' });
```

---

## Migration from Old System

If migrating from a single-theme system:

### Old System
```typescript
const { theme, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'colorful' | 'monotone'
```

### New System
```typescript
const { baseTheme, colorScheme, setBaseTheme, setColorScheme } = useTheme();
// baseTheme: 'light' | 'dark'
// colorScheme: 'standard' | 'colorful' | 'monotone'
```

### Migration Steps

1. Replace `theme` with `baseTheme` and `colorScheme`
2. Replace `setTheme('dark')` with `setBaseTheme('dark')`
3. Add color scheme selection: `setColorScheme('colorful')`
4. Update localStorage keys if needed

---

## Performance Considerations

### CSS Variable Updates

Theme changes apply CSS variables to the document root, which is very performant:

```typescript
// Single DOM operation updates all themed elements
document.documentElement.style.setProperty('--background', '0 0% 9%');
```

### Persistence

- localStorage reads/writes are minimal (only on theme change)
- No network requests required
- Theme applies instantly on page load

### Hydration

The ThemeProvider prevents hydration mismatches by:
1. Not rendering children until mounted
2. Reading localStorage only on client side
3. Applying theme before first paint

---

## Accessibility

### Color Contrast

All theme combinations maintain WCAG AA contrast ratios:
- Text on background: ≥ 4.5:1
- Large text: ≥ 3:1
- UI components: ≥ 3:1

### Monotone Scheme

The monotone scheme is particularly useful for:
- Users with color blindness
- High contrast preferences
- Screen reader users (reduces visual noise)

### Keyboard Navigation

Theme controls in settings are fully keyboard accessible:
- Tab to navigate between options
- Enter/Space to select
- Focus indicators visible in all themes

---

## Future Enhancements

Potential additions to the theming system:

1. **Custom Color Schemes**: Allow users to create their own color palettes
2. **Auto Theme**: Switch based on system preferences or time of day
3. **Theme Presets**: Save and share theme combinations
4. **Per-Workspace Themes**: Different themes for different projects
5. **Animation Preferences**: Respect `prefers-reduced-motion`
6. **High Contrast Mode**: Additional accessibility option

---

## Support

For issues or questions about the theming system:

1. Check this documentation
2. Review `theme-config.ts` for color definitions
3. Inspect CSS variables in browser DevTools
4. Test with different theme combinations
5. Check console for theme-related errors

---

## Summary

The PM_NET theming system provides:

✅ **Flexibility**: 6 theme combinations from 2 independent settings  
✅ **Consistency**: All colors defined via CSS variables  
✅ **Persistence**: User preferences saved across sessions  
✅ **Performance**: Instant theme switching with no page reload  
✅ **Accessibility**: WCAG AA compliant with monotone option  
✅ **Extensibility**: Easy to add new color schemes  

Users can mix and match base themes (light/dark) with color schemes (standard/colorful/monotone) to create their perfect workspace aesthetic.
