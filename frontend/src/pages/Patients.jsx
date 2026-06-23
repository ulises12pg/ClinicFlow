import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Search, User, Phone, Calendar, Droplets, ChevronRight, Trash2, Edit2 } from "lucide-react";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [{ value: "masculino", label: "Masculino" }, { value: "femenino", label: "Femenino" }, { value: "otro", label: "Otro" }];

function calcAge(dob) {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const emptyForm = {
  name: "", date_of_birth: "", gender: "", phone: "", email: "",
  address: "", blood_type: "", allergies: "", chronic_conditions: "", notes: ""
};

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPatients = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/patients`, {
        params: search ? { search } : {},
        withCredentials: true
      });
      setPatients(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchPatients, 300);
    return () => clearTimeout(t);
  }, [fetchPatients]);

  const openCreate = () => {
    setEditPatient(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (p, e) => {
    e.stopPropagation();
    setEditPatient(p);
    setForm({
      name: p.name || "", date_of_birth: p.date_of_birth || "",
      gender: p.gender || "", phone: p.phone || "", email: p.email || "",
      address: p.address || "", blood_type: p.blood_type || "",
      allergies: (p.allergies || []).join(", "),
      chronic_conditions: (p.chronic_conditions || []).join(", "),
      notes: p.notes || ""
    });
    setError("");
    setDialogOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar este paciente y todas sus recetas?")) return;
    await axios.delete(`${API}/patients/${id}`, { withCredentials: true });
    fetchPatients();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        allergies: form.allergies ? form.allergies.split(",").map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(",").map(s => s.trim()).filter(Boolean) : []
      };
      if (editPatient) {
        await axios.put(`${API}/patients/${editPatient.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/patients`, payload, { withCredentials: true });
      }
      setDialogOpen(false);
      fetchPatients();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  };

  const canDelete = user?.role === "admin" || user?.role === "doctor";

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Pacientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{patients.length} paciente{patients.length !== 1 ? "s" : ""} registrado{patients.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="add-patient-btn">
          <Plus size={16} className="mr-1.5" /> Nuevo Paciente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 border-slate-300"
          data-testid="patient-search"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center">
            <User size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              {search ? "No se encontraron pacientes" : "No hay pacientes registrados"}
            </p>
            {!search && (
              <Button onClick={openCreate} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm" data-testid="add-first-patient">
                Agregar primer paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Edad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tipo Sangre</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50/80 active:bg-slate-100/50 cursor-pointer transition-all duration-100"
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    data-testid={`patient-row-${p.id}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-xs">{p.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{p.name}</p>
                          {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell tabular-nums">
                      {p.date_of_birth ? `${calcAge(p.date_of_birth)} años` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell tabular-nums">
                      {p.phone ? (
                        <span className="flex items-center gap-1"><Phone size={12} />{p.phone}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {p.blood_type ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">
                          <Droplets size={10} />{p.blood_type}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canDelete && (
                          <button
                            onClick={(e) => openEdit(p, e)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            data-testid={`edit-patient-${p.id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={(e) => handleDelete(p.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            data-testid={`delete-patient-${p.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-slate-400 ml-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope" }}>
              {editPatient ? "Editar Paciente" : "Nuevo Paciente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium text-slate-700">Nombre completo *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del paciente" className="h-10" data-testid="patient-name-input" required />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Calendar size={12} />Fecha de nacimiento</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-10" data-testid="patient-dob" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Género</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="h-10" data-testid="patient-gender">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="555-000-0000" className="h-10" data-testid="patient-phone" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="paciente@correo.com" className="h-10" data-testid="patient-email" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-700">Tipo de sangre</Label>
                <Select value={form.blood_type} onValueChange={v => setForm(f => ({ ...f, blood_type: v }))}>
                  <SelectTrigger className="h-10" data-testid="patient-blood-type">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium text-slate-700">Alergias</Label>
                <Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                  placeholder="Separar con comas: penicilina, aspirina..." className="h-10" data-testid="patient-allergies" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium text-slate-700">Condiciones crónicas</Label>
                <Input value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))}
                  placeholder="Separar con comas: diabetes, hipertensión..." className="h-10" data-testid="patient-conditions" />
              </div>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="save-patient-btn">
                {saving ? "Guardando..." : editPatient ? "Actualizar" : "Registrar Paciente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
