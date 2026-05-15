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

export type MateriaEstado = "activo" | "inactivo" | "archivado";

export interface Materia {
  id: string;
  user_id: string;
  nombre: string;
  estado: MateriaEstado | string;
  codigo?: string | null;
  docente?: string | null;
  creditos?: number | null;
  semestre?: string | null;
  color?: string | null;
  descripcion?: string | null;
  created_at?: string;
  updated_at?: string;
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
  trayecto?: number;
  tipo_actividad?: string;
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
  entrega_observations?: string;
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
  institucion?: string;
  programa?: string;
  estado?: string;
  fecha_inicio?: any;
  fecha_fin?: any;
  objetivos?: string;
  metodologia?: string;
  avance?: number;
  notas?: string;
  fecha_defensa?: any;
  palabras_objetivo?: number;
  palabras_actuales?: number;
  resumen?: string;
  palabras_clave?: string[];
  [key: string]: any;
}
