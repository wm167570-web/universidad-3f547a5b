import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Calendar, Star, CheckCircle2, FileText, Info, Video } from "lucide-react";
import { NotasTab } from "./NotasTab";
import { RepositorioTab } from "./RepositorioTab";
import { TareasTab } from "./TareasTab";
import { InformacionTab } from "./InformacionTab";
import { EncuentrosTab } from "./EncuentrosTab";
import { Materia } from "@/types";

function materiaEstadoLabel(estado: string) {
  switch (estado) {
    case "activo":
      return "Activo";
    case "inactivo":
      return "Inactivo";
    case "archivado":
      return "Archivado";
    default:
      return estado;
  }
}

export function MateriaDetailPanel({ materia }: { materia: Materia }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="px-6 py-5 border-b border-border" style={{ borderTopColor: materia.color ?? "#16a34a", borderTopWidth: 4 }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-2xl font-semibold">{materia.nombre}</h2>
              <Badge variant={materia.estado === "activo" ? "default" : "secondary"}>
                {materiaEstadoLabel(materia.estado)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {materia.codigo && (
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{materia.codigo}</span>
              )}
              {materia.docente && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="size-3.5" />{materia.docente}
                </span>
              )}
              {materia.creditos && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <BookOpen className="size-3.5" />{materia.creditos} créditos
                </span>
              )}
              {materia.semestre && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="size-3.5" />{materia.semestre}
                </span>
              )}
            </div>
            {materia.descripcion && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{materia.descripcion}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Tabs defaultValue="informacion">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="informacion" className="flex-1 transition-all">
              <Info className="size-4 mr-2" />Información General
            </TabsTrigger>
            <TabsTrigger value="encuentros" className="flex-1 transition-all">
              <Video className="size-4 mr-2" />Encuentros Sincrónicos
            </TabsTrigger>
            <TabsTrigger value="notas" className="flex-1 transition-all">
              <Star className="size-4 mr-2" />Notas
            </TabsTrigger>
            <TabsTrigger value="tareas" className="flex-1 transition-all">
              <CheckCircle2 className="size-4 mr-2" />Tareas
            </TabsTrigger>
            <TabsTrigger value="repositorio" className="flex-1 transition-all">
              <FileText className="size-4 mr-2" />Repositorio
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="informacion" className="mt-6">
            <InformacionTab materia={materia} />
          </TabsContent>
          <TabsContent value="encuentros" className="mt-6">
            <EncuentrosTab materiaId={materia.id} />
          </TabsContent>
          <TabsContent value="notas" className="mt-6">
            <NotasTab materiaId={materia.id} />
          </TabsContent>
          <TabsContent value="tareas" className="mt-6">
            <TareasTab materiaId={materia.id} />
          </TabsContent>
          <TabsContent value="repositorio" className="mt-6">
            <RepositorioTab materiaId={materia.id} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
