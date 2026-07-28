import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Eye, EyeOff, Stethoscope, Sparkles, ShieldCheck, MessageSquare, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Estados para el Modal de WhatsApp de Solicitar Acceso Admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Plan Mensual (Suscripción)");
  const DEVELOPER_WHATSAPP = process.env.REACT_APP_DEVELOPER_WHATSAPP || "527712323897";

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

  const handleQuickDemoLogin = async () => {
    const demoEmail = "demo@medconsulta.com";
    const demoPw = "Demo123!";
    setEmail(demoEmail);
    setPassword(demoPw);
    setError("");
    setLoading(true);
    try {
      await login(demoEmail, demoPw);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Credenciales incorrectas. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = DEVELOPER_WHATSAPP.replace(/[^0-9]/g, "");
    const message = `¡Hola! 👋 Me interesa solicitar acceso de *Administrador* para el sistema *MedConsulta / ClinicFlow*.\n\n📌 *Detalles de la Solicitud:*\n• *Nombre / Consultorio:* ${contactName || "No especificado"}\n• *Plan de Interés:* ${subscriptionPlan}\n\n¿Me podrías brindar más información sobre los detalles de la suscripción y activación de la cuenta Admin? ¡Gracias!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setShowAdminModal(false);
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

          {/* Accesos Rápidos: Demo y Solicitud Admin */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Opciones de acceso y demostración</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="w-full h-11 border-amber-300 bg-amber-50/60 hover:bg-amber-100/80 text-amber-900 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
              data-testid="login-demo-btn"
            >
              <Sparkles size={16} className="text-amber-600" />
              Ingresar como Usuario Demo
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdminModal(true)}
              className="w-full h-11 border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
              data-testid="login-admin-request-btn"
            >
              <ShieldCheck size={17} className="text-blue-600" />
              Solicitar Acceso Administrador (WhatsApp)
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-3">
            Demo: Acceso restringido · Admin: Activación mediante suscripción
          </p>

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

      {/* Modal para solicitar Acceso Admin vía WhatsApp */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="sm:max-w-sm bg-white p-5 gap-0">
          <DialogHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
                Solicitar Acceso Admin
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">Formulario para solicitar acceso de administrador</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Beneficios */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" /> Gestión de Usuarios</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" /> Control Inventario</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" /> Recetas & PDF</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" /> Soporte & Respaldo</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-medium text-xs">Nombre / Consultorio</Label>
              <Input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej. Dr. Carlos Mendoza"
                className="h-9 text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-medium text-xs">Plan de Interés</Label>
              <select
                value={subscriptionPlan}
                onChange={(e) => setSubscriptionPlan(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Plan Mensual (Suscripción)">Plan Mensual</option>
                <option value="Plan Anual (Con Descuento)">Plan Anual (Con Descuento)</option>
                <option value="Licencia Completa / Personalizada">Licencia Completa</option>
                <option value="Solicitud de Informes Generales">Solo Informes</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdminModal(false)}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSendWhatsApp}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2"
            >
              <MessageSquare size={15} />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
