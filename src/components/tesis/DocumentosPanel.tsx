import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, doc, deleteDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Trash2, Upload, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "tesis-documentos";

const TIPOS_DOC = [
  { id: "borrador", label: "Borrador" },
  { id: "capitulo", label: "Capítulo" },
  { id: "revision", label: "Revisión" },
  { id: "final", label: "Versión final" },
  { id: "otro", label: "Otro" },
];

type Documento = {
  id: string; nombre: string; storage_path: string;
  tipo: string | null; tamanio: number | null; version: string | null; created_at: string;
};

export function DocumentosPanel({ tesisId }: { tesisId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("borrador");
  const [version, setVersion] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["tesis-docs", tesisId],
    queryFn: async () => {
      const q = query(collection(db, "tesis_documentos"), where("tesis_id", "==", tesisId), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Documento[];
    },
  });

  const handleUpload = async (files: FileList) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const path = `${user.uid}/${tesisId}/${Date.now()}-${file.name}`;
        const storageRef = ref({ bucket: BUCKET }, path);
        await uploadBytes(storageRef, file);
        await addDoc(collection(db, "tesis_documentos"), {
          tesis_id: tesisId, user_id: user.uid,
          nombre: file.name, storage_path: path,
          tipo: tipoSeleccionado, tamanio: file.size,
          version: version || null,
          created_at: new Date().toISOString(),
        });
        ok++;
      } catch (e: any) {
        toast.error(`Error subiendo ${file.name}: ${e.message}`);
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(`${ok} archivo(s) subido(s)`);
      qc.invalidateQueries({ queryKey: ["tesis-docs"] });
    }
  };

  const delMutation = useMutation({
    mutationFn: async (docObj: Documento) => {
      await deleteObject(ref({ bucket: BUCKET }, docObj.storage_path));
      await deleteDoc(doc(db, "tesis_documentos", docObj.id));
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      qc.invalidateQueries({ queryKey: ["tesis-docs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const descargar = async (path: string, nombre: string) => {
    try {
      const url = await getDownloadURL(ref({ bucket: BUCKET }, path));
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = nombre;
      a.click();
    } catch (e: any) {
      toast.error("No se pudo generar el enlace: " + e.message);
    }
  };

  const TIPO_COLORS: Record<string, string> = {
    borrador: "#6b7280", capitulo: "#f59e0b", revision: "#3b82f6", final: "#22c55e", otro: "#a855f7",
  };

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>
        Repositorio de Documentos
      </h3>

      {/* Zona de subida */}
      <div className="rounded p-4" style={{ background: "rgba(35,5,5,0.6)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</label>
            <select value={tipoSeleccionado} onChange={(e) => setTipoSeleccionado(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-xs"
              style={{ background: "rgba(20,2,2,0.8)", borderColor: "rgba(245,158,11,0.25)", color: "#f5e6d3" }}>
              {TIPOS_DOC.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Versión (opcional)</label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1 h-8 text-xs" placeholder="v1.0" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Archivo(s)</label>
            <div className="mt-1 relative">
              <Input type="file" multiple disabled={uploading}
                onChange={(e) => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = ""; } }}
                className="h-8 text-xs cursor-pointer" />
            </div>
          </div>
          {uploading && <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "#f59e0b" }} />}
        </div>
      </div>

      {/* Lista de documentos */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin" style={{ color: "#f59e0b" }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 rounded border border-dashed" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
          <FolderOpen className="size-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No hay documentos subidos</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Sube versiones de tu manuscrito para tenerlas organizadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const color = TIPO_COLORS[doc.tipo ?? "otro"] ?? "#6b7280";
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded group"
                style={{ background: "rgba(35,5,5,0.6)", border: "1px solid rgba(245,158,11,0.12)" }}>
                <FileText className="size-5 shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: "#f5e6d3" }}>{doc.nombre}</p>
                    {doc.version && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}>
                        {doc.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TIPOS_DOC.find((t) => t.id === doc.tipo)?.label ?? "—"} · {((doc.tamanio ?? 0) / 1024).toFixed(1)} KB ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => descargar(doc.storage_path, doc.nombre)} className="h-7 w-7 p-0">
                    <Download className="size-3.5" style={{ color: "#f59e0b" }} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("¿Eliminar?")) delMutation.mutate(doc); }}
                    className="h-7 w-7 p-0">
                    <Trash2 className="size-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
