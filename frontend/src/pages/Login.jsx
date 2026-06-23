import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, Stethoscope } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Credenciales incorrectas. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left - Form */}
      <div className="w-full lg:w-5/12 flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-12">
        <div className="max-w-sm mx-auto w-full">
          {/* Logo */}
          <div className="mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-5 shadow-sm">
              <Stethoscope size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
              MedConsulta
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">Sistema de gestión para consultorios médicos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium text-sm">Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@consultorio.com"
                className="h-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                data-testid="login-email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium text-sm">Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-11 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  data-testid="login-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
              data-testid="login-submit"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            MedConsulta &copy; {new Date().getFullYear()} · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Right - Image */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%)"
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <h2 className="text-4xl font-bold mb-5 leading-tight" style={{ fontFamily: "Manrope" }}>
            Gestión médica<br />simple y eficiente
          </h2>
          <div className="space-y-4 mt-2">
            {[
              "Expedición de recetas médicas con impresión PDF",
              "Historial clínico completo de pacientes",
              "Control de inventario de medicamentos",
              "Múltiples usuarios con roles definidos",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <p className="text-blue-100 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
