import { supabase } from "@/integrations/supabase/client";

type StorageRef = { bucket: string; path: string };

const DEFAULT_BUCKET = "app-files";

export function getStorage(_app?: unknown) {
  return { bucket: DEFAULT_BUCKET };
}

export function ref(storageOrRef: { bucket?: string } | StorageRef, path?: string): StorageRef {
  if (path === undefined && "path" in storageOrRef) return storageOrRef;
  return { bucket: storageOrRef.bucket || DEFAULT_BUCKET, path: path || "" };
}

export async function uploadBytes(storageRef: StorageRef, file: File) {
  const { data, error } = await (supabase as any).storage.from(storageRef.bucket).upload(storageRef.path, file, { upsert: true });
  if (error) throw error;
  return { ref: storageRef, metadata: data };
}

export async function getDownloadURL(storageRef: StorageRef) {
  const { data, error } = await (supabase as any).storage.from(storageRef.bucket).createSignedUrl(storageRef.path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteObject(storageRef: StorageRef) {
  const { error } = await (supabase as any).storage.from(storageRef.bucket).remove([storageRef.path]);
  if (error) throw error;
}