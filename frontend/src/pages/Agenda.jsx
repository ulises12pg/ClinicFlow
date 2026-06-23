import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Calendar } from "../components/ui/calendar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { es } from "date-fns/locale";
import {
  Plus, Clock, User, Calendar as CalIcon, FileText, Edit2, Trash2,
  CheckCheck, Search, ChevronRight
} from "lucide-react";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

// ── Constants ──────────────────────────────────────────
const APPT_TYPES = [
  { value: "consulta",    label: "Consulta General",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "seguimiento", label: "Seguimiento",        cls: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "urgencia",    label: "Urgencia",           cls: "bg-red-50 text-red-700 border-red-200" },
  { value: "preventiva",  label: "Preventiva",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];
const STATUS_OPTIONS = [
  { value: "programada",  label: "Programada",  cls: "bg-blue-50 text-blue-700"    },
  { value: "confirmada",  label: "Confirmada",  cls: "bg-emerald-50 text-emerald-700" },
  { value: "completada",  label: "Completada",  cls: "bg-slate-100 text-slate-600"  },
  { value: "cancelada",   label: "Cancelada",   cls: "bg-red-50 text-red-600"       },
];
const DURATIONS = [15, 20, 30, 45, 60, 90];
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 7; h <= 20; h++) {
    for (let m of [0, 15, 30, 45]) {
      if (h === 20 && m > 30) break;
      slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  return slots;
})();

// ── Helpers ────────────────────────────────────────────
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const toMonthStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
const displayDay = (dateStr) =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
const typeInfo = (v) => APPT_TYPES.find(t => t.value === v) || APPT_TYPES[0];
const statusInfo = (v) => STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0];

const emptyForm = { patient_id: "", patient_name: "", date: "", time: "09:00", duration: 30, type: "consulta", notes: "" };

// ── Component ──────────────────────────────────────────
export default function Agenda() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const [selected, setSelected]       = useState(today);
  const [calMonth, setCalMonth]       = useState(today);
  const [monthAppts, setMonthAppts]   = useState([]);
  const [dayAppts, setDayAppts]       = useState([]);
  const [loadingDay, setLoadingDay]   = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editAppt, setEditAppt]       = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [patients, setPatients] = useState([]);
  const [ptSearch, setPtSearch] = useState("");
  const [showPtList, setShowPtList] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Fetch helpers ─────────────────────────────────────
  const fetchMonth = useCallback(async (month) => {
    try {
      const { data } = await axios.get(`${API}/appointments?month=${month}`, { withCredentials: true });
      setMonthAppts(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchDay = useCallback(async (dateStr) => {
    setLoadingDay(true);
    try {
      const { data } = await axios.get(`${API}/appointments?date=${dateStr}`, { withCredentials: true });
      setDayAppts(data);
    } catch (e) { console.error(e); }
    finally { setLoadingDay(false); }
  }, []);

  useEffect(() => { fetchMonth(toMonthStr(calMonth)); }, [calMonth, fetchMonth]);
  useEffect(() => { fetchDay(toDateStr(selected)); }, [selected, fetchDay]);

  // ── Patient search ────────────────────────────────────
  useEffect(() => {
    if (!ptSearch || ptSearch.length < 1) { setPatients([]); return; }
    const t = setTimeout(async () => {
      const { data } = await axios.get(`${API}/patients?search=${encodeURIComponent(ptSearch)}`, { withCredentials: true });
      setPatients(data); setShowPtList(true);
    }, 300);
    return () => clearTimeout(t);
  }, [ptSearch]);

  // ── Calendar modifiers ────────────────────────────────
  const apptDateObjs = [...new Set(monthAppts.map(a => a.date))].map(d => new Date(d + "T12:00:00"));
  const urgentDates  = [...new Set(monthAppts.filter(a => a.type === "urgencia").map(a => a.date))].map(d => new Date(d + "T12:00:00"));

  // ── Dialog helpers ────────────────────────────────────
  const openCreate = (dateStr) => {
    setEditAppt(null);
    setForm({ ...emptyForm, date: dateStr });
    setPtSearch(""); setPatients([]); setShowPtList(false);
    setError(""); setDialogOpen(true);
  };

  const openEdit = (appt) => {
    setEditAppt(appt);
    setForm({ patient_id: appt.patient_id, patient_name: appt.patient_name, date: appt.date,
              time: appt.time, duration: appt.duration, type: appt.type, notes: appt.notes || "" });
    setPtSearch(appt.patient_name); setPatients([]); setShowPtList(false);
    setError(""); setDialogOpen(true);
  };

  const selectPatient = (p) => {
    setForm(f => ({ ...f, patient_id: p.id, patient_name: p.name }));
    setPtSearch(p.name); setPatients([]); setShowPtList(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.patient_id) { setError("Selecciona un paciente"); return; }
    if (!form.date || !form.time) { setError("Fecha y hora son requeridas"); return; }

    const apptDateTime = new Date(`${form.date}T${form.time}:00`);
    const limitTime = new Date();
    limitTime.setHours(limitTime.getHours() + 7);
    
    if (apptDateTime < limitTime) { 
      setError("La cita debe programarse con al menos 7 horas de anticipación"); 
      return; 
    }

    setSaving(true); setError("");
    try {
      if (editAppt) {
        await axios.put(`${API}/appointments/${editAppt.id}`, form, { withCredentials: true });
      } else {
        await axios.post(`${API}/appointments`, form, { withCredentials: true });
      }
      setDialogOpen(false);
      fetchMonth(toMonthStr(calMonth));
      fetchDay(form.date);
      if (form.date !== toDateStr(selected)) {
        setSelected(new Date(form.date + "T12:00:00"));
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.post(`${API}/appointments/${deleteId}/delete`, {}, { withCredentials: true });
      fetchMonth(toMonthStr(calMonth));
      fetchDay(toDateStr(selected));
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "Error al eliminar");
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatus = async (id, status) => {
    await axios.put(`${API}/appointments/${id}`, { status }, { withCredentials: true });
    fetchDay(toDateStr(selected));
    fetchMonth(toMonthStr(calMonth));
  };


  const selectedStr = toDateStr(selected);
  const isToday = selectedStr === toDateStr(today);

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Agenda Médica</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {today.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => openCreate(selectedStr)}
          className="bg-blue-600 hover:bg-blue-700 text-white h-10"
          data-testid="new-appt-btn">
          <Plus size={16} className="mr-1.5" /> Nueva Cita
        </Button>
      </div>

      {/* Main grid */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left: Calendar ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:w-72 flex-shrink-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            onMonthChange={(m) => setCalMonth(m)}
            locale={es}
            modifiers={{ hasAppt: apptDateObjs, urgent: urgentDates }}
            modifiersClassNames={{ hasAppt: "day-has-appt", urgent: "day-urgent" }}
            classNames={{
              day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
              day_today: "bg-blue-50 text-blue-600 font-bold",
            }}
            className="w-full"
          />

          {/* Month summary */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Este mes</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total citas</span>
              <span className="font-semibold text-slate-800">{monthAppts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Urgencias</span>
              <span className="font-semibold text-red-600">{monthAppts.filter(a => a.type === "urgencia").length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Completadas</span>
              <span className="font-semibold text-emerald-600">{monthAppts.filter(a => a.status === "completada").length}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Day appointments ── */}
        <div className="flex-1 min-w-0">
          {/* Day header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 capitalize" style={{ fontFamily: "Manrope" }}>
                {isToday ? "Hoy — " : ""}{displayDay(selectedStr)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""} programada{dayAppts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openCreate(selectedStr)}
              className="h-8 text-xs border-slate-300" data-testid="new-appt-day-btn">
              <Plus size={13} className="mr-1" /> Agregar
            </Button>
          </div>

          {/* Appointment list */}
          {loadingDay ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
            </div>
          ) : dayAppts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-14 text-center">
              <CalIcon size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Sin citas para este día</p>
              <Button onClick={() => openCreate(selectedStr)}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                data-testid="add-first-appt">
                Agendar primera cita
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {dayAppts.map(appt => {
                const type = typeInfo(appt.type);
                const stat = statusInfo(appt.status);
                return (
                  <div key={appt.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-start gap-4"
                    data-testid={`appt-card-${appt.id}`}>

                    {/* Time column */}
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-blue-600 font-bold text-base" style={{ fontFamily: "Manrope" }}>{appt.time}</p>
                      <p className="text-xs text-slate-400">{appt.duration} min</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{appt.patient_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${type.cls}`}>
                          {type.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stat.cls}`}>
                          {stat.label}
                        </span>
                      </div>
                      {appt.notes && <p className="text-xs text-slate-400 mt-1 truncate">{appt.notes}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">Dr. {appt.doctor_name}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">

                      <button
                        onClick={() => navigate(`/pacientes/${appt.patient_id}`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver paciente" data-testid={`appt-view-patient-${appt.id}`}>
                        <User size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/recetas/nueva?patient_id=${appt.patient_id}`)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Nueva receta" data-testid={`appt-new-rx-${appt.id}`}>
                        <FileText size={14} />
                      </button>
                      {appt.status !== "completada" && (
                        <button
                          onClick={() => handleStatus(appt.id, "completada")}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Marcar completada" data-testid={`appt-complete-${appt.id}`}>
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(appt)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar" data-testid={`appt-edit-${appt.id}`}>
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(appt.id);
                          setConfirmOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar" data-testid={`appt-delete-${appt.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── New/Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope" }}>
              {editAppt ? "Editar Cita" : "Nueva Cita"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editAppt ? "Modifica los datos de la cita." : "Programa una nueva cita médica seleccionando paciente, fecha, hora y tipo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">

            {/* Patient */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Paciente *</Label>
              {form.patient_id && !editAppt ? (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-800">{form.patient_name}</span>
                  <button type="button" onClick={() => { setForm(f => ({...f, patient_id:"", patient_name:""})); setPtSearch(""); }}
                    className="text-blue-500 text-xs underline">Cambiar</button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={ptSearch}
                    onChange={e => { setPtSearch(e.target.value); if (editAppt) setForm(f => ({...f, patient_id: ""})); }}
                    placeholder="Buscar paciente..."
                    className="pl-8 h-10" data-testid="appt-patient-search" />
                  {showPtList && patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-44 overflow-y-auto">
                      {patients.map(p => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                          data-testid={`appt-select-patient-${p.id}`}>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.phone || "Sin teléfono"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fecha *</Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="h-10" data-testid="appt-date" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Hora *</Label>
                <select value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="appt-time">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Type + Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tipo</Label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="appt-type">
                  {APPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Duración</Label>
                <select value={form.duration} onChange={e => setForm(f => ({...f, duration: Number(e.target.value)}))}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="appt-duration">
                  {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Motivo / Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                placeholder="Motivo de la consulta, indicaciones previas..."
                className="resize-none text-sm" rows={2} data-testid="appt-notes" />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10">Cancelar</Button>
              <Button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10"
                data-testid="save-appt-btn">
                {saving ? "Guardando..." : editAppt ? "Actualizar" : "Agendar Cita"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar cita médica?"
        description="Esta cita será eliminada permanentemente y liberará el horario seleccionado en la agenda."
      />
    </div>
  );
}
