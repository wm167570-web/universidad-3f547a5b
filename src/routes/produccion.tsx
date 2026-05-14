import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, LayoutGrid, List } from "lucide-react";
import { TrabajoFormDialog, type TrabajoFormValues } from "@/components/produccion/TrabajoFormDialog";
import { TrabajoDetailSheet } from "@/components/produccion/TrabajoDetailSheet";
import { KanbanBoard } from "@/components/produccion/KanbanBoard";
import { toast } from "sonner";

type ProduccionSearch = {
  tab?: string;
  materia?: string;
  fecha?: string;
  selected?: string;
};

export const Route = createFileRoute("/produccion")({
  validateSearch: (search: Record<string, unknown>): ProduccionSearch => {
    return {
      tab: (search.tab as string) || "kanban",
      materia: (search.materia as string) || "todas",
      fecha: (search.fecha as string) || "",
      selected: (search.selected as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Producción Académica — AcadémicoPro" },
      { name: "description", content: "Gestiona trabajos académicos: redacción con IA, bibliografía APA, archivos y exportación Word." },
    ],
  }),
  component: ProduccionPage,
});

const ESTADO_LABEL: Record<string, string> = {
  investigacion: "Investigación",
  borrador: "Borrador",
  revision: "Revisión",
  entrega: "Entrega",
};

function ProduccionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<TrabajoFormValues> | undefined>();
  const searchParams = Route.useSearch();
  const { tab = "kanban", materia = "todas", fecha = "", selected } = searchParams;
  
  const setSelected = (id: string | null) => navigate({ to: "/produccion", search: (p: ProduccionSearch) => ({ ...p, selected: id || undefined }) });
  const setFilterMateria = (m: string) => navigate({ to: "/produccion", search: (p: ProduccionSearch) => ({ ...p, materia: m }) });
  const setFilterFecha = (f: string) => navigate({ to: "/produccion", search: (p: ProduccionSearch) => ({ ...p, fecha: f }) });
  const setTab = (t: string) => navigate({ to: "/produccion", search: (p: ProduccionSearch) => ({ ...p, tab: t }) });


  const { data: trabajos } = useQuery({
    enabled: !!user,
    queryKey: ["trabajos", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "trabajos"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      await updateDoc(doc(db, "trabajos", id), { estado });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trabajos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const t = trabajos ?? [];
    return {
      total: t.length,
      pendientes: t.filter((x) => x.estado !== "entrega").length,
      proximos: t.filter((x) => x.fecha_entrega && new Date(x.fecha_entrega).getTime() - Date.now() < 7 * 86400000 && x.estado !== "entrega").length,
    };
  }, [trabajos]);

  const materiasDisponibles = useMemo(() => {
    const s = new Set<string>();
    trabajos?.forEach(t => { if (t.materias?.nombre) s.add(t.materias.nombre); });
    return Array.from(s).sort();
  }, [trabajos]);

  const trabajosFiltrados = useMemo(() => {
    let t = trabajos ?? [];
    if (materia !== "todas") {
      t = t.filter(x => x.materias?.nombre === materia);
    }
    if (fecha) {
      t = t.filter(x => x.fecha_entrega && x.fecha_entrega.startsWith(fecha));
    }
    return t;
  }, [trabajos, materia, fecha]);

  const handleEdit = (id: string) => {
    const t = trabajos?.find((x) => x.id === id);
    if (!t) return;
    setEditing({
      id: t.id,
      titulo: t.titulo,
      tipo: t.tipo,
      estado: t.estado,
      materia_id: t.materia_id,
      descripcion: t.descripcion ?? "",
      instrucciones: t.instrucciones ?? "",
      objetivos: t.objetivos ?? "",
      palabras_clave: (t.palabras_clave ?? []).join(", "),
      paginas_estimadas: t.paginas_estimadas ?? 5,
      fecha_entrega: t.fecha_entrega ?? "",
      peso: t.peso?.toString() ?? "",
      borrador_notas: t.borrador_notas ?? "",
      borrador_fecha: t.borrador_fecha ?? "",
      revision_comentarios: t.revision_comentarios ?? "",
      revision_revisor: t.revision_revisor ?? "",
      revision_fecha: t.revision_fecha ?? "",
      entrega_fecha_real: t.entrega_fecha_real ?? "",
      entrega_medio: t.entrega_medio ?? "",
      entrega_observaciones: t.entrega_observaciones ?? "",
      nota: t.nota?.toString() ?? "",
      calificacion_fecha: t.calificacion_fecha ?? "",
    });
    setSelected(null);
    setFormOpen(true);
  };

  if (loading || !user) return null;

  return (
    <AppShell>
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Producción</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-1">Trabajos académicos</h1>
        </div>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="size-4 mr-2" /> Nuevo trabajo
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pendientes" value={stats.pendientes} />
        <StatCard label="Próximos 7 días" value={stats.proximos} tone="warning" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kanban"><LayoutGrid className="size-4 mr-2" />Kanban</TabsTrigger>
          <TabsTrigger value="tabla"><List className="size-4 mr-2" />Tabla</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {trabajos?.length ? (
            <KanbanBoard
              trabajos={trabajos.map((t) => ({ id: t.id, titulo: t.titulo, estado: t.estado, tipo: t.tipo, fecha_entrega: t.fecha_entrega }))}
              onMove={(id, estado) => moveMutation.mutate({ id, estado })}
              onSelect={(id) => setSelected(id)}
            />
          ) : <EmptyState onCreate={() => setFormOpen(true)} />}
        </TabsContent>

        <TabsContent value="tabla" className="mt-4">
          <Card>
            <div className="p-4 border-b flex gap-4 items-center bg-muted/20">
              <div className="flex-1 max-w-[200px]">
                <Select value={materia} onValueChange={setFilterMateria}>
                  <SelectTrigger><SelectValue placeholder="Todas las materias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las materias</SelectItem>
                    {materiasDisponibles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 max-w-[200px]">
                <Input type="date" value={fecha} onChange={(e) => setFilterFecha(e.target.value)} placeholder="Fecha de entrega" />
              </div>
              {(materia !== "todas" || fecha) && (
                <Button variant="ghost" onClick={() => { setFilterMateria("todas"); setFilterFecha(""); }}>Limpiar filtros</Button>
              )}
            </div>

            <CardContent className="p-0">
              {/* ✅ Fix: distinguir "sin trabajos" de "filtros sin resultados" */}
              {!trabajos?.length ? (
                <EmptyState onCreate={() => setFormOpen(true)} />
              ) : trabajosFiltrados.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Materia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trabajosFiltrados.map((t) => (
                      <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t.id)}>
                        <TableCell className="font-medium">{t.titulo}</TableCell>
                        <TableCell>{t.materias?.nombre ?? "—"}</TableCell>
                        <TableCell className="capitalize">{t.tipo}</TableCell>
                        <TableCell><Badge variant="secondary">{ESTADO_LABEL[t.estado] ?? t.estado}</Badge></TableCell>
                        <TableCell>{t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleDateString("es-ES") : "—"}</TableCell>
                        <TableCell>{t.peso ? `${t.peso}%` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No hay trabajos que coincidan con los filtros seleccionados.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TrabajoFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      <TrabajoDetailSheet
        trabajoId={selected ?? null}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onEdit={handleEdit}
      />
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <Card className={tone === "warning" ? "border-warning/40" : ""}>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-serif text-3xl mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <FileText className="size-12 mx-auto text-muted-foreground/50 mb-3" />
      <h3 className="font-serif text-xl mb-1">Sin trabajos todavía</h3>
      <p className="text-sm text-muted-foreground mb-4">Crea tu primer trabajo y genera su contenido con IA.</p>
      <Button onClick={onCreate}><Plus className="size-4 mr-2" />Nuevo trabajo</Button>
    </div>
  );
}
