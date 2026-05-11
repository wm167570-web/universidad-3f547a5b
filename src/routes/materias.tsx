import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import { MateriaSidebar } from "@/components/materias/MateriaSidebar";
import { MateriaDetailPanel } from "@/components/materias/MateriaDetailPanel";
import { MateriaFormDialog } from "@/components/materias/MateriaFormDialog";
import { AppSidebar } from "@/components/AppSidebar";
import { Materia } from "@/types/materias";

type MateriasSearch = {
  selected?: string;
};

export const Route = createFileRoute("/materias")({
  validateSearch: (search: Record<string, unknown>): MateriasSearch => {
    return {
      selected: (search.selected as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Gestión Académica — AcadémicoPro" },
      { name: "description", content: "Gestiona tus materias, calificaciones, tareas y repositorio de archivos." },
    ],
  }),
  component: MateriasPage,
});

function MateriasPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const searchParams = Route.useSearch();
  const selectedId = searchParams.selected || null;
  const setSelectedId = (id: string | null) => navigate({ to: "/materias", search: (p: { selected?: string }) => ({ ...p, selected: id || undefined }) });
  const [formOpen, setFormOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);

  const handleCreate = () => {
    setEditingMateria(null);
    setFormOpen(true);
  };

  const handleEdit = (materia: Materia) => {
    setEditingMateria(materia);
    setFormOpen(true);
  };


  // Cargar materias
  const { data: materias = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["materias", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Materia[]) ?? [];
    },
    // Seleccionar la primera materia automáticamente cuando cargue la lista
    select: (data) => {
      if (data.length > 0 && !selectedId) {
        // no muta estado aquí — se hace en el efecto de abajo
      }
      return data;
    },
  });

  // Autoselección de la primera materia al cargar
  useEffect(() => {
    if (materias.length > 0 && !selectedId) {
      setSelectedId(materias[0].id);
    }
  }, [materias, selectedId]);

  // Cargar trabajos para calcular el progreso visual de cada materia
  const { data: trabajosMateria = [] } = useQuery({
    enabled: !!user && materias.length > 0,
    queryKey: ["trabajos-progreso-materias", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trabajos")
        .select("materia_id, nota, trayecto, tipo_actividad, estado")
        .eq("user_id", user?.id || "");
      return data ?? [];
    },
  });

  // Calcular progreso por materia (escala 0-100) basado en 10 hitos
  const progresos = useMemo(() => {
    const map: Record<string, number> = {};
    materias.forEach((m) => {
      if (m.estado === "archivado") {
        map[m.id] = 100;
        return;
      }
      
      const trabajos = trabajosMateria.filter((t) => t.materia_id === m.id);
      if (!trabajos.length) { map[m.id] = 0; return; }

      // Lógica de 10 hitos: 3 trayectos con 3 actividades + 1 autoevaluación
      // Se considera completado si está en estado 'entrega' O tiene nota asignada.
      const isCompleted = (t: any) => t.estado === "entrega" || (t.nota !== null && t.nota !== undefined);

      const t1 = trabajos.filter(t => t.trayecto === 1 && isCompleted(t)).length;
      const t2 = trabajos.filter(t => t.trayecto === 2 && isCompleted(t)).length;
      const t3 = trabajos.filter(t => t.trayecto === 3 && isCompleted(t)).length;
      const auto = trabajos.filter(t => t.tipo_actividad === "Autoevaluación" && isCompleted(t)).length;

      const hitosCompletados = Math.min(3, t1) + Math.min(3, t2) + Math.min(3, t3) + Math.min(1, auto);
      map[m.id] = (hitosCompletados / 10) * 100;
    });
    return map;
  }, [materias, trabajosMateria]);

  const selectedMateria = materias.find((m) => m.id === selectedId) ?? null;

  if (loading || !user) return null;

  return (
    // Layout de pantalla completa, sin el padding del AppShell
    <div className="min-h-screen flex bg-background">
      {/* Sidebar de navegación global */}
      <AppSidebar />

      {/* Layout master-detail de dos columnas */}
      <div className="flex-1 flex overflow-hidden h-screen w-full min-w-0">

        {/* Columna izquierda: Lista de materias (oculta en móvil cuando hay selección) */}
        <div className={`${selectedMateria ? "hidden md:flex" : "flex"} w-full md:w-72 shrink-0 flex-col overflow-hidden border-r border-border pt-12 md:pt-0`}>
          <div className="px-4 pt-6 pb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tu semestre</p>
            <h1 className="font-serif text-2xl mt-0.5">Gestión Académica</h1>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MateriaSidebar
              materias={materias}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreate={handleCreate}
              onEdit={handleEdit}
              progresos={progresos}
            />
          )}
        </div>

        {/* Columna derecha: Detalle de la materia seleccionada */}
        <div className={`${selectedMateria ? "flex" : "hidden md:flex"} flex-1 min-w-0 overflow-hidden flex-col`}>
          {selectedMateria ? (
            <>
              {/* Botón volver (solo móvil) */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider border-b"
                style={{ color: "#fbbf24", borderColor: "rgba(245,158,11,0.2)" }}
              >
                ← Volver a materias
              </button>
              <div className="flex-1 overflow-hidden">
                <MateriaDetailPanel materia={selectedMateria} />
              </div>
            </>
          ) : (
            // Estado vacío cuando no hay materias
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="size-8 text-primary" />
              </div>
              <h2 className="font-serif text-xl mb-2">Selecciona una materia</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {materias.length === 0
                  ? "Crea tu primera materia usando el botón 'Nueva' en la barra lateral izquierda."
                  : "Haz clic en una materia de la lista para ver sus detalles."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de creación de materia */}
      {user && (
        <MateriaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          userId={user.id}
          materia={editingMateria}
        />
      )}
    </div>
  );
}
