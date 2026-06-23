import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Settings, Save, Building2, Phone, MapPin, Mail,
  FileText, Image, Lock, Stethoscope, Upload, Trash2, CheckCircle2
} from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const isAdmin = user?.role === "admin";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Save all fields except has_logo and clinic_logo_url (managed by upload)
      const { has_logo, clinic_logo_url, ...payload } = form;
      await axios.put(`${API}/settings`, payload, { withCredentials: true });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  };

  const doUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Solo se permiten imágenes (JPG, PNG, WEBP, GIF, SVG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("El archivo no puede superar 5MB");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      // NOTE: do NOT set Content-Type manually — the browser must add
      // the multipart boundary parameter automatically.
      await axios.post(`${API}/upload/logo`, fd, {
        withCredentials: true,
      });
      await refreshSettings();
    } catch (err) {
      if (err.response?.status === 401) {
        setUploadError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
      } else {
        setUploadError(err.response?.data?.detail || "Error al subir la imagen");
      }
    } finally { setUploading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleRemoveLogo = async () => {
    try {
      await axios.put(`${API}/settings`, { 
        clinic_logo_url: "",
        clinic_logo_path: "" 
      }, { withCredentials: true });
      await refreshSettings();
    } catch (e) { console.error(e); }
  };

  const logoUrl = settings?.has_logo ? `${BACKEND}/api/logo?v=${settings._v}` : null;
  const previewLogoUrl = settings?.has_logo ? `${BACKEND}/api/logo?v=${settings._v}` : null;
  const initial = (form.clinic_name || "M")[0].toUpperCase();

  const Field = ({ label, icon: Icon, field, type = "text", placeholder = "", multiline = false }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-400" />}
        {label}
      </Label>
      {multiline ? (
        <Textarea
          value={form[field] || ""}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          disabled={!isAdmin}
          className="resize-none text-sm"
          rows={2}
          data-testid={`settings-${field}`}
        />
      ) : (
        <Input
          type={type}
          value={form[field] || ""}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          disabled={!isAdmin}
          className="h-10 text-sm"
          data-testid={`settings-${field}`}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6 page-enter max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
            <Settings size={22} className="text-blue-600" />
            Configuración
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Personaliza la información de tu consultorio</p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs">
            <Lock size={12} />
            Solo lectura (requiere rol Admin)
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Clinic Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
            <Building2 size={16} className="text-blue-600" />
            Información del Consultorio
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nombre del consultorio" field="clinic_name" placeholder="Ej: Consultorio Dr. García" />
            </div>
            <Field label="Especialidad" icon={Stethoscope} field="clinic_specialty" placeholder="Ej: Medicina General, Pediatría" />
            <Field label="Cédula Profesional" icon={FileText} field="license_number" placeholder="Ej: 12345678" />
            <Field label="Teléfono" icon={Phone} field="clinic_phone" placeholder="Ej: 555-000-0000" />
            <Field label="Correo electrónico" icon={Mail} field="clinic_email" type="email" placeholder="consultorio@ejemplo.com" />
            <div className="sm:col-span-2">
              <Field label="Dirección" icon={MapPin} field="clinic_address" placeholder="Calle, colonia, ciudad..." multiline />
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
            <Image size={16} className="text-blue-600" />
            Logo del Consultorio
          </h2>

          {/* Current Logo */}
          {settings?.has_logo && (
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <img
                src={previewLogoUrl}
                alt="Logo actual"
                className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Logo actual</p>
                <p className="text-xs text-slate-500">Aparece en el sidebar y en las recetas impresas</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar logo"
                  data-testid="remove-logo-btn"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}

          {/* Upload Zone */}
          {isAdmin && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                data-testid="logo-file-input"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
                data-testid="logo-upload-zone"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-600 font-medium">Subiendo imagen...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {settings?.has_logo ? "Cambiar logo" : "Subir logo"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Arrastra o haz clic · JPG, PNG, WEBP, SVG · Máx 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {uploadError && (
                <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full inline-block" />
                  {uploadError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Prescription Preview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
            <FileText size={16} className="text-blue-600" />
            Vista previa en recetas
          </h2>
          <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {settings?.has_logo ? (
                  <img src={previewLogoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-slate-200 bg-white p-0.5" />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={18} className="text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-base" style={{ fontFamily: "Manrope" }}>
                    {form.clinic_name || "Consultorio Médico"}
                  </p>
                  <p className="text-slate-500 text-xs">{form.clinic_specialty || "Medicina General"}</p>
                  {form.clinic_address && <p className="text-slate-400 text-xs">{form.clinic_address}</p>}
                  {(form.clinic_phone || form.clinic_email) && (
                    <p className="text-slate-400 text-xs">
                      {[form.clinic_phone, form.clinic_email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {form.license_number && (
                    <p className="text-slate-400 text-xs">Cédula: {form.license_number}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Receta Médica</p>
                <p className="text-xl font-bold text-blue-600" style={{ fontFamily: "Manrope" }}>Rx</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        {isAdmin && (
          <div className="flex items-center justify-between pb-4">
            <div>
              {saved && (
                <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5" data-testid="settings-saved-msg">
                  <CheckCircle2 size={15} />
                  Cambios guardados correctamente
                </span>
              )}
              {error && <span className="text-red-600 text-sm">{error}</span>}
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-5"
              data-testid="save-settings-btn"
            >
              <Save size={15} className="mr-1.5" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
