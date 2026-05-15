export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email?: string;
  is_approved: boolean;
  creditos_disponibles: number;
  creditos_usados?: number;
  programa?: string;
  semestre?: number;
  created_at: string;
  updated_at?: string;
}

export interface Materia {
  id: string;
  nombre: string;
  estado: string;
  codigo?: string;
  docente?: string;
  creditos?: number;
  semestre?: string;
  color?: string;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Trabajo {
  id: string;
  titulo: string;
  nombre?: string; // requested by user
  estado: string;
  tipo: string;
  fecha_entrega: string;
  peso?: number;
  nota?: number;
  materia_id: string;
  user_id: string;
  materias?: {
    nombre: string;
  };
  descripcion?: string;
  instrucciones?: string;
  objetivos?: string;
  palabras_clave?: string[];
  paginas_estimadas?: number;
  created_at: string;
  updated_at?: string;
  // Campos de producción
  borrador_notas?: string;
  borrador_fecha?: string;
  revision_comentarios?: string;
  revision_revisor?: string;
  revision_fecha?: string;
  entrega_fecha_real?: string;
  entrega_medio?: string;
  entrega_observaciones?: string;
  calificacion_fecha?: string;
}
