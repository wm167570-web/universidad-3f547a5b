import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Materia, MateriaEstado } from "@/types";

const COLORS = ["#16a34a", "#0891b2", "#7c3aed", "#dc2626", "#d97706", "#0284c7", "#db2777", "#ea580c"];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  materia?: Materia | null;
};

export function MateriaFormDialog({ open, onOpenChange, userId, materia }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre: "", codigo: "", docente: "", creditos: 3,
    semestre: "", color: COLORS[0], descripcion: "",
    estado: "activo" as MateriaEstado,
  });

  const isEditing = !!materia;

  // Reset form when opening or changing materia
  useEffect(() => {
    if (open) {
      if (materia) {
        setForm({
          nombre: materia.nombre || "",
          codigo: materia.codigo || "",
          docente: materia.docente || "",
          creditos: materia.creditos || 3,
          semestre: materia.semestre || "",
          color: materia.color || COLORS[0],
          descripcion: materia.descripcion || "",
          estado: (materia.estado as MateriaEstado) || "activo",
        });
      } else {
        setForm({
          nombre: "", codigo: "", docente: "", creditos: 3,
          semestre: "", color: COLORS[0], descripcion: "",
          estado: "activo",
        });
      }
    }
  }, [open, materia]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: userId,
        nombre: form.nombre,
        codigo: form.codigo || null,
        docente: form.docente || null,
        creditos: form.creditos,
        semestre: form.semestre || null,
        color: form.color,
        descripcion: form.descripcion || null,
        estado: form.estado,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error } = await supabase.from("materias").update(payload).eq("id", materia!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materias").insert([{
          ...payload,
          created_at: new Date().toISOString(),
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Materia actualizada" : "Materia creada");
      qc.invalidateQueries({ queryKey: ["materias"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      console.error("Error al guardar materia:", e);
      toast.error(`Error al guardar: ${e.message || "Inténtalo de nuevo."}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl flex items-center gap-2">
            {isEditing ? <Pencil className="size-5" /> : <Plus className="size-5" />}
            {isEditing ? "Editar materia" : "Nueva materia"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mat-nombre">Nombre *</Label>
            <Input id="mat-nombre" required value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat-codigo">Código</Label>
              <Input id="mat-codigo" value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="MAT-101" />
            </div>
            <div>
              <Label htmlFor="mat-creditos">Créditos</Label>
              <Input id="mat-creditos" type="number" min={1} max={10} value={form.creditos}
                onChange={(e) => setForm({ ...form, creditos: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat-docente">Docente</Label>
              <Input id="mat-docente" value={form.docente}
                onChange={(e) => setForm({ ...form, docente: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="mat-semestre">Semestre</Label>
              <Input id="mat-semestre" value={form.semestre}
                onChange={(e) => setForm({ ...form, semestre: e.target.value })} placeholder="2025-I" />
            </div>
          </div>
          <div>
            <Label htmlFor="mat-estado">Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) => setForm({ ...form, estado: v as MateriaEstado })}
            >
              <SelectTrigger id="mat-estado">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="archivado">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color de identificación</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/30" : "border-transparent"}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="mat-desc">Descripción</Label>
            <Textarea id="mat-desc" rows={2} value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!form.nombre || save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            {isEditing ? "Guardar cambios" : "Crear materia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
