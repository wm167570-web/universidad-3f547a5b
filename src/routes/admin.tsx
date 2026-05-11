import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Users, Check, X, Shield, Trash2,
  UserCheck, AlertCircle, Search, Mail
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "@/components/AppSidebar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
});

function AdminPanel() {
  const { user, role, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const isSuperAdmin = user?.email === "wmartinezm360@gmail.com";

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && role === "admin",
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario aprobado correctamente");
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: false })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Acceso revocado");
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ["admin-users"] });
      const prev = queryClient.getQueryData<any[]>(["admin-users"]);
      queryClient.setQueryData<any[]>(["admin-users"], (old) =>
        (old || []).filter((u) => u.user_id !== userId)
      );
      return { prev };
    },
    onError: (err: any, _id, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-users"], ctx.prev);
      toast.error("Error: " + err.message);
    },
    onSuccess: () => toast.success("Usuario eliminado permanentemente"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  if (loading || isLoading) return null;

  if (!user || role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const filteredUsers = users?.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Shield className="size-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Panel de Administración</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuarios..." 
                className="pl-9 bg-background/50 border-primary/20 focus:border-primary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              label="Total Usuarios" 
              value={users?.length || 0} 
              icon={Users} 
              color="text-blue-400" 
            />
            <StatCard 
              label="Pendientes" 
              value={users?.filter(u => !u.is_approved).length || 0} 
              icon={AlertCircle} 
              color="text-amber-400" 
            />
            <StatCard 
              label="Aprobados" 
              value={users?.filter(u => u.is_approved).length || 0} 
              icon={UserCheck} 
              color="text-green-400" 
            />
          </div>

          <div className="rounded-xl border border-primary/10 bg-card/20 backdrop-blur-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/5 text-xs uppercase tracking-widest text-muted-foreground border-b border-primary/10">
                  <th className="px-6 py-4 font-medium">Usuario</th>
                  <th className="px-6 py-4 font-medium">Programa/Semestre</th>
                  <th className="px-6 py-4 font-medium">Fecha Registro</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredUsers?.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                          {u.display_name?.charAt(0) || <Users className="size-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{u.display_name}</div>
                          <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Mail className="size-3" /> {u.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        {u.programa || "No especificado"}
                        {u.semestre && <span className="ml-1 text-muted-foreground">({u.semestre}º)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_approved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                          Aprobado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {u.is_approved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => rejectMutation.mutate(u.user_id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-400 hover:bg-green-400/10"
                            onClick={() => approveMutation.mutate(u.user_id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="size-4" />
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                            onClick={() => setConfirmDeleteId(u.user_id)}
                            disabled={deleteMutation.isPending}
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro del perfil será eliminado de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 rounded-xl border border-primary/10 bg-card/20 backdrop-blur-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-background/50 ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
