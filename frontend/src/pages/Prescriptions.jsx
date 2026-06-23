import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search, FileText, Printer, Eye, Trash2 } from "lucide-react";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

export default function Prescriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDelete = user?.role === "admin" || user?.role === "doctor";

  const fetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/prescriptions`, { withCredentials: true });
      setPrescriptions(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.post(`${API}/prescriptions/${deleteId}/delete`, {}, { withCredentials: true });
      fetch();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "Error al eliminar receta");
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = prescriptions.filter(p =>
    !search ||
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Recetas Médicas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} receta{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => navigate("/recetas/nueva")}
          className="bg-blue-600 hover:bg-blue-700 text-white h-10"
          data-testid="new-rx-btn"
        >
          <Plus size={16} className="mr-1.5" /> Nueva Receta
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por paciente, diagnóstico o médico..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 border-slate-300"
          data-testid="rx-search"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              {search ? "No se encontraron recetas" : "No hay recetas registradas"}
            </p>
            {!search && (
              <Button
                onClick={() => navigate("/recetas/nueva")}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
                data-testid="create-first-rx"
              >
                Crear primera receta
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Diagnóstico</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Médico</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rx => (
                  <tr
                    key={rx.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    data-testid={`rx-row-${rx.id}`}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-slate-900">{rx.patient_name}</p>
                        <p className="text-xs text-slate-400 md:hidden">{rx.diagnosis}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell max-w-xs">
                      <p className="truncate">{rx.diagnosis}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell">Dr. {rx.doctor_name}</td>
                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell text-xs">{rx.date}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${rx.status}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/recetas/${rx.id}`)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Ver receta"
                          data-testid={`view-rx-${rx.id}`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/recetas/${rx.id}?print=1`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Imprimir"
                          data-testid={`print-rx-${rx.id}`}
                        >
                          <Printer size={15} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => {
                              setDeleteId(rx.id);
                              setConfirmOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar receta"
                            data-testid={`delete-rx-${rx.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar receta médica?"
        description="Esta receta será eliminada de forma permanente. Ten en cuenta que si el medicamento ya fue dispensado de inventario, esta acción no reabastecerá el stock automáticamente."
      />
    </div>
  );
}
