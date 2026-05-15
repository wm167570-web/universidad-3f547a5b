import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, doc, deleteDoc, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, FileText, Loader2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "trabajo-archivos";

const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        // Rename ext to .jpg since we use image/jpeg
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        resolve(new File([blob], newName, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
  });
};

import { Archivo } from "@/types";

export function ArchivosPanel({ trabajoId }: { trabajoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: archivos } = useQuery({
    enabled: !!user,
    queryKey: ["archivos", trabajoId],
    queryFn: async () => {
      const q = query(collection(db, "trabajo_archivos"), where("trabajo_id", "==", trabajoId), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Archivo[];
    },
  });


  const handleUploadMultiple = async (files: FileList) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      try {
        // Compresión automática de imágenes
        if (file.type.startsWith('image/')) {
          file = await compressImage(file);
        }
        
        // Sanitizar nombre: Supabase Storage solo acepta ASCII en las keys.
        // Removemos tildes, espacios y caracteres especiales.
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w.\-]+/g, "_")
          .replace(/_+/g, "_");
        const path = `${user.uid}/${trabajoId}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        
        await addDoc(collection(db, "trabajo_archivos"), {
          user_id: user.uid,
          trabajo_id: trabajoId,
          nombre: file.name,
          storage_path: path,
          tipo: file.type,
          tamanio: file.size,
          created_at: new Date().toISOString(),
        });
        successCount++;
      } catch (err: any) {
        toast.error(`Error subiendo ${file.name}: ${err.message}`);
      }
    }
    
    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s) correctamente`);
      qc.invalidateQueries({ queryKey: ["archivos", trabajoId] });
    }
  };

  const removeMutation = useMutation({
    mutationFn: async (a: { id: string; storage_path: string }) => {
      await deleteObject(ref(storage, a.storage_path));
      await deleteDoc(doc(db, "trabajo_archivos", a.id));
    },
    onSuccess: () => {
      toast.success("Archivo eliminado");
      qc.invalidateQueries({ queryKey: ["archivos", trabajoId] });
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
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files?.length) handleUploadMultiple(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) inputRef.current?.click();
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleUploadMultiple(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-md border-2 border-dashed py-6 px-4 text-center text-xs transition-colors
          ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/30"}
          ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Subiendo...
          </div>
        ) : (
          <>
            <Upload className="size-5 mx-auto mb-2 opacity-60" />
            <div className="font-medium text-foreground mb-0.5">
              Haz clic o arrastra archivos aquí
            </div>
            <div className="text-muted-foreground">
              PDFs, imágenes o documentos · las imágenes se comprimen automáticamente
            </div>
          </>
        )}
      </div>

      {archivos?.length ? (
        <div className="space-y-2">
          {archivos.map((a) => (
            <Card key={a.id} className="p-3 flex items-center gap-3">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{a.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {((a.tamanio ?? 0) / 1024).toFixed(1)} KB
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => descargar(a.storage_path, a.nombre)}>
                <Download className="size-4" />
              </Button>
              <Button size="sm" variant="ghost"
                onClick={() => removeMutation.mutate({ id: a.id, storage_path: a.storage_path })}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
