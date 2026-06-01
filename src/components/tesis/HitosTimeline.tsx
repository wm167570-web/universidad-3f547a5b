import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Circle, Calendar, Trash2, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";

type Hito = {
  id: string; tesis_id: string; titulo: string; descripcion: string | null;
  fecha_limite: string; completado: boolean; fecha_completado: string | null;
};

function HitoDialog({ tesisId, userId, hito, open, onOpenChange }: {
  tesisId: string; userId: string; hito?: Hito | null;
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!hito;
  const [form, setForm] = useState({
    titulo: hito?.titulo ?? "",
    descripcion: hito?.descripcion ?? "",
    fecha_limite: hito?.fecha_limite ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.fecha_limite) throw new Error("La fecha límite es requerida");
      const basePayload = {
        tesis_id: tesisId, user_id: userId,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        fecha_limite: form.fecha_limite,
      };
      if (isEdit) {
        const { error } = await supabase.from("tesis_hitos").update(basePayload).eq("id", hito!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tesis_hitos").insert([{
          ...basePayload,
          completado: false,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Hito actualizado" : "Hito creado");
      qc.invalidateQueries({ queryKey: ["tesis-hitos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{isEdit ? "Editar hito" : "Nuevo hito"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Título *</label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1"
              placeholder="Ej: Entrega del marco teórico" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
            <Textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha límite *</label>
            <Input type="date" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.titulo || !form.fecha_limite || save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            {isEdit ? "Guardar" : "Crear hito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HitosTimeline({ tesisId, userId }: { tesisId: string; userId: string }) {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const { data: hitos = [], isLoading } = useQuery({
    queryKey: ["tesis-hitos", tesisId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tesis_hitos").select("*").eq("tesis_id", tesisId).order("fecha_limite", { ascending: true });
      if (error) throw error;
      return data as Hito[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completado }: { id: string; completado: boolean }) => {
      const { error } = await supabase.from("tesis_hitos").update({
        completado,
        fecha_completado: completado ? new Date().toISOString().split("T")[0] : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tesis-hitos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tesis_hitos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hito eliminado");
      qc.invalidateQueries({ queryKey: ["tesis-hitos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="size-5 animate-spin" style={{ color: "#f59e0b" }} />
    </div>
  );

  const completados = hitos.filter((h) => h.completado).length;
  const pct = hitos.length > 0 ? (completados / hitos.length) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-lg font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>
            Cronograma
          </h3>
          <Badge style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
            className="text-[10px] font-bold uppercase">
            {completados}/{hitos.length} completados · {pct.toFixed(0)}%
          </Badge>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-3.5 mr-1.5" />Hito
        </Button>
      </div>

      {hitos.length === 0 ? (
        <div className="text-center py-12 rounded border border-dashed" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
          <Flag className="size-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No hay hitos en el cronograma</p>
        </div>
      ) : (
        <div className="relative">
          {/* Línea vertical del timeline */}
          <div className="absolute left-5 top-3 bottom-3 w-px" style={{ background: "rgba(245,158,11,0.2)" }} />

          <div className="space-y-3">
            {hitos.map((h) => {
              const fecha = new Date(h.fecha_limite);
              const diasRestantes = Math.ceil((fecha.getTime() - Date.now()) / 86400000);
              const vencido = !h.completado && diasRestantes < 0;
              const urgente = !h.completado && diasRestantes >= 0 && diasRestantes <= 7;

              return (
                <div key={h.id} className="flex gap-4 group relative pl-10">
                  {/* Icono en la línea */}
                  <div className="absolute left-3 top-3 z-10 -translate-x-1/2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: h.id, completado: !h.completado })}
                      className="transition-transform hover:scale-110"
                    >
                      {h.completado
                        ? <CheckCircle2 className="size-5" style={{ color: "#22c55e", filter: "drop-shadow(0 0 4px rgba(34,197,94,0.6))" }} />
                        : <Circle className="size-5" style={{ color: vencido ? "#ef4444" : urgente ? "#f97316" : "#f59e0b" }} />
                      }
                    </button>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 rounded p-3"
                    style={{
                      background: h.completado ? "rgba(34,197,94,0.05)" : vencido ? "rgba(239,68,68,0.05)" : "rgba(35,5,5,0.6)",
                      border: `1px solid ${h.completado ? "rgba(34,197,94,0.2)" : vencido ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.12)"}`,
                    }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${h.completado ? "line-through text-muted-foreground" : ""}`}
                          style={{ color: h.completado ? undefined : "#f5e6d3" }}>
                          {h.titulo}
                        </p>
                        {h.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5">{h.descripcion}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Calendar className="size-3" style={{ color: vencido ? "#ef4444" : "#d4a574" }} />
                          <span className="text-xs" style={{ color: vencido ? "#ef4444" : urgente ? "#f97316" : "#d4a574" }}>
                            {fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                          {!h.completado && (
                            <span className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: vencido ? "#ef4444" : urgente ? "#f97316" : "transparent" }}>
                              {vencido ? `· VENCIDO hace ${Math.abs(diasRestantes)} días` : urgente ? `· ${diasRestantes}d restantes` : ""}
                            </span>
                          )}
                          {h.completado && h.fecha_completado && (
                            <span className="text-[10px] text-green-500/70">
                              · Completado {new Date(h.fecha_completado).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => { if (confirm("¿Eliminar hito?")) delMutation.mutate(h.id); }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10">
                        <Trash2 className="size-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HitoDialog tesisId={tesisId} userId={userId} open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
