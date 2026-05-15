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
  trayecto?: string; // requested
  tipo_actividad?: string; // requested
}

export interface Tarea {
  id: string;
  titulo: string;
  estado: string;
  tipo: string;
  fecha_entrega: any;
  peso: number;
  materia_id?: string;
  nota?: number;
  contenido?: string;
}

export interface Trabajo extends Tarea {
  user_id: string;
  nombre?: string;
  materias?: Materia | null;

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
  contenido_humanizado?: string;
}


export interface Archivo {
  id: string;
  nombre: string;
  tamanio: number;
  storage_path: string;
  created_at: any;
}

export interface Tesis {
  id: string;
  titulo: string;
  subtitulo: string;
  director: string;
  co_director: string;
  [key: string]: any;
}
