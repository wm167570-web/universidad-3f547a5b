import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, GripVertical, Pencil, Trash2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const ESTADOS = [
  { id: "pendiente",    label: "PENDIENTE",    color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  { id: "en_progreso",  label: "EN PROGRESO",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { id: "revision",     label: "REVISIÓN",     color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  { id: "aprobado",     label: "APROBADO",     color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
];

type Capitulo = {
  id: string; tesis_id: string; titulo: string; descripcion: string | null;
  orden: number; estado: string; palabras_objetivo: number | null;
  palabras_actuales: number | null; fecha_limite: string | null; notas: string | null;
};

// ── Formulario de capítulo ─────────────────────────────────────────────────────
function CapituloDialog({ tesisId, userId, capitulo, open, onOpenChange }: {
  tesisId: string; userId: string; capitulo?: Capitulo | null;
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!capitulo;
  const [form, setForm] = useState({
    titulo: capitulo?.titulo ?? "",
    descripcion: capitulo?.descripcion ?? "",
    estado: capitulo?.estado ?? "pendiente",
    palabras_objetivo: capitulo?.palabras_objetivo ?? 5000,
    palabras_actuales: capitulo?.palabras_actuales ?? 0,
    fecha_limite: capitulo?.fecha_limite ?? "",
    notas: capitulo?.notas ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        tesis_id: tesisId, user_id: userId,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        estado: form.estado,
        palabras_objetivo: Number(form.palabras_objetivo),
        palabras_actuales: Number(form.palabras_actuales),
        fecha_limite: form.fecha_limite || null,
        notas: form.notas || null,
        updated_at: new Date().toISOString(),
      };
      if (isEdit) {
        await updateDoc(doc(db, "tesis_capitulos", capitulo.id), payload);
      } else {
        await addDoc(collection(db, "tesis_capitulos"), {
          ...payload,
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Capítulo actualizado" : "Capítulo creado");
      qc.invalidateQueries({ queryKey: ["tesis-capitulos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{isEdit ? "Editar capítulo" : "Nuevo capítulo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Título *</label>
            <Input value={form.titulo} onChange={f("titulo")} className="mt-1" placeholder="Ej: Marco Teórico" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
            <Textarea rows={2} value={form.descripcion} onChange={f("descripcion")} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</label>
              <select value={form.estado} onChange={f("estado")} className="mt-1 w-full rounded border px-3 py-2 text-sm"
                style={{ background: "rgba(20,2,2,0.7)", borderColor: "rgba(245,158,11,0.25)", color: "#f5e6d3" }}>
                {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha límite</label>
              <Input type="date" value={form.fecha_limite} onChange={f("fecha_limite")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Palabras objetivo</label>
              <Input type="number" value={form.palabras_objetivo} onChange={f("palabras_objetivo")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Palabras escritas</label>
              <Input type="number" value={form.palabras_actuales} onChange={f("palabras_actuales")} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas del capítulo</label>
            <Textarea rows={2} value={form.notas} onChange={f("notas")} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.titulo || save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            {isEdit ? "Guardar" : "Crear capítulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tarjeta de capítulo ────────────────────────────────────────────────────────
function CapituloCard({ cap, tesisId, userId, onMove }: {
  cap: Capitulo; tesisId: string; userId: string;
  onMove: (id: string, estado: string) => void;
}) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const progreso = Math.min(100, ((cap.palabras_actuales ?? 0) / (cap.palabras_objetivo || 5000)) * 100);
  const estado = ESTADOS.find((e) => e.id === cap.estado) ?? ESTADOS[0];

  const del = useMutation({
    mutationFn: async () => {
      await deleteDoc(doc(db, "tesis_capitulos", cap.id));
    },
    onSuccess: () => {
      toast.success("Capítulo eliminado");
      qc.invalidateQueries({ queryKey: ["tesis-capitulos"] });
    },
  });

  const nextEstado = ESTADOS[ESTADOS.findIndex((e) => e.id === cap.estado) + 1];

  return (
    <>
      <div className="rounded p-3 mb-2 group relative"
        style={{ background: "rgba(35,5,5,0.7)", border: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(8px)" }}>
        {/* Header tarjeta */}
        <div className="flex items-start gap-2">
          <GripVertical className="size-4 text-muted-foreground/40 mt-0.5 shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate" style={{ color: "#f5e6d3" }}>{cap.titulo}</p>
            {cap.descripcion && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cap.descripcion}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-2.5 px-6">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{(cap.palabras_actuales ?? 0).toLocaleString()} palabras</span>
            <span>{progreso.toFixed(0)}%</span>
          </div>
          <Progress value={progreso} className="h-1" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 px-6">
          <Badge className="text-[9px] font-bold uppercase tracking-widest"
            style={{ background: estado.bg, color: estado.color, border: `1px solid ${estado.color}33` }}>
            {estado.label}
          </Badge>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {nextEstado && (
              <button onClick={() => onMove(cap.id, nextEstado.id)} title={`Mover a ${nextEstado.label}`}
                className="p-1 rounded hover:bg-amber-500/10 transition-colors">
                <ChevronRight className="size-3.5" style={{ color: "#f59e0b" }} />
              </button>
            )}
            <button onClick={() => setEditOpen(true)} className="p-1 rounded hover:bg-amber-500/10 transition-colors">
              <Pencil className="size-3.5" style={{ color: "#f59e0b" }} />
            </button>
            <button onClick={() => { if (confirm("¿Eliminar capítulo?")) del.mutate(); }}
              className="p-1 rounded hover:bg-red-500/10 transition-colors">
              <Trash2 className="size-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <CapituloDialog
        tesisId={tesisId} userId={userId} capitulo={cap}
        open={editOpen} onOpenChange={setEditOpen}
      />
    </>
  );
}

// ── Kanban de capítulos ────────────────────────────────────────────────────────
export function CapitulosKanban({ tesisId, userId }: { tesisId: string; userId: string }) {
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const { data: capitulos = [], isLoading } = useQuery({
    queryKey: ["tesis-capitulos", tesisId],
    queryFn: async () => {
      const q = query(
        collection(db, "tesis_capitulos"),
        where("tesis_id", "==", tesisId),
        orderBy("orden"),
        orderBy("created_at")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Capitulo[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      await updateDoc(doc(db, "tesis_capitulos", id), { estado });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tesis-capitulos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="size-5 animate-spin" style={{ color: "#f59e0b" }} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>
          Capítulos
        </h3>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-3.5 mr-1.5" />Nuevo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ESTADOS.map((col) => {
          const caps = capitulos.filter((c) => c.estado === col.id);
          return (
            <div key={col.id} className="rounded p-3 min-h-[200px]"
              style={{ background: col.bg, border: `1px solid ${col.color}22` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: col.color }}>
                  {col.label}
                </span>
                <Badge className="text-[9px]"
                  style={{ background: `${col.color}22`, color: col.color, border: `1px solid ${col.color}33` }}>
                  {caps.length}
                </Badge>
              </div>
              {caps.map((cap) => (
                <CapituloCard key={cap.id} cap={cap} tesisId={tesisId} userId={userId}
                  onMove={(id, estado) => moveMutation.mutate({ id, estado })} />
              ))}
              {caps.length === 0 && (
                <p className="text-[11px] text-center text-muted-foreground py-6 opacity-50">Sin capítulos</p>
              )}
            </div>
          );
        })}
      </div>

      <CapituloDialog tesisId={tesisId} userId={userId} open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
