import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, deleteDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { formatAPA, type RefInput } from "@/lib/apa";

const TIPOS = [
  { v: "libro", l: "Libro" },
  { v: "articulo", l: "Artículo" },
  { v: "capitulo", l: "Capítulo de libro" },
  { v: "tesis", l: "Tesis" },
  { v: "web", l: "Página web" },
];

export function BibliografiaPanel({ trabajoId }: { trabajoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RefInput>({
    tipo: "libro", autores: "", titulo: "", anio: new Date().getFullYear(),
    fuente: "", editorial: "", url: "", doi: "",
  });

  const { data: refs } = useQuery({
    enabled: !!user,
    queryKey: ["referencias", trabajoId],
    queryFn: async () => {
      const q = query(collection(db, "referencias"), where("trabajo_id", "==", trabajoId), orderBy("autores"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const cita = formatAPA(form);
      await addDoc(collection(db, "referencias"), {
        user_id: user.uid, trabajo_id: trabajoId, ...form, cita_apa: cita,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Referencia añadida");
      setOpen(false);
      setForm({ tipo: "libro", autores: "", titulo: "", anio: new Date().getFullYear(), fuente: "", editorial: "", url: "", doi: "" });
      qc.invalidateQueries({ queryKey: ["referencias", trabajoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "referencias", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referencias", trabajoId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="size-4" /> Bibliografía APA 7ª · {refs?.length ?? 0}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4 mr-1" /> Añadir
        </Button>
      </div>

      {open && (
        <Card className="p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Año</Label>
              <Input type="number" value={form.anio ?? ""} onChange={(e) => setForm({ ...form, anio: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Autores (Apellido, A. A., &amp; Apellido, B. B.)</Label>
            <Input value={form.autores} onChange={(e) => setForm({ ...form, autores: e.target.value })} placeholder="García, M., & López, J." />
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fuente / Revista</Label>
              <Input value={form.fuente ?? ""} onChange={(e) => setForm({ ...form, fuente: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Editorial</Label>
              <Input value={form.editorial ?? ""} onChange={(e) => setForm({ ...form, editorial: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">DOI</Label>
              <Input value={form.doi ?? ""} onChange={(e) => setForm({ ...form, doi: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => addMutation.mutate()} disabled={!form.autores || !form.titulo || addMutation.isPending}>
              Guardar
            </Button>
          </div>
        </Card>
      )}

      {refs?.length ? (
        <ul className="space-y-2">
          {refs.map((r) => (
            <li key={r.id} className="text-sm p-3 rounded-md border bg-background flex items-start gap-2">
              <span className="flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: ((r as any).cita_apa ?? "").replace(/\*([^*]+)\*/g, "<em>$1</em>") }} />
              <Button size="sm" variant="ghost" onClick={() => delMutation.mutate((r as any).id)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-md">
          Sin referencias todavía
        </div>
      )}
    </div>
  );
}
