import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, getDoc, query, where, orderBy, onSnapshot, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Clock, AlertTriangle, CheckCircle, RefreshCw, Video, ExternalLink, FileSpreadsheet, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { AvanceGaugeChart } from "@/components/ActivityChart";
import { PromedioChart } from "@/components/PomodoroTimer";
import { UserProfile, Materia, Trabajo } from "@/types";


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AcadémicoPro" },
      { name: "description", content: "KPIs y resumen de tu actividad académica." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await queryClient.invalidateQueries({ queryKey: ["materias", user?.uid] });
    await queryClient.invalidateQueries({ queryKey: ["trabajos-dashboard", user?.uid] });
    setTimeout(() => setIsSyncing(false), 600); // Efecto visual
  };



  const handleExport = async () => {
    try {
      toast.loading("Generando Excel...", { id: "export" });
      const [matSnap, trabSnap] = await Promise.all([
        getDocs(collection(db, "materias")),
        getDocs(collection(db, "trabajos")),
      ]);
      
      const materiasData = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const trabajosData = trabSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const matMap = new Map((materiasData as any[]).map((m: any) => [m.id, m.nombre]));

      const wsMaterias = XLSX.utils.json_to_sheet(
        (materiasData as any[]).map((m: any) => ({
          Código: m.codigo ?? "",
          Nombre: m.nombre,
          Docente: m.docente ?? "",
          Créditos: m.creditos ?? "",
          Semestre: m.semestre ?? "",
          Estado: m.estado,
          Descripción: m.descripcion ?? "",
        }))
      );

      const wsNotas = XLSX.utils.json_to_sheet(
        (trabajosData as any[]).map((t: any) => ({
          Materia: matMap.get(t.materia_id ?? null) ?? "Sin materia",
          Título: t.titulo,
          Tipo: t.tipo,
          Estado: t.estado,
          Peso: t.peso ?? "",
          Nota: t.nota ?? "",
          "Fecha entrega": t.fecha_entrega ?? "",
        }))
      );


      const wsProduccion = XLSX.utils.json_to_sheet(
        (trabajosData as any[]).map((t: any) => ({
          Título: t.titulo,
          Materia: matMap.get(t.materia_id ?? null) ?? "Sin materia",
          Tipo: t.tipo,
          "Tipo actividad": t.tipo_actividad ?? "",
          Trayecto: t.trayecto ?? "",
          Estado: t.estado,
          "Páginas estimadas": t.paginas_estimadas ?? "",
          "Fecha entrega": t.fecha_entrega ?? "",
          "Fecha real": t.entrega_fecha_real ?? "",
          Medio: t.entrega_medio ?? "",
        }))
      );


      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsMaterias, "Gestión Académica");
      XLSX.utils.book_append_sheet(wb, wsNotas, "Notas");
      XLSX.utils.book_append_sheet(wb, wsProduccion, "Proyectos de Inversión");
      XLSX.writeFile(wb, `AcademicoPro_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Excel generado", { id: "export" });
    } catch (e: any) {
      toast.error(e.message ?? "Error al exportar", { id: "export" });
    }
  };

  // Sincronización automática al montar el componente
  useEffect(() => {
    if (user?.uid) {
      queryClient.invalidateQueries({ queryKey: ["materias", user.uid] });
      queryClient.invalidateQueries({ queryKey: ["trabajos-dashboard", user.uid] });
    }
  }, [user?.uid, queryClient]);


  // Créditos IA del usuario (solo lectura) + realtime
  const { data: credits } = useQuery({
    enabled: !!user?.uid,
    queryKey: ["my-credits", user?.uid],
    queryFn: async () => {
      const docRef = doc(db, "profiles", user!.uid);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data() as UserProfile | undefined;
      return data?.creditos_disponibles ?? 0;
    },
    staleTime: 0,
  });
  const isSuperAdmin = user?.email === "wmartinezm360@gmail.com";

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "profiles", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        queryClient.setQueryData(["my-credits", user.uid], data.creditos_disponibles);
      }
    });
    return () => unsubscribe();
  }, [user?.uid, queryClient]);

  const { data: materias, isLoading: materiasLoading } = useQuery({
    enabled: !!user,
    queryKey: ["materias", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "materias"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Materia[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const { data: trabajos, isLoading: trabajosLoading } = useQuery({
    enabled: !!user,
    queryKey: ["trabajos-dashboard", user?.uid],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "trabajos"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Trabajo[];
    },
  });

  const dataLoading = materiasLoading || trabajosLoading;

  const stats = useMemo(() => {
    const totalMaterias = 19; // Según referencia técnica
    const cursadas = materias?.filter((m) => m.estado === "activo" || m.estado === "archivado").length ?? 0;
    
    const entregados = trabajos?.filter((t) => t.estado === "entrega").length ?? 0;
    const pendientes = trabajos?.filter((t) => t.estado !== "entrega").length ?? 0;

    // Promedio ponderado real desde notas
    const conNota = trabajos?.filter((t) => t.nota != null) ?? [];
    let promedio = 0;
    if (conNota.length > 0) {
      const sumPesos = conNota.reduce((s, t) => s + (Number(t.peso) || 1), 0);
      const sumNotas = conNota.reduce((s, t) => s + (Number(t.nota) || 0) * (Number(t.peso) || 1), 0);
      promedio = sumPesos > 0 ? sumNotas / sumPesos : 0;
    }

    // Alertas: entregas en los próximos 7 días sin entregar
    const hoy = new Date();
    const en7 = new Date(); en7.setDate(hoy.getDate() + 7);
    const alertas = trabajos?.filter((t) => {
      if (!t.fecha_entrega || t.estado === "entrega") return false;
      const f = new Date(t.fecha_entrega);
      return f >= hoy && f <= en7;
    }).length ?? 0;

    return { 
      totalMaterias, 
      cursadas, 
      promedio, 
      pendientes, 
      entregados,
      alertas 
    };
  }, [materias, trabajos]);

  const proximasEntregas = useMemo(() => {
    const hoy = new Date();
    return (trabajos ?? [])
      .filter((t) => t.fecha_entrega && t.estado !== "entrega" && new Date(t.fecha_entrega) >= hoy)
      .sort((a, b) => new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime())
      .slice(0, 5);
  }, [trabajos]);

  const materiaName = (id: string | null) => materias?.find((m) => m.id === id)?.nombre ?? "Sin materia";

  if (loading || !user) return null;

  return (
    <AppShell>
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div className="pl-12 md:pl-0">
          <p className="text-sm text-muted-foreground">Hola de nuevo,</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-1">Tu panel académico</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isSuperAdmin && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary"
              title="Créditos de IA disponibles"
              style={{ fontFamily: "'Montserrat', 'Poppins', system-ui, sans-serif" }}
            >
              <Sparkles className="size-3.5" />
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold">
                Créditos IA: <span className="font-mono tabular-nums">{credits ?? 0}</span>
              </span>
            </div>
          )}
          <div
            className="px-4 py-2 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-yellow-300/5 to-amber-500/10 shadow-[0_0_20px_-8px_rgba(251,191,36,0.5)]"
            style={{ fontFamily: "'Montserrat', 'Poppins', system-ui, sans-serif" }}
          >
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
              Created By Ing. William Martínez
            </span>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 border border-emerald-500/30 transition-colors"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="size-3.5" />
            Excel
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dataLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-1 w-full" />
                  </div>
                  <Skeleton className="size-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KPI label="Promedio" value={stats.promedio.toFixed(2)} icon={Trophy} tone="success" />
            <KPI
              label="Materias en curso"
              value={`${stats.cursadas} / ${stats.totalMaterias}`}
              icon={BookOpen}
              tone="warning"
              progress={(stats.cursadas / stats.totalMaterias) * 100}
            />
            <KPI
              label="Trabajos pendientes"
              value={`${stats.pendientes} / ${stats.entregados}`}
              icon={stats.pendientes === 0 ? CheckCircle : Clock}
              tone={stats.pendientes === 0 ? "success" : undefined}
            />
            <KPI label="Alertas (7 días)" value={String(stats.alertas)} icon={AlertTriangle} tone="warning" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Avance general</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <AvanceGaugeChart />
          </CardContent>
        </Card>
        <PromedioChart />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-serif text-xl">Próximas entregas</CardTitle>
            <Trophy className="size-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            {trabajosLoading ? (
              <ul className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </li>
                ))}
              </ul>
            ) : proximasEntregas.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No hay entregas próximas.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {proximasEntregas.map((t) => {
                  const fecha = new Date(t.fecha_entrega!);
                  const diff = Math.ceil((fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const urgente = diff <= 3;
                  return (
                    <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">{t.titulo}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{materiaName(t.materia_id ?? null)}</div>
                      </div>
                      <div className={`text-xs font-mono shrink-0 ${urgente ? "text-destructive" : "text-muted-foreground"}`}>
                        {fecha.toLocaleDateString()} · {diff === 0 ? "hoy" : `${diff}d`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <DashboardEncuentros materias={materias ?? []} />
      </div>


      <Outlet />
    </AppShell>
  );
}

function KPI({ 
  label, 
  value, 
  icon: Icon, 
  tone,
  progress 
}: { 
  label: string; 
  value: string; 
  icon: typeof BookOpen; 
  tone?: "success" | "warning";
  progress?: number;
}) {
  const toneClass =
    tone === "success" ? "bg-success/10 text-success" :
    tone === "warning" ? "bg-warning/15 text-warning-foreground" :
    "bg-primary/10 text-primary";
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</div>
            <div className="font-serif text-2xl mt-2 flex items-baseline gap-2">
              {value}
              {progress !== undefined && (
                <span className="text-xs font-sans text-muted-foreground font-normal">
                  ({progress.toFixed(1)}%)
                </span>
              )}
            </div>
            
            {progress !== undefined && (
              <div className="mt-3 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    tone === "success" ? "bg-success" :
                    tone === "warning" ? "bg-warning" :
                    "bg-primary"
                  }`} 
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ml-3 ${toneClass}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardEncuentros({ materias }: { materias: any[] }) {
  const { user } = useAuth();
  
  const { data: encuentros = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["all-encuentros"],
    queryFn: async () => {
      const q = query(collection(db, "materia_encuentros"), orderBy("fecha", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  const encuentrosPorMateria = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximos = (encuentros as any[]).filter((e: any) => {
      if (!e.fecha) return false;
      const fechaE = new Date(e.fecha + "T00:00:00");
      return fechaE >= hoy;
    });

    const grouped: Record<string, any[]> = {};
    proximos.forEach((e: any) => {
      if (!grouped[e.materiaId]) grouped[e.materiaId] = [];
      grouped[e.materiaId].push(e);
    });

    return grouped;
  }, [encuentros]);

  const getMateriaInfo = (id: string) => materias.find(m => m.id === id);
  const subjectIds = Object.keys(encuentrosPorMateria);

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/20">
        <div className="flex items-center gap-2">
          <Video className="size-5 text-primary" />
          <CardTitle className="font-serif text-xl">Próximos Encuentros</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : subjectIds.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">
            No hay encuentros programados.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subjectIds.map((mId) => {
              const materia = getMateriaInfo(mId);
              const items = encuentrosPorMateria[mId];
              
              return (
                <div key={mId} className="group">
                  <div className="bg-muted/30 px-4 py-2 flex items-center gap-2 border-y border-border/40 first:border-t-0">
                    <div className="size-2 rounded-full" style={{ backgroundColor: materia?.color || '#f59e0b' }} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {materia?.nombre || "Materia desconocida"}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/30">
                    {items.map((e) => (
                      <li key={e.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm uppercase tracking-tight text-foreground/90">{e.tematica}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground lowercase">{e.plataforma}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-primary">
                            {new Date(e.fecha + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{e.hora}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

