import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Target, Calendar, User, Pencil, CheckCircle2,
  Clock, FileText, Loader2, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  borrador:    { label: "BORRADOR",    color: "#6b7280" },
  en_progreso: { label: "EN PROGRESO", color: "#f59e0b" },
  revision:    { label: "REVISIÓN",    color: "#3b82f6" },
  aprobada:    { label: "APROBADA",    color: "#22c55e" },
  defendida:   { label: "DEFENDIDA",   color: "#a855f7" },
};

type Tesis = {
  id: string; titulo: string; subtitulo: string | null; director: string | null;
  co_director: string | null; institucion: string | null; programa: string | null;
  estado: string; fecha_inicio: string | null; fecha_defensa: string | null;
  palabras_objetivo: number | null; palabras_actuales: number | null;
  resumen: string | null; palabras_clave: string[] | null;
};

// ── Formulario de edición ──────────────────────────────────────────────────────
function TesisEditDialog({ tesis, open, onOpenChange }: {
  tesis: Tesis; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    titulo: tesis.titulo,
    subtitulo: tesis.subtitulo ?? "",
    director: tesis.director ?? "",
    co_director: tesis.co_director ?? "",
    institucion: tesis.institucion ?? "",
    programa: tesis.programa ?? "",
    estado: tesis.estado,
    fecha_inicio: tesis.fecha_inicio ?? "",
    fecha_defensa: tesis.fecha_defensa ?? "",
    palabras_objetivo: tesis.palabras_objetivo ?? 50000,
    palabras_actuales: tesis.palabras_actuales ?? 0,
    resumen: tesis.resumen ?? "",
    palabras_clave: (tesis.palabras_clave ?? []).join(", "),
  });

  const save = useMutation({
    mutationFn: async () => {
      await updateDoc(doc(db, "tesis", tesis.id), {
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        director: form.director || null,
        co_director: form.co_director || null,
        institucion: form.institucion || null,
        programa: form.programa || null,
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_defensa: form.fecha_defensa || null,
        palabras_objetivo: Number(form.palabras_objetivo),
        palabras_actuales: Number(form.palabras_actuales),
        resumen: form.resumen || null,
        palabras_clave: form.palabras_clave ? form.palabras_clave.split(",").map(s => s.trim()).filter(Boolean) : null,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Tesis actualizada");
      qc.invalidateQueries({ queryKey: ["tesis"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Editar Tesis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Título *</label>
            <Input value={form.titulo} onChange={f("titulo")} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Subtítulo</label>
            <Input value={form.subtitulo} onChange={f("subtitulo")} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Director</label>
              <Input value={form.director} onChange={f("director")} className="mt-1" placeholder="Dr. Apellido" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Co-Director</label>
              <Input value={form.co_director} onChange={f("co_director")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Institución</label>
              <Input value={form.institucion} onChange={f("institucion")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Programa</label>
              <Input value={form.programa} onChange={f("programa")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Inicio</label>
              <Input type="date" value={form.fecha_inicio} onChange={f("fecha_inicio")} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha de defensa</label>
              <Input type="date" value={form.fecha_defensa} onChange={f("fecha_defensa")} className="mt-1" />
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
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</label>
            <select value={form.estado} onChange={f("estado")}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              style={{ background: "rgba(20,2,2,0.7)", borderColor: "rgba(245,158,11,0.25)", color: "#f5e6d3" }}>
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Resumen / Abstract</label>
            <Textarea rows={4} value={form.resumen} onChange={f("resumen")} className="mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Palabras clave (separadas por coma)</label>
            <Input value={form.palabras_clave} onChange={f("palabras_clave")} className="mt-1" placeholder="investigación, metodología, análisis" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.titulo || save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Panel de información principal ────────────────────────────────────────────
export function TesisInfoPanel({ tesis }: { tesis: Tesis }) {
  const [editOpen, setEditOpen] = useState(false);
  const progreso = Math.min(100, ((tesis.palabras_actuales ?? 0) / (tesis.palabras_objetivo || 50000)) * 100);
  const estado = ESTADO_CONFIG[tesis.estado] ?? { label: tesis.estado.toUpperCase(), color: "#f59e0b" };

  const diasDefensa = tesis.fecha_defensa
    ? Math.ceil((new Date(tesis.fecha_defensa).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      {/* Header de la tesis */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(245,158,11,0.15)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <Badge style={{ background: `${estado.color}22`, color: estado.color, border: `1px solid ${estado.color}44` }}
                className="text-[10px] uppercase tracking-widest font-bold">
                {estado.label}
              </Badge>
              {tesis.programa && (
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{tesis.programa}</span>
              )}
            </div>
            <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: "#fbbf24" }}>
              {tesis.titulo}
            </h2>
            {tesis.subtitulo && (
              <p className="text-sm text-muted-foreground mt-1">{tesis.subtitulo}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {tesis.director && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="size-3.5" style={{ color: "#f59e0b" }} />{tesis.director}
                </span>
              )}
              {tesis.institucion && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="size-3.5" style={{ color: "#f59e0b" }} />{tesis.institucion}
                </span>
              )}
              {tesis.fecha_defensa && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: diasDefensa !== null && diasDefensa < 90 ? "#f97316" : "#d4a574" }}>
                  <Calendar className="size-3.5" />
                  Defensa: {new Date(tesis.fecha_defensa).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                  {diasDefensa !== null && (
                    <span className="text-xs ml-1">
                      ({diasDefensa > 0 ? `${diasDefensa} días` : "¡Hoy!"})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil className="size-3.5 mr-1.5" />Editar
          </Button>
        </div>

        {/* Barra de progreso de palabras */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase tracking-wider" style={{ color: "#d4a574" }}>
              <TrendingUp className="size-3 inline mr-1" />Progreso de redacción
            </span>
            <span className="text-xs tabular-nums" style={{ color: "#fbbf24" }}>
              {(tesis.palabras_actuales ?? 0).toLocaleString()} / {(tesis.palabras_objetivo ?? 50000).toLocaleString()} palabras
              <span className="ml-2 font-bold">({progreso.toFixed(1)}%)</span>
            </span>
          </div>
          <Progress value={progreso} className="h-2" />
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Palabras escritas", value: (tesis.palabras_actuales ?? 0).toLocaleString(), icon: FileText },
            { label: "Objetivo", value: (tesis.palabras_objetivo ?? 50000).toLocaleString(), icon: Target },
            { label: "Días para defensa", value: diasDefensa !== null ? (diasDefensa > 0 ? diasDefensa : "¡Hoy!") : "—", icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded p-3 text-center"
              style={{ background: "rgba(74,4,4,0.35)", border: "1px solid rgba(245,158,11,0.12)" }}>
              <Icon className="size-4 mx-auto mb-1" style={{ color: "#f59e0b" }} />
              <div className="text-lg font-bold font-serif" style={{ color: "#fbbf24" }}>{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Palabras clave */}
        {tesis.palabras_clave?.length ? (
          <div className="flex gap-2 flex-wrap mt-3">
            {tesis.palabras_clave.map((k) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded uppercase tracking-widest"
                style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                {k}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <TesisEditDialog tesis={tesis} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

// ── Componente de creación de tesis (primera vez) ─────────────────────────────
export function CrearTesisCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "tesis"), {
        user_id: userId,
        titulo: titulo || "Mi Tesis de Maestría",
        estado: "en_progreso",
        palabras_objetivo: 50000,
        palabras_actuales: 0,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Proyecto de tesis creado");
      qc.invalidateQueries({ queryKey: ["tesis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="size-20 rounded-full mb-6 flex items-center justify-center"
        style={{ background: "rgba(245,158,11,0.1)", border: "2px solid rgba(245,158,11,0.3)", boxShadow: "0 0 30px rgba(245,158,11,0.15)" }}>
        <BookOpen className="size-10" style={{ color: "#f59e0b", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.6))" }} />
      </div>
      <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: "#fbbf24" }}>
        INICIAR PROYECTO DE TESIS
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Crea tu proyecto de tesis para gestionar capítulos, hitos, documentos y el avance general de tu investigación.
      </p>
      <div className="flex gap-2 w-full max-w-sm">
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de tu tesis..."
          className="flex-1"
        />
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
