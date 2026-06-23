import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Search, User, Pill, Package, AlertTriangle, X } from "lucide-react";

const FREQUENCIES = [
  "Cada 4 horas", "Cada 6 horas", "Cada 8 horas", "Cada 12 horas",
  "Cada 24 horas (1 vez al día)", "2 veces al día", "3 veces al día",
  "Con cada comida", "En ayunas", "Según necesidad"
];

const emptyMed = {
  name: "", dosage: "", frequency: "", duration: "", instructions: "",
  inventory_id: null, quantity_dispensed: 1
};

export default function NewPrescription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patient_id");

  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState([{ ...emptyMed }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Inventory autocomplete
  const [inventory, setInventory] = useState([]);
  const [openMedIdx, setOpenMedIdx] = useState(null);
  const [dispenseFromInventory, setDispenseFromInventory] = useState(true);

  const fetchPatient = useCallback(async (id) => {
    try {
      const { data } = await axios.get(`${API}/patients/${id}`, { withCredentials: true });
      setSelectedPatient(data);
      setPatientSearch(data.name);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (preselectedPatientId) fetchPatient(preselectedPatientId);
  }, [preselectedPatientId, fetchPatient]);

  // Load inventory once
  useEffect(() => {
    axios.get(`${API}/inventory`, { withCredentials: true })
      .then(r => setInventory(r.data || []))
      .catch(console.error);
  }, []);

  const searchPatients = useCallback(async (q) => {
    if (!q || q.length < 1) { setPatients([]); return; }
    try {
      const { data } = await axios.get(`${API}/patients`, { params: { search: q }, withCredentials: true });
      setPatients(data);
      setShowPatientList(true);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (selectedPatient) return;
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch, searchPatients, selectedPatient]);

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setPatientSearch(p.name);
    setShowPatientList(false);
    setPatients([]);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setPatients([]);
  };

  const addMed = () => setMedications(m => [...m, { ...emptyMed }]);
  const removeMed = (i) => setMedications(m => m.filter((_, idx) => idx !== i));
  const updateMed = (i, field, value) => {
    setMedications(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med));
  };

  const pickInventoryItem = (i, item) => {
    setMedications(m => m.map((med, idx) => idx === i ? {
      ...med,
      name: item.generic_name ? `${item.name} (${item.generic_name})` : item.name,
      inventory_id: item.id,
      quantity_dispensed: med.quantity_dispensed || 1,
    } : med));
    setOpenMedIdx(null);
  };

  const detachInventory = (i) => {
    setMedications(m => m.map((med, idx) => idx === i ? {
      ...med, inventory_id: null, quantity_dispensed: 1
    } : med));
  };

  const filterInventory = (query) => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return inventory.slice(0, 8);
    return inventory.filter(x =>
      x.name?.toLowerCase().includes(q) ||
      x.generic_name?.toLowerCase().includes(q)
    ).slice(0, 8);
  };

  const inventoryById = useMemo(() => {
    const m = {};
    inventory.forEach(it => { m[it.id] = it; });
    return m;
  }, [inventory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError("Selecciona un paciente"); return; }
    if (!diagnosis.trim()) { setError("El diagnóstico es requerido"); return; }
    const validMeds = medications.filter(m => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim());
    if (validMeds.length === 0) { setError("Agrega al menos un medicamento completo"); return; }

    // Build payload — strip inventory_id/quantity if not dispensing
    const payload = {
      patient_id: selectedPatient.id,
      diagnosis,
      dispense_from_inventory: dispenseFromInventory,
      medications: validMeds.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || null,
        inventory_id: dispenseFromInventory ? (m.inventory_id || null) : null,
        quantity_dispensed: dispenseFromInventory && m.inventory_id
          ? Number(m.quantity_dispensed) || 1 : null,
      })),
      notes: notes || null,
    };

    setSaving(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/prescriptions`, payload, { withCredentials: true });
      navigate(`/recetas/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar la receta");
    } finally { setSaving(false); }
  };

  const canCreate = user?.role === "admin" || user?.role === "doctor";

  if (!canCreate) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Solo los médicos pueden crear recetas.</p>
        <Button onClick={() => navigate("/recetas")} variant="outline" className="mt-3">Regresar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 page-enter max-w-3xl">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-4"
          data-testid="back-from-new-rx"
        >
          <ArrowLeft size={15} /> Regresar
        </button>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Nueva Receta Médica</h1>
        <p className="text-slate-500 text-sm mt-0.5">Dr. {user?.name} · {user?.specialization || "Médico General"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient Selection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
            <User size={16} className="text-blue-600" /> Paciente
          </h2>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{selectedPatient.name?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">{selectedPatient.phone || "Sin teléfono"}</p>
                </div>
              </div>
              {!preselectedPatientId && (
                <button type="button" onClick={clearPatient} className="text-slate-400 hover:text-slate-600 text-xs underline" data-testid="clear-patient-btn">
                  Cambiar
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                  placeholder="Buscar paciente por nombre o teléfono..."
                  className="pl-9 h-10 border-slate-300"
                  data-testid="patient-search-rx"
                />
              </div>
              {showPatientList && patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      data-testid={`select-patient-${p.id}`}
                    >
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.phone || "Sin teléfono"}</p>
                    </button>
                  ))}
                </div>
              )}
              {patientSearch && patients.length === 0 && !selectedPatient && (
                <p className="text-xs text-slate-400 mt-1.5 px-1">Sin resultados. Primero <button type="button" onClick={() => navigate("/pacientes")} className="text-blue-600 underline">registra al paciente</button>.</p>
              )}
            </div>
          )}
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: "Manrope" }}>Diagnóstico</h2>
          <Textarea
            value={diagnosis}
            onChange={e => setDiagnosis(e.target.value)}
            placeholder="Ej: Infección de vías respiratorias superiores, Faringitis bacteriana..."
            className="resize-none border-slate-300 focus:border-blue-500"
            rows={3}
            data-testid="diagnosis-input"
            required
          />
        </div>

        {/* Medications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2" style={{ fontFamily: "Manrope" }}>
              <Pill size={16} className="text-blue-600" /> Medicamentos
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={addMed}
              className="h-8 text-xs border-slate-300"
              data-testid="add-med-btn"
            >
              <Plus size={13} className="mr-1" /> Agregar
            </Button>
          </div>

          {/* Dispense toggle */}
          <label className="flex items-start gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={dispenseFromInventory}
              onChange={e => setDispenseFromInventory(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600"
              data-testid="dispense-from-inventory-toggle"
            />
            <div>
              <p className="text-sm font-medium text-blue-900">Descontar del inventario al guardar</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Si está activo, el stock de los medicamentos seleccionados del inventario se reducirá automáticamente.
              </p>
            </div>
          </label>

          <div className="space-y-4">
            {medications.map((med, i) => {
              const linkedItem = med.inventory_id ? inventoryById[med.inventory_id] : null;
              const insufficientStock = linkedItem
                && Number(med.quantity_dispensed || 0) > Number(linkedItem.quantity || 0);

              return (
                <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Medicamento {i + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMed(i)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        data-testid={`remove-med-${i}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Name with inventory autocomplete */}
                    <div className="sm:col-span-2 space-y-1 relative">
                      <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        Nombre del medicamento *
                        {linkedItem && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <Package size={10} /> Del inventario
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          value={med.name}
                          onChange={e => {
                            updateMed(i, "name", e.target.value);
                            if (med.inventory_id) updateMed(i, "inventory_id", null);
                            setOpenMedIdx(i);
                          }}
                          onFocus={() => setOpenMedIdx(i)}
                          onBlur={() => setTimeout(() => setOpenMedIdx(prev => prev === i ? null : prev), 150)}
                          placeholder="Buscar en inventario o escribir nombre libre…"
                          className={`h-9 border-slate-300 bg-white ${linkedItem ? "pr-9" : ""}`}
                          data-testid={`med-name-${i}`}
                          autoComplete="off"
                        />
                        {linkedItem && (
                          <button
                            type="button"
                            onClick={() => detachInventory(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                            title="Desvincular del inventario"
                            data-testid={`med-detach-inv-${i}`}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Autocomplete dropdown */}
                      {openMedIdx === i && inventory.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
                          {filterInventory(med.name).length === 0 ? (
                            <p className="px-4 py-2.5 text-xs text-slate-400">
                              Sin coincidencias en inventario. Puedes escribir el nombre libremente.
                            </p>
                          ) : (
                            filterInventory(med.name).map(item => {
                              const lowStock = item.quantity <= (item.min_stock || 0);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => pickInventoryItem(i, item)}
                                  disabled={item.quantity === 0}
                                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-50 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  data-testid={`med-${i}-pick-inv-${item.id}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                                      {item.generic_name && (
                                        <p className="text-xs text-slate-500 truncate">{item.generic_name}</p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                      <p className={`text-xs font-semibold ${
                                        item.quantity === 0 ? "text-red-600" :
                                        lowStock ? "text-amber-600" : "text-emerald-600"
                                      }`}>
                                        {item.quantity} {item.unit || "u"}
                                      </p>
                                      {item.quantity === 0 && (
                                        <p className="text-[10px] text-red-500">Agotado</p>
                                      )}
                                      {lowStock && item.quantity > 0 && (
                                        <p className="text-[10px] text-amber-500">Bajo stock</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Stock indicator + quantity field when linked */}
                      {linkedItem && dispenseFromInventory && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-xs font-medium text-slate-600 whitespace-nowrap">Cantidad a surtir:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={med.quantity_dispensed || 1}
                            onChange={e => updateMed(i, "quantity_dispensed", e.target.value)}
                            className="h-8 w-20 border-slate-300 bg-white text-sm"
                            data-testid={`med-qty-dispensed-${i}`}
                          />
                          <span className="text-xs text-slate-500">{linkedItem.unit || "unidades"}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className={`text-xs ${insufficientStock ? "text-red-600 font-medium" : "text-slate-500"}`}>
                            Disponibles: {linkedItem.quantity}
                          </span>
                          {insufficientStock && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 ml-auto">
                              <AlertTriangle size={12} /> Stock insuficiente
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Dosis *</Label>
                      <Input
                        value={med.dosage}
                        onChange={e => updateMed(i, "dosage", e.target.value)}
                        placeholder="Ej: 500mg, 1 tableta"
                        className="h-9 border-slate-300 bg-white"
                        data-testid={`med-dosage-${i}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Frecuencia *</Label>
                      <select
                        value={med.frequency}
                        onChange={e => updateMed(i, "frequency", e.target.value)}
                        className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid={`med-frequency-${i}`}
                      >
                        <option value="">Seleccionar...</option>
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Duración *</Label>
                      <Input
                        value={med.duration}
                        onChange={e => updateMed(i, "duration", e.target.value)}
                        placeholder="Ej: 7 días, 10 días"
                        className="h-9 border-slate-300 bg-white"
                        data-testid={`med-duration-${i}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Indicaciones adicionales</Label>
                      <Input
                        value={med.instructions}
                        onChange={e => updateMed(i, "instructions", e.target.value)}
                        placeholder="Ej: Tomar con alimentos"
                        className="h-9 border-slate-300 bg-white"
                        data-testid={`med-instructions-${i}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "Manrope" }}>Notas e Indicaciones Generales</h2>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Recomendaciones adicionales, indicaciones de reposo, seguimiento..."
            className="resize-none border-slate-300"
            rows={3}
            data-testid="notes-input"
          />
        </div>

        {error && (
          <div data-testid="rx-error" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-11 px-5">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 font-semibold"
            data-testid="save-rx-btn"
          >
            {saving ? "Guardando..." : "Guardar Receta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
