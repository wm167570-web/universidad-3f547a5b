import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Microscope, LayoutGrid, Flag, FolderOpen } from "lucide-react";

import { TesisInfoPanel, CrearTesisCard } from "@/components/tesis/TesisInfoPanel";
import { CapitulosKanban } from "@/components/tesis/CapitulosKanban";
import { HitosTimeline } from "@/components/tesis/HitosTimeline";
import { DocumentosPanel } from "@/components/tesis/DocumentosPanel";

type TesisSearch = {
  tab?: string;
};

export const Route = createFileRoute("/tesis")({
  validateSearch: (search: Record<string, unknown>): TesisSearch => {
    return {
      tab: (search.tab as string) || "capitulos",
    };
  },
  head: () => ({
    meta: [
      { title: "Tesis — AcadémicoPro" },
      { name: "description", content: "Gestiona tu proyecto de tesis: capítulos, cronograma, documentos y avance." },
    ],
  }),
  component: TesisPage,
});

import { Tesis } from "@/types";

function TesisPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { tab = "capitulos" } = Route.useSearch();
  const setTab = (t: string) => navigate({ to: "/tesis", search: { tab: t } as TesisSearch });


  const { data: tesis, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["tesis", user?.uid],
    queryFn: async () => {
      const q = query(collection(db, "tesis"), where("user_id", "==", user!.uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { ...doc.data(), id: doc.id } as any;
    },
  });


  if (loading || !user) return null;

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-3">
        <div className="size-10 rounded flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Microscope className="size-5" style={{ color: "#f59e0b", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.6))" }} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Investigación</p>
          <h1 className="font-serif text-2xl font-bold" style={{ color: "#fbbf24" }}>MÓDULO DE TESIS</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin" style={{ color: "#f59e0b" }} />
        </div>
      ) : !tesis ? (
        <div className="rounded-xl min-h-[400px] flex items-center justify-center"
          style={{ background: "rgba(35,5,5,0.7)", border: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(12px)" }}>
          <CrearTesisCard userId={user.uid} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Panel de información / header de la tesis */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: "rgba(35,5,5,0.72)", border: "1px solid rgba(245,158,11,0.2)", backdropFilter: "blur(12px)" }}>
            {/* @ts-ignore */}
            <TesisInfoPanel tesis={tesis} />
          </div>


          {/* Tabs de gestión */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: "rgba(35,5,5,0.72)", border: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(12px)" }}>
            <div className="p-6">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="capitulos" className="flex-1">
                    <LayoutGrid className="size-4 mr-2" />Capítulos
                  </TabsTrigger>
                  <TabsTrigger value="cronograma" className="flex-1">
                    <Flag className="size-4 mr-2" />Cronograma
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="flex-1">
                    <FolderOpen className="size-4 mr-2" />Documentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="capitulos">
                  <CapitulosKanban tesisId={tesis.id} userId={user.uid} />
                </TabsContent>

                <TabsContent value="cronograma">
                  <HitosTimeline tesisId={tesis.id} userId={user.uid} />
                </TabsContent>

                <TabsContent value="documentos">
                  <DocumentosPanel tesisId={tesis.id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
