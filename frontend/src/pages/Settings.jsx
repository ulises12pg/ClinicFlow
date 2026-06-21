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
  FileText, Image, Lock, Stethoscope, Upload, Trash2, CheckCircle2,
  Download, UploadCloud, Database, History, Shield, AlertTriangle,
  Archive, Clock, Users, Pill, Calendar, FileDown, FileUp, X, Check
} from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const Field = ({ label, icon: Icon, field, type = "text", placeholder = "", multiline = false, value, onChange, disabled }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
      {Icon && <Icon size={13} className="text-slate-400" />}
      {label}
    </Label>
    {multiline ? (
      <Textarea
        value={value || ""}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none text-sm"
        rows={2}
        data-testid={`settings-${field}`}
      />
    ) : (
      <Input
        type={type}
        value={value || ""}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 text-sm"
        data-testid={`settings-${field}`}
      />
    )}
  </div>
);

// Collection name labels in Spanish
const COLLECTION_LABELS = {
  users: { label: "Usuarios", icon: Users },
  patients: { label: "Pacientes", icon: Users },
  prescriptions: { label: "Recetas", icon: FileText },
  inventory: { label: "Inventario", icon: Pill },
  appointments: { label: "Citas", icon: Calendar },
  settings: { label: "Configuración", icon: Settings },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const isAdmin = user?.role === "admin";
  const fileInputRef = useRef(null);
  const backupFileRef = useRef(null);

  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Backup state
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState("merge");
  const [importDragOver, setImportDragOver] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pendingImportFile, setPendingImportFile] = useState(null);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  // Load backup info when admin opens page
  useEffect(() => {
    if (isAdmin) fetchBackupInfo();
  }, [isAdmin]);

  const fetchBackupInfo = async () => {
    setBackupLoading(true);
    try {
      const { data } = await axios.get(`${API}/backup/info`, { withCredentials: true });
      setBackupInfo(data);
    } catch {
      // silent
    } finally {
      setBackupLoading(false);
    }
  };

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

  const handleFieldChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // ===== BACKUP HANDLERS =====
  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    try {
      const response = await axios.post(`${API}/backup/export`, {}, {
        withCredentials: true,
        responseType: "blob",
      });
      
      // Extract filename from Content-Disposition header
      const disposition = response.headers["content-disposition"];
      let filename = "respaldo_clinicflow.zip";
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      // Download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
      // Refresh info to update history
      fetchBackupInfo();
    } catch (err) {
      setImportError(err.response?.data?.detail || "Error al exportar el respaldo");
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setImportError("Solo se permiten archivos ZIP de respaldo");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setImportError("El archivo no puede superar 50MB");
      return;
    }
    
    if (importMode === "replace") {
      // Show confirmation dialog
      setPendingImportFile(file);
      setShowConfirmDialog(true);
      setConfirmText("");
    } else {
      doImport(file, "merge");
    }
  };

  const doImport = async (file, mode) => {
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      if (mode === "replace") {
        fd.append("confirmation", "CONFIRMAR");
      }
      
      const { data } = await axios.post(`${API}/backup/import`, fd, {
        withCredentials: true,
      });
      
      setImportResult(data);
      fetchBackupInfo();
      // Refresh settings in case they changed
      await refreshSettings();
    } catch (err) {
      setImportError(err.response?.data?.detail || "Error al importar el respaldo");
    } finally {
      setImporting(false);
      setPendingImportFile(null);
      setShowConfirmDialog(false);
    }
  };

  const handleBackupFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
    e.target.value = "";
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    setImportDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("es-MX", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch { return isoString; }
  };

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
              <Field label="Nombre del consultorio" field="clinic_name" placeholder="Ej: Consultorio Dr. García" value={form.clinic_name} onChange={handleFieldChange} disabled={!isAdmin} />
            </div>
            <Field label="Especialidad" icon={Stethoscope} field="clinic_specialty" placeholder="Ej: Medicina General, Pediatría" value={form.clinic_specialty} onChange={handleFieldChange} disabled={!isAdmin} />
            <Field label="Cédula Profesional" icon={FileText} field="license_number" placeholder="Ej: 12345678" value={form.license_number} onChange={handleFieldChange} disabled={!isAdmin} />
            <Field label="Teléfono" icon={Phone} field="clinic_phone" placeholder="Ej: 555-000-0000" value={form.clinic_phone} onChange={handleFieldChange} disabled={!isAdmin} />
            <Field label="Correo electrónico" icon={Mail} field="clinic_email" type="email" placeholder="consultorio@ejemplo.com" value={form.clinic_email} onChange={handleFieldChange} disabled={!isAdmin} />
            <div className="sm:col-span-2">
              <Field label="Dirección" icon={MapPin} field="clinic_address" placeholder="Calle, colonia, ciudad..." multiline value={form.clinic_address} onChange={handleFieldChange} disabled={!isAdmin} />
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

      {/* =================== BACKUP SECTION =================== */}
      {isAdmin && (
        <div className="space-y-5 pb-8">
          {/* Section Divider */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={12} />
              Respaldos y Seguridad
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          </div>

          {/* System Stats */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
              <Database size={16} className="text-blue-600" />
              Estado del Sistema
            </h2>
            {backupLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : backupInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(backupInfo.counts || {}).map(([key, count]) => {
                    const meta = COLLECTION_LABELS[key] || { label: key, icon: Database };
                    const ColIcon = meta.icon;
                    return (
                      <div key={key} className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-7 h-7 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                          <ColIcon size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-900 leading-none" style={{ fontFamily: "Manrope" }}>{count}</p>
                          <p className="text-xs text-slate-500">{meta.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  <Archive size={12} />
                  Total: <span className="font-semibold text-slate-700">{backupInfo.total_records}</span> registros
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No se pudo cargar la información del sistema</p>
            )}
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
              <FileDown size={16} className="text-emerald-600" />
              Exportar Respaldo
            </h2>
            <p className="text-sm text-slate-500">
              Descarga un archivo ZIP con todos los datos del sistema: pacientes, recetas, inventario, citas, usuarios y configuración.
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5"
                data-testid="export-backup-btn"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={15} className="mr-1.5" />
                    Exportar Respaldo
                  </>
                )}
              </Button>
              {exportSuccess && (
                <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 size={15} />
                  Respaldo descargado correctamente
                </span>
              )}
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
              <FileUp size={16} className="text-amber-600" />
              Importar Respaldo
            </h2>

            {/* Mode Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Modo de importación</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                    importMode === "merge"
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                  data-testid="import-mode-merge"
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      importMode === "merge" ? "border-blue-500 bg-blue-500" : "border-slate-300"
                    }`}>
                      {importMode === "merge" && <Check size={10} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Combinar (Merge)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agrega los datos del respaldo sin eliminar los existentes. No duplica usuarios con el mismo email.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                    importMode === "replace"
                      ? "border-red-400 bg-red-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50"
                  }`}
                  data-testid="import-mode-replace"
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      importMode === "replace" ? "border-red-500 bg-red-500" : "border-slate-300"
                    }`}>
                      {importMode === "replace" && <Check size={10} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Reemplazar (Replace)</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="text-red-600 font-medium">⚠ Elimina TODOS</span> los datos existentes antes de importar. Requiere confirmación.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Import Drop Zone */}
            <div>
              <input
                ref={backupFileRef}
                type="file"
                accept=".zip"
                onChange={handleBackupFileChange}
                className="hidden"
                data-testid="backup-file-input"
              />
              <div
                onClick={() => backupFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
                onDragLeave={() => setImportDragOver(false)}
                onDrop={handleImportDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  importDragOver
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50"
                }`}
                data-testid="backup-upload-zone"
              >
                {importing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-amber-600"></div>
                    <p className="text-sm text-amber-600 font-medium">Importando respaldo...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <UploadCloud size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Seleccionar archivo de respaldo
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Arrastra o haz clic · Archivo ZIP · Máx 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import Error */}
            {importError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Error al importar</p>
                  <p className="text-xs text-red-600 mt-0.5">{importError}</p>
                </div>
                <button onClick={() => setImportError("")} className="ml-auto text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">{importResult.message}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(importResult.summary?.imported || {}).map(([key, count]) => {
                    const meta = COLLECTION_LABELS[key] || { label: key };
                    const skipped = importResult.summary?.skipped?.[key] || 0;
                    return (
                      <div key={key} className="text-xs bg-white px-2.5 py-2 rounded-lg border border-emerald-100">
                        <p className="font-medium text-slate-700">{meta.label}</p>
                        <p className="text-emerald-700">
                          <span className="font-semibold">{count}</span> importados
                          {skipped > 0 && <span className="text-slate-400 ml-1">· {skipped} omitidos</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {importResult.summary?.errors?.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                    <p className="font-medium">Advertencias:</p>
                    {importResult.summary.errors.map((e, i) => <p key={i}>• {e}</p>)}
                  </div>
                )}
                <button
                  onClick={() => setImportResult(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  Cerrar resumen
                </button>
              </div>
            )}
          </div>

          {/* Backup History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm" style={{ fontFamily: "Manrope" }}>
              <History size={16} className="text-violet-600" />
              Historial de Respaldos
            </h2>
            {backupInfo?.history?.length > 0 ? (
              <div className="space-y-2">
                {backupInfo.history.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      h.type === "export" ? "bg-emerald-100" : "bg-amber-100"
                    }`}>
                      {h.type === "export" ? (
                        <FileDown size={14} className="text-emerald-600" />
                      ) : (
                        <FileUp size={14} className="text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {h.type === "export" ? "Exportación" : `Importación (${h.mode || "merge"})`}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          h.type === "export" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {h.type === "export" ? "Export" : "Import"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(h.created_at)}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">
                          por {h.exported_by || h.imported_by || "—"}
                        </span>
                        {h.records != null && (
                          <>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{h.records} registros</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <History size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay historial de respaldos</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exporta tu primer respaldo para comenzar
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CONFIRMATION DIALOG (Replace Mode) ===== */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowConfirmDialog(false); setPendingImportFile(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Manrope" }}>
                  Confirmar Reemplazo Total
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Esta acción <span className="font-bold text-red-600">eliminará TODOS los datos existentes</span> (pacientes, recetas, inventario, citas, usuarios y configuración) y los reemplazará con los del archivo importado.
                </p>
                <p className="text-sm text-red-600 font-medium mt-2">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Escribe <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">CONFIRMAR</span> para continuar:
              </Label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe CONFIRMAR aquí"
                className="h-10 text-sm border-slate-300 focus:border-red-400 focus:ring-red-400"
                autoFocus
                data-testid="confirm-replace-input"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={() => { setShowConfirmDialog(false); setPendingImportFile(null); setConfirmText(""); }}
                variant="outline"
                className="flex-1 h-10 border-slate-300"
                data-testid="cancel-replace-btn"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (pendingImportFile) doImport(pendingImportFile, "replace");
                }}
                disabled={confirmText !== "CONFIRMAR" || importing}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                data-testid="confirm-replace-btn"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} className="mr-1.5" />
                    Reemplazar Todo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
