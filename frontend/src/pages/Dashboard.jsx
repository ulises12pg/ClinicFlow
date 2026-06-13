import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "../contexts/AuthContext";
import { Users, FileText, AlertTriangle, UserCheck, ArrowRight, Plus, Calendar, Clock } from "lucide-react";
import { Button } from "../components/ui/button";

function StatCard({ title, value, icon: Icon, colorBg, colorIcon, colorText }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${colorBg}`}>
          <Icon size={18} className={colorIcon} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${colorText || "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      axios.get(`${API}/dashboard/stats`, { withCredentials: true }),
      axios.get(`${API}/appointments?date=${todayStr}`, { withCredentials: true }),
    ])
      .then(([s, a]) => {
        setStats(s.data);
        setTodayAppts(a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
            Bienvenido, Dr. {user?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate("/agenda")}
            variant="outline"
            className="border-slate-300 text-slate-700 h-9 text-sm"
            data-testid="dashboard-go-agenda"
          >
            <Calendar size={15} className="mr-1.5" />
            Agenda
          </Button>
          <Button
            onClick={() => navigate("/pacientes")}
            variant="outline"
            className="border-slate-300 text-slate-700 h-9 text-sm"
            data-testid="dashboard-go-patients"
          >
            <Users size={15} className="mr-1.5" />
            Pacientes
          </Button>
          <Button
            onClick={() => navigate("/recetas/nueva")}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            data-testid="dashboard-new-prescription"
          >
            <Plus size={15} className="mr-1.5" />
            Nueva Receta
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pacientes"
          value={stats?.total_patients ?? 0}
          icon={Users}
          colorBg="bg-blue-50"
          colorIcon="text-blue-600"
        />
        <StatCard
          title="Recetas Hoy"
          value={stats?.prescriptions_today ?? 0}
          icon={FileText}
          colorBg="bg-emerald-50"
          colorIcon="text-emerald-600"
        />
        <StatCard
          title="Bajo Stock"
          value={stats?.low_stock_count ?? 0}
          icon={AlertTriangle}
          colorBg="bg-amber-50"
          colorIcon="text-amber-500"
          colorText={stats?.low_stock_count > 0 ? "text-amber-600" : "text-slate-900"}
        />
        <StatCard
          title="Usuarios"
          value={stats?.total_users ?? 0}
          icon={UserCheck}
          colorBg="bg-violet-50"
          colorIcon="text-violet-600"
        />
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="today-appts-widget">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={17} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>
              Citas de Hoy
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              {todayAppts.length}
            </span>
          </div>
          <button
            onClick={() => navigate("/agenda")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            data-testid="dashboard-view-agenda"
          >
            Ver agenda <ArrowRight size={14} />
          </button>
        </div>

        {todayAppts.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {todayAppts.slice(0, 5).map((a) => {
              const typeCls = a.type === "urgencia" ? "bg-red-50 text-red-700"
                : a.type === "seguimiento" ? "bg-purple-50 text-purple-700"
                : a.type === "preventiva" ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700";
              const statusCls = a.status === "completada" ? "bg-slate-100 text-slate-600"
                : a.status === "cancelada" ? "bg-red-50 text-red-600"
                : a.status === "confirmada" ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700";
              return (
                <div
                  key={a.id}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate("/agenda")}
                  data-testid={`today-appt-${a.id}`}
                >
                  <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm w-20 flex-shrink-0">
                    <Clock size={13} />
                    {a.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{a.patient_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{a.notes || "Sin notas"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeCls}`}>
                      {a.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {todayAppts.length > 5 && (
              <div className="px-6 py-2 text-center text-xs text-slate-500">
                + {todayAppts.length - 5} cita{todayAppts.length - 5 !== 1 ? "s" : ""} más
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Calendar size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No hay citas programadas para hoy</p>
            <Button
              onClick={() => navigate("/agenda")}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
              data-testid="dashboard-add-first-appt"
            >
              Agendar cita
            </Button>
          </div>
        )}
      </div>

      {/* Recent Prescriptions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>
            Recetas Recientes
          </h2>
          <button
            onClick={() => navigate("/recetas")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            data-testid="dashboard-view-all-prescriptions"
          >
            Ver todas <ArrowRight size={14} />
          </button>
        </div>

        {stats?.recent_prescriptions?.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {stats.recent_prescriptions.map((p) => (
              <div
                key={p.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`/recetas/${p.id}`)}
                data-testid={`recent-rx-${p.id}`}
              >
                <div>
                  <p className="font-medium text-slate-900 text-sm">{p.patient_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.diagnosis} · Dr. {p.doctor_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{p.date}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${p.status}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <FileText size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No hay recetas recientes</p>
            <Button
              onClick={() => navigate("/recetas/nueva")}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
              data-testid="dashboard-create-first-rx"
            >
              Crear primera receta
            </Button>
          </div>
        )}
      </div>

      {/* Low stock warning */}
      {stats?.low_stock_count > 0 && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-amber-100"
          onClick={() => navigate("/inventario")}
          data-testid="dashboard-low-stock-alert"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 text-sm">
                {stats.low_stock_count} medicamento{stats.low_stock_count > 1 ? "s" : ""} con stock bajo
              </p>
              <p className="text-amber-600 text-xs">Revisar inventario y reabastecer</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-amber-500" />
        </div>
      )}
    </div>
  );
}
