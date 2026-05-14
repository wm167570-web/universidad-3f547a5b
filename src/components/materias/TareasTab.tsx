import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function TareasTab({ materiaId }: { materiaId: string }) {
  const { data: trabajos = [], isLoading } = useQuery({
    queryKey: ["materia-tareas", materiaId],
    queryFn: async () => {
      const q = query(collection(db, "trabajos"), where("materia_id", "==", materiaId), orderBy("fecha_entrega"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>;
  }

  if (!trabajos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Sin tareas registradas</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Las evaluaciones que crees aparecerán aquí agrupadas por estado.</p>
      </div>
    );
  }

  const grupos = {
    pendiente: trabajos.filter((t) => t.estado === "investigacion" || t.estado === "borrador"),
    revision: trabajos.filter((t) => t.estado === "revision"),
    entregado: trabajos.filter((t) => t.estado === "entrega"),
  };

  const config = [
    { key: "pendiente" as const, label: "Pendientes", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20" },
    { key: "revision" as const, label: "En revisión", icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { key: "entregado" as const, label: "Entregados", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
  ];

  return (
    <div className="space-y-5">
      {config.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${bg} mb-2`}>
            <Icon className={`size-4 ${color}`} />
            <span className={`text-sm font-medium ${color}`}>{label}</span>
            <Badge variant="secondary" className="ml-auto text-xs">{grupos[key].length}</Badge>
          </div>
          {grupos[key].length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-1">Sin elementos.</p>
          ) : (
            <div className="space-y-1.5 pl-2">
              {grupos[key].map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-md border bg-card/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{t.tipo}</span>
                      {t.fecha_entrega && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {new Date(t.fecha_entrega).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {t.peso && <span className="text-xs text-muted-foreground shrink-0">{t.peso}%</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
