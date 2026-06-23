import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API } from "./AuthContext";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext({});

export const DEFAULT_SETTINGS = {
  clinic_name: "MedConsulta",
  clinic_specialty: "Medicina General",
  clinic_address: "",
  clinic_phone: "",
  clinic_email: "",
  clinic_logo_url: "",
  license_number: "",
  _v: 0
};

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings({ ...DEFAULT_SETTINGS, ...data, _v: Date.now() });
    } catch {
      // keep defaults
    }
  };

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
