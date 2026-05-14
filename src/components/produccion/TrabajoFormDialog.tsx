import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const TIPOS = ["ensayo", "informe", "proyecto", "monografía", "presentación", "tarea"];
const ESTADOS = [
  { value: "investigacion", label: "Investigación" },
  { value: "borrador", label: "Borrador" },
  { value: "revision", label: "Revisión" },
  { value: "entrega", label: "Entrega" },
];
const MEDIOS_ENTREGA = ["Aula virtual", "Correo electrónico", "Presencial", "Plataforma externa", "Otro"];

export type TrabajoFormValues = {
  id?: string;
  titulo: string;
  tipo: string;
  estado: string;
  materia_id: string | null;
  descripcion: string;
  instrucciones: string;
  objetivos: string;
  palabras_clave: string;
  paginas_estimadas: number;
  fecha_entrega: string;
  peso: string;
  // Borrador
  borrador_notas: string;
  borrador_fecha: string;
  // Revisión
  revision_comentarios: string;
  revision_revisor: string;
  revision_fecha: string;
  // Entrega
  entrega_fecha_real: string;
  entrega_medio: string;
  entrega_observaciones: string;
  // Calificación
  nota: string;
  calificacion_fecha: string;
};

const empty: TrabajoFormValues = {
  titulo: "", tipo: "ensayo", estado: "investigacion", materia_id: null, descripcion: "",
  instrucciones: "", objetivos: "", palabras_clave: "",
  paginas_estimadas: 5, fecha_entrega: "", peso: "",
  borrador_notas: "", borrador_fecha: "",
  revision_comentarios: "", revision_revisor: "", revision_fecha: "",
  entrega_fecha_real: "", entrega_medio: "", entrega_observaciones: "",
  nota: "", calificacion_fecha: "",
};

export function TrabajoFormDialog({
  open, onOpenChange, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<TrabajoFormValues> & { id?: string };
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState<TrabajoFormValues>(empty);

  useEffect(() => {
    if (open) {
      setV({
        ...empty,
        ...initial,
        id: initial?.id,
        materia_id: initial?.materia_id ?? null,
        paginas_estimadas: initial?.paginas_estimadas ?? 5,
      } as TrabajoFormValues);
    }
  }, [open, initial]);

  const { data: materias } = useQuery({
    enabled: !!user && open,
    queryKey: ["materias-list", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "materias"), orderBy("nombre"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      // Validaciones suaves: si el estado es "entrega" y no hay fecha real, usar hoy.
      const hoy = new Date().toISOString().slice(0, 10);
      const payload = {
        user_id: user.uid,
        titulo: v.titulo.trim(),
        tipo: v.tipo,
        estado: v.estado,
        materia_id: v.materia_id || null,
        descripcion: v.descripcion || null,
        instrucciones: v.instrucciones || null,
        objetivos: v.objetivos || null,
        palabras_clave: v.palabras_clave ? v.palabras_clave.split(",").map((s) => s.trim()).filter(Boolean) : null,
        paginas_estimadas: v.paginas_estimadas,
        fecha_entrega: v.fecha_entrega || null,
        peso: v.peso ? Number(v.peso) : null,
        // Fase Borrador
        borrador_notas: v.borrador_notas || null,
        borrador_fecha: v.borrador_fecha || (v.estado === "borrador" && !v.id ? hoy : null),
        // Fase Revisión
        revision_comentarios: v.revision_comentarios || null,
        revision_revisor: v.revision_revisor || null,
        revision_fecha: v.revision_fecha || (v.estado === "revision" && !v.id ? hoy : null),
        // Fase Entrega
        entrega_fecha_real: v.entrega_fecha_real || (v.estado === "entrega" && !v.id ? hoy : null),
        entrega_medio: v.entrega_medio || null,
        entrega_observaciones: v.entrega_observaciones || null,
        // Calificación
        nota: v.nota ? Number(v.nota) : null,
        calificacion_fecha: v.calificacion_fecha || (v.nota ? hoy : null),
        updated_at: new Date().toISOString(),
      };
      if (v.id) {
        await updateDoc(doc(db, "trabajos", v.id), payload);
      } else {
        await addDoc(collection(db, "trabajos"), {
          ...payload,
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      toast.success(v.id ? "Trabajo actualizado" : "Trabajo creado");
      qc.invalidateQueries({ queryKey: ["trabajos"] });
      qc.invalidateQueries({ queryKey: ["trabajo", v.id] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{v.id ? "Editar trabajo" : "Nuevo trabajo"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="borrador">Borrador</TabsTrigger>
            <TabsTrigger value="revision">Revisión</TabsTrigger>
            <TabsTrigger value="entrega">Entrega</TabsTrigger>
          </TabsList>

          {/* === GENERAL === */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={v.tipo} onValueChange={(x) => setV({ ...v, tipo: x })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado actual</Label>
                <Select value={v.estado} onValueChange={(x) => setV({ ...v, estado: x })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Materia</Label>
              <Select value={v.materia_id ?? "_none"} onValueChange={(x) => setV({ ...v, materia_id: x === "_none" ? null : x })}>
                <SelectTrigger><SelectValue placeholder="Sin materia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin materia</SelectItem>
                  {materias?.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción / contexto</Label>
              <Textarea
                rows={2}
                value={v.descripcion}
                onChange={(e) => setV({ ...v, descripcion: e.target.value })}
                className="max-h-32 overflow-y-auto resize-none"
              />
            </div>
            <div>
              <Label>Instrucciones del docente</Label>
              <Textarea
                rows={3}
                value={v.instrucciones}
                onChange={(e) => setV({ ...v, instrucciones: e.target.value })}
                className="max-h-40 overflow-y-auto resize-none"
              />
            </div>
            <div>
              <Label>Objetivos</Label>
              <Textarea
                rows={2}
                value={v.objetivos}
                onChange={(e) => setV({ ...v, objetivos: e.target.value })}
                className="max-h-32 overflow-y-auto resize-none"
              />
            </div>
            <div>
              <Label>Palabras clave (separadas por coma)</Label>
              <Input value={v.palabras_clave} onChange={(e) => setV({ ...v, palabras_clave: e.target.value })} placeholder="educación, tecnología" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Páginas estimadas</Label>
                <Input type="number" min={1} value={v.paginas_estimadas} onChange={(e) => setV({ ...v, paginas_estimadas: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fecha límite</Label>
                <Input type="date" value={v.fecha_entrega} onChange={(e) => setV({ ...v, fecha_entrega: e.target.value })} />
              </div>
              <div>
                <Label>Peso (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={v.peso} onChange={(e) => setV({ ...v, peso: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          {/* === BORRADOR === */}
          <TabsContent value="borrador" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Información del primer borrador del trabajo: ideas iniciales, esquema o avance principal.
            </p>
            <div>
              <Label>Fecha del borrador</Label>
              <Input type="date" value={v.borrador_fecha} onChange={(e) => setV({ ...v, borrador_fecha: e.target.value })} />
            </div>
            <div>
              <Label>Notas del borrador</Label>
              <Textarea
                rows={5}
                value={v.borrador_notas}
                onChange={(e) => setV({ ...v, borrador_notas: e.target.value })}
                placeholder="Esquema, ideas principales, secciones planeadas, fuentes a consultar…"
                maxLength={3000}
              />
            </div>
          </TabsContent>

          {/* === REVISIÓN === */}
          <TabsContent value="revision" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Información del proceso de revisión (autorrevisión, revisión por pares o del docente).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Revisor</Label>
                <Input
                  value={v.revision_revisor}
                  onChange={(e) => setV({ ...v, revision_revisor: e.target.value })}
                  placeholder="Yo, compañero, docente…"
                  maxLength={120}
                />
              </div>
              <div>
                <Label>Fecha de revisión</Label>
                <Input type="date" value={v.revision_fecha} onChange={(e) => setV({ ...v, revision_fecha: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Comentarios y cambios sugeridos</Label>
              <Textarea
                rows={5}
                value={v.revision_comentarios}
                onChange={(e) => setV({ ...v, revision_comentarios: e.target.value })}
                placeholder="Errores detectados, mejoras sugeridas, secciones a reescribir…"
                maxLength={3000}
              />
            </div>
          </TabsContent>

          {/* === ENTREGA === */}
          <TabsContent value="entrega" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Información de la entrega final del trabajo y su calificación.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha real de entrega</Label>
                <Input type="date" value={v.entrega_fecha_real} onChange={(e) => setV({ ...v, entrega_fecha_real: e.target.value })} />
              </div>
              <div>
                <Label>Medio de entrega</Label>
                <Select value={v.entrega_medio || "_none"} onValueChange={(x) => setV({ ...v, entrega_medio: x === "_none" ? "" : x })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {MEDIOS_ENTREGA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observaciones de la entrega</Label>
              <Textarea
                rows={3}
                value={v.entrega_observaciones}
                onChange={(e) => setV({ ...v, entrega_observaciones: e.target.value })}
                placeholder="Confirmación, número de radicado, evidencia, retroalimentación recibida…"
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label>Nota obtenida (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={v.nota}
                  onChange={(e) => setV({ ...v, nota: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha de calificación</Label>
                <Input type="date" value={v.calificacion_fecha} onChange={(e) => setV({ ...v, calificacion_fecha: e.target.value })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!v.titulo.trim() || save.isPending}>
            {save.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
