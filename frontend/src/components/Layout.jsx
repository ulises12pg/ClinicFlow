import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { LayoutDashboard, Users, FileText, Pill, LogOut, Menu, UserCog, X, Sun, Moon, Settings, Calendar } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Panel Principal", path: "/dashboard", icon: LayoutDashboard },
  { label: "Pacientes", path: "/pacientes", icon: Users },
  { label: "Agenda", path: "/agenda", icon: Calendar },
  { label: "Recetas Médicas", path: "/recetas", icon: FileText },
  { label: "Inventario", path: "/inventario", icon: Pill },
];

const ROLE_LABELS = { admin: "Administrador", doctor: "Médico", nurse: "Enfermero/a" };

function SidebarContent({ user, onLogout, onClose, theme, toggleTheme, settings }) {
  const BACKEND = process.env.REACT_APP_BACKEND_URL;
  const logoSrc = settings?.has_logo ? `${BACKEND}/api/logo?v=${settings._v}` : null;
  const initial = (settings?.clinic_name || "M")[0].toUpperCase();
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo"
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 flex-shrink-0"
              onError={e => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base" style={{ fontFamily: "Manrope" }}>{initial}</span>
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-sm truncate max-w-[120px]" style={{ fontFamily: "Manrope" }}>
              {settings?.clinic_name || "MedConsulta"}
            </p>
            <p className="text-slate-400 text-xs">Sistema Médico</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white md:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/usuarios"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`
            }
          >
            <UserCog size={17} />
            Usuarios
          </NavLink>
        )}
        <NavLink
          to="/configuracion"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`
          }
        >
          <Settings size={17} />
          Configuración
        </NavLink>
      </nav>

      <div className="p-3 border-t border-slate-700">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          data-testid="theme-toggle-btn"
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-colors mb-1"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        </button>

        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-colors"
        >
          <LogOut size={15} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-slate-900 flex-col flex-shrink-0">
        <SidebarContent user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} settings={settings} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-slate-900 flex flex-col z-10">
            <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} theme={theme} toggleTheme={toggleTheme} settings={settings} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900"
            data-testid="mobile-menu-btn"
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-slate-900 text-sm truncate max-w-[160px]" style={{ fontFamily: "Manrope" }}>
            {settings?.clinic_name || "MedConsulta"}
          </span>
          {/* Mobile theme toggle */}
          <button
            onClick={toggleTheme}
            data-testid="mobile-theme-toggle"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
