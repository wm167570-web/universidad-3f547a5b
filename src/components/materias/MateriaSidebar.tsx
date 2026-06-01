import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, User, BookOpen, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Materia } from "@/types";



type Props = {
  materias: Materia[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (materia: Materia) => void;
  /** Progreso calculado externamente: materia_id → promedio 0-100 */
  progresos?: Record<string, number>;
};

export function MateriaSidebar({ materias, selectedId, onSelect, onCreate, onEdit, progresos = {} }: Props) {
  const qc = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Materia eliminada");
      qc.invalidateQueries({ queryKey: ["materias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <aside className="flex flex-col h-full border-r border-border bg-card">
      {/* Header sidebar */}
      <div className="px-4 py-4 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <span className="font-medium text-sm">Gestión Académica</span>
          <Badge variant="secondary" className="text-xs">{materias.length}</Badge>
        </div>
        <Button size="sm" onClick={onCreate} className="h-7 px-2 text-xs gap-1">
          <Plus className="size-3" /> Nueva
        </Button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto py-2">
        {materias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BookOpen className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Sin materias aún</p>
            <Button size="sm" variant="link" onClick={onCreate} className="mt-2 text-xs">
              Crear la primera
            </Button>
          </div>
        ) : (
          materias.map((m) => {
            const progreso = progresos[m.id] ?? 0;
            const isSelected = m.id === selectedId;
            return (
              <div
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={cn(
                  "group relative px-4 py-3 cursor-pointer transition-colors border-l-[3px]",
                  isSelected
                    ? "bg-primary/10 border-l-primary"
                    : "border-l-transparent"
                )}
              >
                {/* Color dot + nombre */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color ?? "#16a34a" }} />
                  <span className={cn("text-sm font-medium", isSelected && "text-primary")}>
                    {m.nombre}
                  </span>
                </div>

                {/* Docente */}
                {m.docente && (
                  <div className="flex items-center gap-1 mt-1 ml-4">
                    <User className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{m.docente}</span>
                  </div>
                )}

                {/* Barra de progreso (promedio visual) */}
                <div className="mt-2 ml-4 flex items-center gap-2">
                  <Progress value={progreso} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                    {progreso > 0 ? `${progreso.toFixed(0)}%` : "—"}
                  </span>
                </div>

                {/* Botones acciones (siempre visibles y sin hover) */}
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(m);
                    }}
                    className="p-1 rounded text-foreground/80 hover:text-primary transition-colors bg-background/40"
                    aria-label="Editar materia"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar "${m.nombre}"?`)) removeMutation.mutate(m.id);
                    }}
                    className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors bg-background/40"
                    aria-label="Eliminar materia"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
