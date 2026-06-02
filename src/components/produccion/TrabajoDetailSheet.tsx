import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Download, Loader2, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { generarContenido, humanizarContenido } from "@/lib/ai-trabajos";
import { exportarTrabajoWord } from "@/lib/word-export";
import { exportarTrabajoExcel } from "@/lib/excel-export";
import { BibliografiaPanel } from "./BibliografiaPanel";
import { ArchivosPanel } from "./ArchivosPanel";

import { Trabajo, Materia } from "@/types";

export function TrabajoDetailSheet({
  trabajoId, open, onOpenChange, onEdit,
}: {
  trabajoId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [contenido, setContenido] = useState("");
  const [humanizado, setHumanizado] = useState("");
  const [busy, setBusy] = useState<null | "gen" | "hum" | "exp" | "xls">(null);

  const { data: trabajo, isLoading } = useQuery({
    enabled: !!trabajoId,
    queryKey: ["trabajo", trabajoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajos").select("*").eq("id", trabajoId!).single();
      if (error || !data) return null;
      let materiaData: Materia | null = null;
      if (data.materia_id) {
        const { data: matData } = await supabase.from("materias").select("*").eq("id", data.materia_id).single();
        if (matData) materiaData = matData as Materia;
      }
      return { ...data, materias: materiaData } as Trabajo;
    },
  });


  // ✅ Fix #2: Limpiar contenido al cambiar de trabajo (evita ver contenido del trabajo anterior)
  useEffect(() => {
    setContenido("");
    setHumanizado("");
  }, [trabajoId]);

  // ✅ Fix #3: Sincronizar estado desde los datos, solo cuando cambia el ID del trabajo
  useEffect(() => {
    if (trabajo) {
      setContenido(trabajo.contenido ?? "");
      setHumanizado(trabajo.contenido_humanizado ?? "");
    }
  }, [trabajo?.id]);

  const { data: refs } = useQuery({
    enabled: !!trabajoId,
    queryKey: ["referencias", trabajoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("referencias").select("*").eq("trabajo_id", trabajoId!).order("autores");
      if (error) throw error;
      return data;
    },
  });

  const saveContent = useMutation({
    mutationFn: async (patch: { contenido?: string; contenido_humanizado?: string }) => {
      if (!trabajoId) throw new Error("Sin trabajo seleccionado");
      const { error } = await supabase.from("trabajos").update(patch).eq("id", trabajoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trabajo", trabajoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: async () => {
      if (!trabajoId) throw new Error("Sin trabajo seleccionado");
      const { error } = await supabase.from("trabajos").delete().eq("id", trabajoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trabajo eliminado");
      qc.invalidateQueries({ queryKey: ["trabajos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Helper: obtiene el access token actual y lo envía al server fn como Bearer
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Debes iniciar sesión para usar la IA");
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const handleGenerar = async () => {
    if (!trabajo) return;
    setBusy("gen");
    try {
      const headers = await getAuthHeaders();
      const res = await generarContenido({
        headers,
        data: {
          titulo: trabajo.titulo, tipo: trabajo.tipo,
          descripcion: trabajo.descripcion ?? undefined,
          instrucciones: trabajo.instrucciones ?? undefined,
          objetivos: trabajo.objetivos ?? undefined,
          palabrasClave: trabajo.palabras_clave ?? undefined,
          paginas: trabajo.paginas_estimadas ?? 5,
        },
      });
      setContenido(res.contenido);
      await saveContent.mutateAsync({ contenido: res.contenido });
      toast.success("Contenido generado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando");
    } finally { setBusy(null); }
  };

  const handleHumanizar = async () => {
    if (!contenido?.trim()) { toast.error("Genera contenido primero"); return; }
    setBusy("hum");
    try {
      const headers = await getAuthHeaders();
      const res = await humanizarContenido({ headers, data: { contenido } });
      setHumanizado(res.contenido);
      await saveContent.mutateAsync({ contenido_humanizado: res.contenido });
      toast.success("Contenido humanizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error humanizando");
    } finally { setBusy(null); }
  };

  const handleExportar = async () => {
    if (!trabajo) return;
    setBusy("exp");
    try {
      const texto = humanizado?.trim() || contenido?.trim();
      if (!texto) { toast.error("Sin contenido para exportar"); setBusy(null); return; }

      // Cargar perfil para enriquecer la portada APA con nombre/programa del autor
      const { data: { user } } = await supabase.auth.getUser();
      let profile = null;
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        profile = profileData;
      }

      const blob = await exportarTrabajoWord({
        titulo: trabajo.titulo,
        autor: profile?.display_name ?? user?.email ?? undefined,
        institucion: profile?.programa ?? undefined,
        curso: trabajo.materias?.nombre ?? undefined,
        docente: trabajo.materias?.docente ?? undefined,
        contenido: texto,
        referencias: (refs as any)?.map((r: any) => r.cita_apa ?? "").filter(Boolean) ?? [],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${trabajo.titulo.replace(/[^a-z0-9]+/gi, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Documento descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error exportando");
    } finally { setBusy(null); }
  };

  const handleExportarExcel = async () => {
    if (!trabajo) return;
    setBusy("xls");
    try {
      const texto = humanizado?.trim() || contenido?.trim();
      if (!texto) { toast.error("Sin contenido para exportar"); setBusy(null); return; }

      const { data: { user } } = await supabase.auth.getUser();
      let profile = null;
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        profile = profileData;
      }

      const blob = await exportarTrabajoExcel({
        titulo: trabajo.titulo,
        tipo: trabajo.tipo,
        autor: profile?.display_name ?? user?.email ?? undefined,
        institucion: profile?.programa ?? undefined,
        curso: trabajo.materias?.nombre ?? undefined,
        docente: trabajo.materias?.docente ?? undefined,
        contenido: texto,
        referencias: (refs as any)?.map((r: any) => r.cita_apa ?? "").filter(Boolean) ?? [],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${trabajo.titulo.replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error exportando Excel");
    } finally { setBusy(null); }
  };
  // Antes: "if (!trabajo) return null" eliminaba el componente antes de que el Sheet
  // pudiera animarse al cerrar, causando un cierre abrupto sin transición.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        {isLoading || !trabajo ? (
          /* Skeleton de carga: visible mientras los datos llegan desde Supabase */
          <div className="flex flex-col gap-4 pt-6">
            <div className="h-7 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-28 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-40 rounded-md bg-muted animate-pulse mt-4" />
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <SheetTitle className="font-serif text-2xl">{trabajo.titulo}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize">{trabajo.tipo}</Badge>
                    {trabajo.materias && (
                      <Badge style={{ backgroundColor: trabajo.materias.color ?? undefined, color: "white" }}>
                        {trabajo.materias.nombre}
                      </Badge>
                    )}
                    {trabajo.fecha_entrega && (
                      <Badge variant="outline">
                        Entrega: {new Date(trabajo.fecha_entrega).toLocaleDateString("es-ES")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(trabajo.id)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={delMutation.isPending}
                    onClick={() => {
                      if (confirm("¿Eliminar este trabajo? Esta acción no se puede deshacer.")) {
                        delMutation.mutate();
                      }
                    }}
                  >
                    {delMutation.isPending
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4 text-destructive" />
                    }
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6">
              <Tabs defaultValue="fases">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="fases">Fases</TabsTrigger>
                  <TabsTrigger value="contenido">Contenido</TabsTrigger>
                  <TabsTrigger value="bibliografia">Bibliografía</TabsTrigger>
                  <TabsTrigger value="archivos">Archivos</TabsTrigger>
                </TabsList>

                <TabsContent value="fases" className="space-y-3 mt-4">
                  <FaseCard
                    titulo="Borrador"
                    tone="warning"
                    fecha={trabajo.borrador_fecha}
                    items={[
                      { label: "Notas", value: trabajo.borrador_notas },
                    ]}
                  />
                  <FaseCard
                    titulo="Revisión"
                    tone="primary"
                    fecha={trabajo.revision_fecha}
                    items={[
                      { label: "Revisor", value: trabajo.revision_revisor },
                      { label: "Comentarios", value: trabajo.revision_comentarios },
                    ]}
                  />
                  <FaseCard
                    titulo="Entrega"
                    tone="success"
                    fecha={trabajo.entrega_fecha_real}
                    items={[
                      { label: "Medio", value: trabajo.entrega_medio },
                      // @ts-ignore
                      { label: "Observaciones", value: trabajo.entrega_observaciones },
                      { label: "Nota", value: trabajo.nota != null ? `${trabajo.nota} / 100` : null },
                      { label: "Calificado el", value: trabajo.calificacion_fecha },
                    ]}
                  />
                  <div className="text-xs text-center text-muted-foreground pt-2">
                    Edita los detalles de cada fase desde el botón <Pencil className="size-3 inline" /> arriba.
                  </div>
                </TabsContent>

                <TabsContent value="contenido" className="space-y-4 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleGenerar} disabled={!!busy}>
                      {busy === "gen"
                        ? <Loader2 className="size-4 mr-2 animate-spin" />
                        : <Sparkles className="size-4 mr-2" />
                      }
                      Generar con IA
                    </Button>
                    <Button variant="outline" onClick={handleHumanizar} disabled={!!busy || !contenido}>
                      {busy === "hum"
                        ? <Loader2 className="size-4 mr-2 animate-spin" />
                        : <Wand2 className="size-4 mr-2" />
                      }
                      Humanizar
                    </Button>
                    <Button variant="outline" onClick={handleExportar} disabled={!!busy}>
                      {busy === "exp"
                        ? <Loader2 className="size-4 mr-2 animate-spin" />
                        : <Download className="size-4 mr-2" />
                      }
                      Exportar Word
                    </Button>
                    <Button variant="outline" onClick={handleExportarExcel} disabled={!!busy}>
                      {busy === "xls"
                        ? <Loader2 className="size-4 mr-2 animate-spin" />
                        : <FileSpreadsheet className="size-4 mr-2" />
                      }
                      Exportar Excel
                    </Button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Borrador (IA)</label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveContent.mutate({ contenido })}
                        disabled={saveContent.isPending}
                      >
                        {saveContent.isPending && <Loader2 className="size-3 animate-spin mr-1" />}
                        Guardar
                      </Button>
                    </div>
                    <Textarea
                      rows={10}
                      value={contenido}
                      onChange={(e) => setContenido(e.target.value)}
                      placeholder="Genera con IA o escribe tu contenido aquí (Markdown: ## Título)..."
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">Versión humanizada</label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveContent.mutate({ contenido_humanizado: humanizado })}
                        disabled={saveContent.isPending}
                      >
                        {saveContent.isPending && <Loader2 className="size-3 animate-spin mr-1" />}
                        Guardar
                      </Button>
                    </div>
                    <Textarea
                      rows={10}
                      value={humanizado}
                      onChange={(e) => setHumanizado(e.target.value)}
                      placeholder="Aparecerá tras humanizar..."
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="bibliografia" className="mt-4">
                  <BibliografiaPanel trabajoId={trabajo.id} />
                </TabsContent>

                <TabsContent value="archivos" className="mt-4">
                  <ArchivosPanel trabajoId={trabajo.id} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Tarjeta resumen de una fase del trabajo (Borrador / Revisión / Entrega). */
function FaseCard({
  titulo,
  tone,
  fecha,
  items,
}: {
  titulo: string;
  tone: "warning" | "primary" | "success";
  fecha: string | null | undefined;
  items: { label: string; value: string | number | null | undefined }[];
}) {
  const visibles = items.filter((i) => i.value != null && String(i.value).trim() !== "");
  const tieneInfo = visibles.length > 0 || !!fecha;
  const toneClass =
    tone === "warning" ? "border-l-warning"
    : tone === "primary" ? "border-l-primary"
    : "border-l-success";

  return (
    <div className={`rounded-md border border-border border-l-4 ${toneClass} p-4 bg-card`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{titulo}</h4>
        {fecha && (
          <span className="text-xs text-muted-foreground">
            {new Date(fecha).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>
      {tieneInfo ? (
        <dl className="space-y-1.5 text-sm">
          {visibles.map((i) => (
            <div key={i.label} className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="text-xs text-muted-foreground pt-0.5">{i.label}</dt>
              <dd className="text-sm whitespace-pre-wrap break-words">{i.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Sin información registrada para esta fase. Usa "Editar" para completarla.
        </p>
      )}
    </div>
  );
}
