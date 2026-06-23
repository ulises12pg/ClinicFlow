import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Plus, Search, Pill, AlertTriangle, Edit2, Trash2, Package } from "lucide-react";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

const CATEGORIES = [
  "Antibiótico", "Analgésico", "Antiinflamatorio", "Antihipertensivo",
  "Antidiabético", "Vitaminas / Suplementos", "Antihistamínico",
  "Antifúngico", "Antiviral", "Cardioprotector", "Otro"
];

const UNITS = ["tabletas", "cápsulas", "ml", "ampollas", "sobres", "frascos", "unidades"];

const emptyForm = {
  name: "", generic_name: "", category: "", quantity: "", unit: "tabletas",
  min_stock: "10", expiry_date: "", supplier: "", notes: ""
};

function stockStatus(item) {
  if (item.quantity <= 0) return { label: "Sin stock", css: "stock-critical" };
  if (item.quantity <= item.min_stock) return { label: "Stock bajo", css: "stock-low" };
  return { label: "OK", css: "stock-ok" };
}

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "doctor";

  const fetchItems = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/inventory`, {
        params: search ? { search } : {},
        withCredentials: true
      });
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item, e) => {
    e.stopPropagation();
    setEditItem(item);
    setForm({
      name: item.name || "", generic_name: item.generic_name || "",
      category: item.category || "", quantity: String(item.quantity || ""),
      unit: item.unit || "tabletas", min_stock: String(item.min_stock || "10"),
      expiry_date: item.expiry_date || "", supplier: item.supplier || "",
      notes: item.notes || ""
    });
    setError("");
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/inventory/${deleteId}`, { withCredentials: true });
      fetchItems();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "Error al eliminar");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    if (!form.quantity || isNaN(form.quantity)) { setError("La cantidad debe ser un número"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity),
        min_stock: parseInt(form.min_stock) || 10
      };
      if (editItem) {
        await axios.put(`${API}/inventory/${editItem.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/inventory`, payload, { withCredentials: true });
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  };

  const lowStockCount = items.filter(i => i.quantity <= i.min_stock).length;

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Inventario</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {items.length} medicamento{items.length !== 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {lowStockCount} con stock bajo</span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="add-inv-btn">
            <Plus size={16} className="mr-1.5" /> Agregar Medicamento
          </Button>
        )}
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <span className="font-semibold">{lowStockCount} medicamento{lowStockCount > 1 ? "s" : ""}</span>
            {" "}con stock por debajo del mínimo. Se recomienda reabastecer.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar medicamento o nombre genérico..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 border-slate-300"
          data-testid="inv-search"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              {search ? "No se encontraron medicamentos" : "No hay medicamentos en inventario"}
            </p>
            {!search && canEdit && (
              <Button onClick={openCreate} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm" data-testid="add-first-med">
                Agregar primer medicamento
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicamento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cantidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Caducidad</th>
                  {canEdit && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const { label, css } = stockStatus(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors" data-testid={`inv-row-${item.id}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Pill size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            {item.generic_name && <p className="text-xs text-slate-400">{item.generic_name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs hidden md:table-cell">{item.category || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800">{item.quantity}</span>
                        <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${css}`}>{label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                        {item.expiry_date || "—"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={e => openEdit(item, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" data-testid={`edit-inv-${item.id}`}>
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteId(item.id);
                                setConfirmOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              data-testid={`delete-inv-${item.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope" }}>
              {editItem ? "Editar Medicamento" : "Agregar Medicamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Nombre comercial *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Amoxicilina 500mg" className="h-10" data-testid="inv-name-input" required />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Nombre genérico</Label>
                <Input value={form.generic_name} onChange={e => setForm(f => ({ ...f, generic_name: e.target.value }))}
                  placeholder="Nombre genérico" className="h-10" data-testid="inv-generic-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-10" data-testid="inv-category">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Cantidad *</Label>
                <Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0" className="h-10" data-testid="inv-quantity" required />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Unidad</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="h-10" data-testid="inv-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Stock mínimo</Label>
                <Input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))}
                  className="h-10" data-testid="inv-min-stock" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Fecha de caducidad</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="h-10" data-testid="inv-expiry" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-sm font-medium">Proveedor</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                  placeholder="Nombre del proveedor" className="h-10" data-testid="inv-supplier" />
              </div>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-10" data-testid="save-inv-btn">
                {saving ? "Guardando..." : editItem ? "Actualizar" : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar lote del inventario?"
        description="Esta acción eliminará el medicamento y todo su registro de stock de forma permanente."
      />
    </div>
  );
}
