import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft, Plus, User, Phone, MapPin, Droplets, Calendar,
  AlertCircle, FileText, Activity, Edit2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [{ value: "masculino", label: "Masculino" }, { value: "femenino", label: "Femenino" }, { value: "otro", label: "Otro" }];

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/patients/${id}`, { withCredentials: true }),
      axios.get(`${API}/prescriptions`, { params: { patient_id: id }, withCredentials: true })
    ]).then(([pRes, rxRes]) => {
      setPatient(pRes.data);
      setPrescriptions(rxRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const openEdit = () => {
    setForm({
      name: patient.name || "", date_of_birth: patient.date_of_birth || "",
      gender: patient.gender || "", phone: patient.phone || "",
      email: patient.email || "", address: patient.address || "",
      blood_type: patient.blood_type || "",
      allergies: (patient.allergies || []).join(", "),
      chronic_conditions: (patient.chronic_conditions || []).join(", "),
      notes: patient.notes || ""
    });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        allergies: form.allergies ? form.allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(",").map(s => s.trim()).filter(Boolean) : []
      };
      await axios.put(`${API}/patients/${id}`, payload, { withCredentials: true });
      const { data } = await axios.get(`${API}/patients/${id}`, { withCredentials: true });
      setPatient(data);
      setEditOpen(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!patient) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Paciente no encontrado</p>
      <Button onClick={() => navigate("/pacientes")} variant="outline" className="mt-3">Volver</Button>
    </div>
  );

  const age = calcAge(patient.date_of_birth);

  return (
    <div className="space-y-5 page-enter">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate("/pacientes")}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-4 no-print"
          data-testid="back-to-patients"
        >
          <ArrowLeft size={15} /> Pacientes
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-xl" style={{ fontFamily: "Manrope" }}>
                  {patient.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{patient.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {age && <span className="text-slate-500 text-sm">{age} años</span>}
                  {patient.gender && <span className="text-slate-400 text-sm capitalize">{patient.gender}</span>}
                  {patient.blood_type && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                      <Droplets size={10} />{patient.blood_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" onClick={openEdit} className="h-9 text-sm border-slate-300" data-testid="edit-patient-detail-btn">
                <Edit2 size={14} className="mr-1.5" /> Editar
              </Button>
              <Button
                onClick={() => navigate(`/recetas/nueva?patient_id=${patient.id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                data-testid="new-rx-from-patient"
              >
                <Plus size={14} className="mr-1.5" /> Nueva Receta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto no-print">
          <TabsTrigger value="info" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg" data-testid="tab-info">
            Datos Personales
          </TabsTrigger>
          <TabsTrigger value="recetas" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg" data-testid="tab-recetas">
            Recetas ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="antecedentes" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg" data-testid="tab-antecedentes">
            Antecedentes
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: Calendar, label: "Fecha de nacimiento", value: patient.date_of_birth || "No registrada" },
                { icon: Phone, label: "Teléfono", value: patient.phone || "No registrado" },
                { icon: User, label: "Correo electrónico", value: patient.email || "No registrado" },
                { icon: MapPin, label: "Dirección", value: patient.address || "No registrada" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={15} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-slate-800 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="recetas">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {prescriptions.length === 0 ? (
              <div className="py-12 text-center">
                <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Sin recetas registradas</p>
                <Button
                  onClick={() => navigate(`/recetas/nueva?patient_id=${patient.id}`)}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                  data-testid="create-rx-from-empty"
                >
                  Crear primera receta
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {prescriptions.map(rx => (
                  <div
                    key={rx.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/recetas/${rx.id}`)}
                    data-testid={`patient-rx-${rx.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{rx.diagnosis}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rx.medications?.length} medicamento{rx.medications?.length !== 1 ? "s" : ""} · Dr. {rx.doctor_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{rx.date}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${rx.status}`}>{rx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Antecedentes Tab */}
        <TabsContent value="antecedentes">
          <div className="space-y-4">
            {/* Alergias */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-red-500" />
                <h3 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "Manrope" }}>Alergias</h3>
              </div>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm border border-red-200">
                      {a}
                    </span>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm">Sin alergias registradas</p>}
            </div>

            {/* Condiciones crónicas */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-amber-500" />
                <h3 className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "Manrope" }}>Condiciones Crónicas</h3>
              </div>
              {patient.chronic_conditions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.chronic_conditions.map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm border border-amber-200">
                      {c}
                    </span>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm">Sin condiciones crónicas registradas</p>}
            </div>

            {/* Notas */}
            {patient.notes && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold text-slate-900 text-sm mb-2" style={{ fontFamily: "Manrope" }}>Notas adicionales</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{patient.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope" }}>Editar Paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Nombre completo *</Label>
                <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10" required />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Fecha de nacimiento</Label>
                <Input type="date" value={form.date_of_birth || ""} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Género</Label>
                <Select value={form.gender || ""} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Teléfono</Label>
                <Input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Tipo de sangre</Label>
                <Select value={form.blood_type || ""} onValueChange={v => setForm(f => ({ ...f, blood_type: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Alergias (separar con comas)</Label>
                <Input value={form.allergies || ""} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} className="h-10" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Condiciones crónicas (separar con comas)</Label>
                <Input value={form.chronic_conditions || ""} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))} className="h-10" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Notas</Label>
                <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="h-10">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="save-patient-edit-btn">
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
