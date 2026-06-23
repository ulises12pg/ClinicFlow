import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Printer, User, Stethoscope } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PrescriptionDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const BACKEND = process.env.REACT_APP_BACKEND_URL;
  const logoSrc = settings?.has_logo ? `${BACKEND}/api/logo` : null;
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    axios.get(`${API}/prescriptions/${id}`, { withCredentials: true })
      .then(r => { setRx(r.data); setStatus(r.data.status); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (searchParams.get("print") === "1" && rx) {
      setTimeout(() => window.print(), 500);
    }
  }, [rx, searchParams]);

  const handleStatusChange = async (val) => {
    setStatus(val);
    setUpdating(true);
    try {
      await axios.put(`${API}/prescriptions/${id}`, { status: val }, { withCredentials: true });
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!rx) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Receta no encontrada</p>
      <Button onClick={() => navigate("/recetas")} variant="outline" className="mt-3">Volver</Button>
    </div>
  );

  const age = calcAge(rx.patient_dob);
  const printDate = new Date(rx.date + "T12:00:00").toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric"
  });

  return (
    <div className="space-y-5 page-enter">
      {/* Toolbar - hidden on print */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm"
          data-testid="back-from-rx"
        >
          <ArrowLeft size={15} /> Regresar
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Estado:</span>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 w-36 text-sm" data-testid="rx-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            data-testid="print-rx-btn"
          >
            <Printer size={15} className="mr-1.5" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Prescription Content - Printable */}
      <div id="prescription-print-content" className="bg-white rounded-xl border border-slate-200 shadow-sm">

        {/* Print Header */}
        <div className="p-6 md:p-8 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {settings?.clinic_logo_url ? (
                  <img src={logoSrc} alt="Logo" className="w-11 h-11 rounded-lg object-contain border border-slate-200 p-0.5" onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={20} className="text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Manrope" }}>
                    {settings?.clinic_name || "Consultorio Médico"}
                  </p>
                  <p className="text-slate-500 text-sm">{settings?.clinic_specialty || rx.doctor_specialization}</p>
                  {settings?.clinic_address && <p className="text-slate-400 text-xs">{settings.clinic_address}</p>}
                  {(settings?.clinic_phone || settings?.clinic_email) && (
                    <p className="text-slate-400 text-xs">{[settings.clinic_phone, settings.clinic_email].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </div>
              <div className="mt-1 pl-0">
                <p className="font-semibold text-slate-800 text-sm">Dr. {rx.doctor_name}</p>
                <p className="text-slate-500 text-xs">{rx.doctor_specialization}</p>
                {settings?.license_number && <p className="text-slate-400 text-xs">Cédula: {settings.license_number}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Receta Médica</p>
              <p className="text-2xl font-bold text-blue-600 mt-1" style={{ fontFamily: "Manrope" }}>Rx</p>
              <p className="text-slate-500 text-sm mt-1">{printDate}</p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="px-6 md:px-8 py-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <User size={15} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos del Paciente</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <span className="text-xs text-slate-400">Nombre: </span>
              <span className="text-sm font-semibold text-slate-800">{rx.patient_name}</span>
            </div>
            {age && (
              <div>
                <span className="text-xs text-slate-400">Edad: </span>
                <span className="text-sm font-medium text-slate-700">{age} años</span>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400">Fecha: </span>
              <span className="text-sm font-medium text-slate-700">{printDate}</span>
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Diagnóstico</p>
          <p className="text-slate-800 font-medium">{rx.diagnosis}</p>
        </div>

        {/* Medications */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Medicamentos Prescritos</p>
          <div className="space-y-4">
            {rx.medications?.map((med, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{med.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <span className="text-sm text-slate-600"><span className="text-slate-400 text-xs">Dosis:</span> {med.dosage}</span>
                    <span className="text-sm text-slate-600"><span className="text-slate-400 text-xs">Frecuencia:</span> {med.frequency}</span>
                    <span className="text-sm text-slate-600"><span className="text-slate-400 text-xs">Duración:</span> {med.duration}</span>
                  </div>
                  {med.instructions && (
                    <p className="text-sm text-slate-500 mt-1 italic">{med.instructions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {rx.notes && (
          <div className="px-6 md:px-8 py-5 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notas e Indicaciones</p>
            <p className="text-slate-700 text-sm leading-relaxed">{rx.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="px-6 md:px-8 py-6">
          <div className="flex justify-end">
            <div className="text-center min-w-48">
              <div className="border-t-2 border-slate-700 pt-2 mt-12">
                <p className="font-semibold text-slate-800 text-sm">Dr. {rx.doctor_name}</p>
                <p className="text-slate-500 text-xs">{rx.doctor_specialization}</p>
                <p className="text-slate-400 text-xs mt-0.5">Firma y Sello</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
