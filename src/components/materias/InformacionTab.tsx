import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Materia } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Info, Hash, User, GraduationCap, Trophy, Pencil, Trash2, Target, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export function InformacionTab({ materia }: { materia: Materia }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const outcomes = (materia as any).outcomes || [
    "Diseño de negocios responsables con impacto positivo en el entorno.",
    "Liderazgo ético orientado a la toma de decisiones sostenibles."
  ];

  const [editForm, setEditForm] = useState({
    descripcion: materia.descripcion || "",
    outcomes: [] as string[]
  });
  const [newOutcome, setNewOutcome] = useState("");

  const { data: trabajos = [] } = useQuery({
    queryKey: ["materia-notas", materia.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajos").select("*").eq("materia_id", materia.id);
      if (error) throw error;
      return data || [];
    },
  });

  const statsGrades = useMemo(() => {
    const conNota = trabajos.filter((t: any) => t.nota !== null);
    const totalPeso = conNota.reduce((s, t: any) => s + (Number(t.peso) || 0), 0);
    const promedio = totalPeso > 0
      ? conNota.reduce((s, t: any) => s + (Number(t.nota) || 0) * (Number(t.peso) || 0), 0) / totalPeso
      : conNota.length > 0
        ? conNota.reduce((s, t: any) => s + (Number(t.nota) || 0), 0) / conNota.length
        : 0;
    return { promedio, count: conNota.length };
  }, [trabajos]);

  const handleOpenEdit = () => {
    setEditForm({
      descripcion: materia.descripcion || "",
      outcomes: [...outcomes]
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase.from("materias").update({
        descripcion: editForm.descripcion,
        outcomes: editForm.outcomes as any
      } as any).eq("id", materia.id);
      if (error) throw error;
      
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["materias"] });
      toast.success("Información actualizada correctamente");
    } catch (e: any) {
      toast.error("Error al guardar: " + e.message);
    }
  };

  const addOutcome = () => {
    if (!newOutcome.trim()) return;
    setEditForm({ ...editForm, outcomes: [...editForm.outcomes, newOutcome.trim()] });
    setNewOutcome("");
  };

  const removeOutcome = (index: number) => {
    const next = [...editForm.outcomes];
    next.splice(index, 1);
    setEditForm({ ...editForm, outcomes: next });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Cards de Información Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard 
          icon={Hash} 
          label="Código de Materia" 
          value={materia.codigo || "MAT-104"} 
        />
        <InfoCard 
          icon={User} 
          label="Docente a Cargo" 
          value={materia.docente || "No asignado"} 
        />
        <InfoCard 
          icon={GraduationCap} 
          label="Carga Académica" 
          value={materia.creditos ? `${materia.creditos} Créditos` : "—"} 
        />
        <Card className="border-primary/50 bg-primary/10 backdrop-blur-sm group transition-all duration-300">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground transition-colors shadow-glow-sm">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Promedio Actual</p>
              <p className="text-xl font-serif font-bold mt-0.5 text-primary">
                {statsGrades.count > 0 ? statsGrades.promedio.toFixed(2) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleOpenEdit} className="gap-2 border-primary/30 text-foreground font-medium">
          <Pencil className="size-3.5" /> Editar Información
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Descripción del Curso */}
        <Card className="border-border/40 bg-muted/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Info className="size-4" />
              </div>
              <h3 className="font-serif text-lg font-medium">Descripción del Curso</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {materia.descripcion || "Sin descripción disponible."}
            </p>
          </CardContent>
        </Card>

        {/* Resultados de Aprendizaje */}
        <Card className="border-border/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Target className="size-4" />
              </div>
              <h3 className="font-serif text-lg font-medium">Resultados de Aprendizaje</h3>
            </div>
            <ul className="space-y-3">
              {outcomes.length > 0 ? outcomes.map((text: string, i: number) => (
                <LearningOutcome key={i} text={text} />
              )) : (
                <p className="text-xs text-muted-foreground italic">No se han definido resultados de aprendizaje.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Información de la Materia</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Descripción del Curso</Label>
              <Textarea 
                id="desc" 
                rows={4}
                value={editForm.descripcion}
                onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                placeholder="Describe el propósito y alcance de la materia..."
              />
            </div>
            
            <div className="space-y-3">
              <Label>Resultados de Aprendizaje</Label>
              <div className="flex gap-2">
                <Input 
                  value={newOutcome} 
                  onChange={e => setNewOutcome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOutcome()}
                  placeholder="Nuevo resultado (ej. Dominio de herramientas ASG)"
                />
                <Button onClick={addOutcome} size="sm">Agregar</Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {editForm.outcomes.map((text, i) => (
                  <div key={i} className="flex items-start gap-2 bg-muted/30 p-2 rounded border border-border/40 group">
                    <p className="text-xs flex-1">{text}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeOutcome(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur-sm group transition-all duration-300">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground transition-colors">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-foreground font-bold">{label}</p>
          <p className="text-sm font-semibold mt-0.5 text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LearningOutcome({ text }: { text: string }) {
  return (
    <li className="flex gap-3 text-sm text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/20">
      <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Lightbulb className="size-3 text-primary" />
      </div>
      <span>{text}</span>
    </li>
  );
}
