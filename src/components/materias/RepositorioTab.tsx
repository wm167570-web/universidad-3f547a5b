import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, doc, deleteDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Download, Trash2, Upload, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "materia-archivos";

/**
 * Repositorio de archivos por materia.
 *
 * IMPORTANTE: Este repositorio es INDEPENDIENTE del módulo de Producción.
 * - Aquí se guarda documentación general de la materia: programas, lecturas,
 *   apuntes, presentaciones, bibliografía base, etc.
 * - En Producción se guardan los archivos vinculados a un trabajo específico
 *   (borradores, anexos del trabajo). Son repositorios distintos a propósito.
 *
 * Usa la tabla `materia_archivos` y el bucket `materia-archivos`.
 */
import { Archivo } from "@/types";

export function RepositorioTab({ materiaId }: { materiaId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: archivos = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["materia-archivos", materiaId],
    queryFn: async () => {
      const q = query(collection(db, "materia_archivos"), where("materia_id", "==", materiaId), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Archivo[];
    },
  });


  const handleUpload = async (files: FileList) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Sanitizar nombre para Storage (solo ASCII)
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w.\-]+/g, "_")
          .replace(/_+/g, "_");
        const path = `${user.uid}/${materiaId}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);

        await addDoc(collection(db, "materia_archivos"), {
          user_id: user.uid,
          materia_id: materiaId,
          nombre: file.name,
          storage_path: path,
          tipo: file.type || "application/octet-stream",
          tamanio: file.size,
          created_at: new Date().toISOString(),
        });
        ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Error subiendo ${file.name}: ${msg}`);
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(`${ok} archivo(s) agregados al repositorio`);
      qc.invalidateQueries({ queryKey: ["materia-archivos", materiaId] });
    }
  };

  const remove = useMutation({
    mutationFn: async (a: { id: string; storage_path: string }) => {
      await deleteObject(ref(storage, a.storage_path));
      await deleteDoc(doc(db, "materia_archivos", a.id));
    },
    onSuccess: () => {
      toast.success("Archivo eliminado");
      qc.invalidateQueries({ queryKey: ["materia-archivos", materiaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const descargar = async (path: string, nombre: string) => {
    try {
      const url = await getDownloadURL(ref(storage, path));
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = nombre;
      a.click();
    } catch (e: any) {
      toast.error("No se pudo generar el enlace: " + e.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Aclaración: este repositorio es solo de la materia */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <FolderOpen className="size-4 mt-0.5 shrink-0 text-primary" />
        <div>
          Repositorio general de la materia: programas, lecturas, apuntes y bibliografía base.
          Los archivos de cada trabajo se gestionan dentro de su ficha en <strong>Producción</strong>.
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files?.length) handleUpload(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploading) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-md border-2 border-dashed py-8 px-4 text-center text-sm transition-colors
          ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/30"}
          ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Subiendo...
          </div>
        ) : (
          <>
            <Upload className="size-6 mx-auto mb-2 opacity-60" />
            <div className="font-medium text-foreground mb-0.5">
              Haz clic o arrastra archivos aquí
            </div>
            <div className="text-xs text-muted-foreground">
              Cualquier tipo de archivo: PDF, Word, Excel, imágenes, ZIP, videos…
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : archivos.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground py-4">Aún no hay documentos en el repositorio de esta materia.</p>
      ) : (
        <div className="space-y-2">
          {archivos.map((a) => (
            <Card key={a.id} className="p-3 flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.nombre}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {((a.tamanio ?? 0) / 1024).toFixed(1)} KB · {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => descargar(a.storage_path, a.nombre)}>
                <Download className="size-4" />
              </Button>
              <Button size="sm" variant="ghost"
                onClick={() => { if (confirm(`¿Eliminar "${a.nombre}"?`)) remove.mutate({ id: a.id, storage_path: a.storage_path }); }}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
