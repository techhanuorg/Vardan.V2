export interface HospitalBranding {
  name: string;
  shortName: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  colors: {
    primary: string; // HSL color code e.g. "221.2 83.2% 53.3%"
    secondary: string;
    accent: string;
  };
}

export interface HospitalModuleConfig {
  aiDiagnosis: boolean;
  whatsappNotifications: boolean;
  patientQueue: boolean;
  billingSystem: boolean;
  telemedicine: boolean;
}

export interface HospitalContactInfo {
  email: string;
  phone: string;
  address: string;
  website: string;
}

export interface HospitalConfig {
  id: string;
  slug: string;
  domain: string;
  branding: HospitalBranding;
  modules: HospitalModuleConfig;
  contact: HospitalContactInfo;
  features: {
    maxAIPromptsPerDay: number;
    maxQueueCapacity: number;
    allowSelfCheckIn: boolean;
  };
}
