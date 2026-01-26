import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleTheme: () => setDarkMode(!darkMode) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default if not in provider
    return { darkMode: true, setDarkMode: () => {}, toggleTheme: () => {} };
  }
  return context;
}

// Helper function to get theme-aware classes
export function getThemeClasses(darkMode) {
  return {
    // Backgrounds
    pageBg: darkMode ? "bg-slate-950" : "bg-gray-50",
    cardBg: darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200",
    inputBg: darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-300",
    
    // Text
    textPrimary: darkMode ? "text-white" : "text-gray-900",
    textSecondary: darkMode ? "text-white/70" : "text-gray-600",
    textMuted: darkMode ? "text-white/50" : "text-gray-500",
    
    // Buttons
    btnPrimary: darkMode 
      ? "bg-blue-600 hover:bg-blue-700 text-white" 
      : "bg-blue-600 hover:bg-blue-700 text-white",
    btnSecondary: darkMode 
      ? "bg-white/10 hover:bg-white/20 text-white border-white/10" 
      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300",
    
    // Status colors
    success: darkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700",
    warning: darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-700",
    danger: darkMode ? "bg-rose-500/20 text-rose-300" : "bg-rose-50 text-rose-700",
    info: darkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-700",
  };
}
