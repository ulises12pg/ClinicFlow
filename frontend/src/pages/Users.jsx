import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, UserCog, Trash2, Edit2, Shield, User } from "lucide-react";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

const ROLES = [
  { value: "admin", label: "Administrador", desc: "Acceso total" },
  { value: "doctor", label: "Médico", desc: "Recetas y pacientes" },
  { value: "nurse", label: "Enfermero/a", desc: "Solo lectura" },
];

const ROLE_COLORS = {
  admin: "bg-violet-50 text-violet-700 border-violet-200",
  doctor: "bg-blue-50 text-blue-700 border-blue-200",
  nurse: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const emptyForm = { name: "", email: "", password: "", role: "doctor", specialization: "", phone: "" };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name || "", email: u.email || "", password: "", role: u.role || "doctor", specialization: u.specialization || "", phone: u.phone || "" });
    setError("");
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.post(`${API}/users/${deleteId}/delete`, {}, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al eliminar");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    if (!editUser && !form.password) { setError("La contraseña es requerida"); return; }
    setSaving(true);
    setError("");
    try {
      if (editUser) {
        const payload = { name: form.name, role: form.role, specialization: form.specialization, phone: form.phone };
        await axios.put(`${API}/users/${editUser.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/users`, form, { withCredentials: true });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="add-user-btn">
          <Plus size={16} className="mr-1.5" /> Nuevo Usuario
        </Button>
      </div>

      {/* Roles info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES.map(r => (
          <div key={r.value} className={`px-4 py-3 rounded-xl border text-sm ${ROLE_COLORS[r.value]}`}>
            <p className="font-semibold">{r.label}</p>
            <p className="text-xs opacity-75 mt-0.5">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <UserCog size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {users.map(u => (
              <div key={u.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors" data-testid={`user-row-${u.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                    u.role === "admin" ? "bg-violet-100 text-violet-700" :
                    u.role === "doctor" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm">{u.name}</p>
                      {u.id === currentUser?.id && (
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">Tú</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{u.email}</p>
                    {u.specialization && <p className="text-xs text-slate-400">{u.specialization}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${ROLE_COLORS[u.role]}`}>
                    {ROLES.find(r => r.value === u.role)?.label || u.role}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      data-testid={`edit-user-${u.id}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          setDeleteId(u.id);
                          setConfirmOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        data-testid={`delete-user-${u.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope" }}>
              {editUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Nombre completo *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo" className="h-10" data-testid="user-name-input" required />
            </div>
            {!editUser && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Correo electrónico *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com" className="h-10" data-testid="user-email-input" required />
              </div>
            )}
            {!editUser && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Contraseña *</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" className="h-10" data-testid="user-password-input" required />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="h-10" data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Especialidad</Label>
              <Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                placeholder="Ej: Médico General, Pediatría..." className="h-10" data-testid="user-spec-input" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="save-user-btn">
                {saving ? "Guardando..." : editUser ? "Actualizar" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar cuenta de usuario?"
        description="Esta acción eliminará al usuario de forma permanente y revocará su acceso al sistema."
      />
    </div>
  );
}
