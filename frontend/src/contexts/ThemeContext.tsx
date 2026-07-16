import React, { createContext, useContext, useEffect, useState } from "react";
import { HospitalConfig } from "../types/hospital";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  hospitalConfig: HospitalConfig | null;
  setHospitalConfig: (config: HospitalConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default configuration for a demo white-label hospital
const defaultHospital: HospitalConfig = {
  id: "default-hosp",
  slug: "st-jude",
  domain: "stjude.hospital.ai",
  branding: {
    name: "St. Jude AI Hospital",
    shortName: "St. Jude",
    colors: {
      primary: "221.2 83.2% 53.3%", // Indigo/Blue
      secondary: "210 40% 96.1%",
      accent: "262.1 83.3% 57.8%", // Purple Accent
    },
  },
  modules: {
    aiDiagnosis: true,
    whatsappNotifications: true,
    patientQueue: true,
    billingSystem: true,
    telemedicine: false,
  },
  contact: {
    email: "contact@stjudeai.org",
    phone: "+1 (555) 019-2834",
    address: "789 Care Lane, MedCity",
    website: "https://stjudeai.org",
  },
  features: {
    maxAIPromptsPerDay: 500,
    maxQueueCapacity: 100,
    allowSelfCheckIn: true,
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const [hospitalConfig, setHospitalConfigState] = useState<HospitalConfig>(defaultHospital);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle white-label HSL style injections dynamically
  useEffect(() => {
    if (!hospitalConfig) return;
    const root = window.document.documentElement;
    const { primary, secondary, accent } = hospitalConfig.branding.colors;

    root.style.setProperty("--primary", primary);
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--accent", accent);
  }, [hospitalConfig]);

  const setHospitalConfig = (config: HospitalConfig) => {
    setHospitalConfigState(config);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, hospitalConfig, setHospitalConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
