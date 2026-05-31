export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      materia_archivos: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          materia_id: string
          nombre: string
          storage_path: string
          tamanio: number | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          materia_id: string
          nombre: string
          storage_path: string
          tamanio?: number | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          materia_id?: string
          nombre?: string
          storage_path?: string
          tamanio?: number | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materia_archivos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      materia_encuentros: {
        Row: {
          created_at: string
          enlace_grabacion: string | null
          enlace_sesion: string | null
          fecha: string
          hora: string | null
          id: string
          materia_id: string
          notas: string | null
          tematica: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enlace_grabacion?: string | null
          enlace_sesion?: string | null
          fecha: string
          hora?: string | null
          id?: string
          materia_id: string
          notas?: string | null
          tematica: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enlace_grabacion?: string | null
          enlace_sesion?: string | null
          fecha?: string
          hora?: string | null
          id?: string
          materia_id?: string
          notas?: string | null
          tematica?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      materias: {
        Row: {
          codigo: string | null
          color: string | null
          created_at: string
          creditos: number | null
          descripcion: string | null
          docente: string | null
          estado: string
          id: string
          nombre: string
          resultados_aprendizaje: string | null
          semestre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo?: string | null
          color?: string | null
          created_at?: string
          creditos?: number | null
          descripcion?: string | null
          docente?: string | null
          estado?: string
          id?: string
          nombre: string
          resultados_aprendizaje?: string | null
          semestre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo?: string | null
          color?: string | null
          created_at?: string
          creditos?: number | null
          descripcion?: string | null
          docente?: string | null
          estado?: string
          id?: string
          nombre?: string
          resultados_aprendizaje?: string | null
          semestre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          creditos_disponibles: number
          creditos_usados: number
          display_name: string | null
          id: string
          is_approved: boolean
          programa: string | null
          semestre: number | null
          ultima_recarga: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          creditos_disponibles?: number
          creditos_usados?: number
          display_name?: string | null
          id?: string
          is_approved?: boolean
          programa?: string | null
          semestre?: number | null
          ultima_recarga?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          creditos_disponibles?: number
          creditos_usados?: number
          display_name?: string | null
          id?: string
          is_approved?: boolean
          programa?: string | null
          semestre?: number | null
          ultima_recarga?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referencias: {
        Row: {
          anio: number | null
          autores: string
          cita_apa: string | null
          created_at: string
          doi: string | null
          editorial: string | null
          fuente: string | null
          id: string
          tipo: string
          titulo: string
          trabajo_id: string
          url: string | null
          user_id: string
        }
        Insert: {
          anio?: number | null
          autores: string
          cita_apa?: string | null
          created_at?: string
          doi?: string | null
          editorial?: string | null
          fuente?: string | null
          id?: string
          tipo?: string
          titulo: string
          trabajo_id: string
          url?: string | null
          user_id: string
        }
        Update: {
          anio?: number | null
          autores?: string
          cita_apa?: string | null
          created_at?: string
          doi?: string | null
          editorial?: string | null
          fuente?: string | null
          id?: string
          tipo?: string
          titulo?: string
          trabajo_id?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referencias_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      tesis: {
        Row: {
          co_director: string | null
          created_at: string
          director: string | null
          estado: string
          fecha_defensa: string | null
          fecha_inicio: string | null
          id: string
          institucion: string | null
          palabras_actuales: number | null
          palabras_clave: string[] | null
          palabras_objetivo: number | null
          programa: string | null
          resumen: string | null
          subtitulo: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          co_director?: string | null
          created_at?: string
          director?: string | null
          estado?: string
          fecha_defensa?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion?: string | null
          palabras_actuales?: number | null
          palabras_clave?: string[] | null
          palabras_objetivo?: number | null
          programa?: string | null
          resumen?: string | null
          subtitulo?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          co_director?: string | null
          created_at?: string
          director?: string | null
          estado?: string
          fecha_defensa?: string | null
          fecha_inicio?: string | null
          id?: string
          institucion?: string | null
          palabras_actuales?: number | null
          palabras_clave?: string[] | null
          palabras_objetivo?: number | null
          programa?: string | null
          resumen?: string | null
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tesis_capitulos: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          fecha_limite: string | null
          id: string
          notas: string | null
          orden: number
          palabras_actuales: number | null
          palabras_objetivo: number | null
          tesis_id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_limite?: string | null
          id?: string
          notas?: string | null
          orden?: number
          palabras_actuales?: number | null
          palabras_objetivo?: number | null
          tesis_id: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_limite?: string | null
          id?: string
          notas?: string | null
          orden?: number
          palabras_actuales?: number | null
          palabras_objetivo?: number | null
          tesis_id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tesis_capitulos_tesis_id_fkey"
            columns: ["tesis_id"]
            isOneToOne: false
            referencedRelation: "tesis"
            referencedColumns: ["id"]
          },
        ]
      }
      tesis_documentos: {
        Row: {
          created_at: string
          id: string
          nombre: string
          storage_path: string
          tamanio: number | null
          tesis_id: string
          tipo: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          storage_path: string
          tamanio?: number | null
          tesis_id: string
          tipo?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          storage_path?: string
          tamanio?: number | null
          tesis_id?: string
          tipo?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tesis_documentos_tesis_id_fkey"
            columns: ["tesis_id"]
            isOneToOne: false
            referencedRelation: "tesis"
            referencedColumns: ["id"]
          },
        ]
      }
      tesis_hitos: {
        Row: {
          completado: boolean
          created_at: string
          descripcion: string | null
          fecha_completado: string | null
          fecha_limite: string
          id: string
          tesis_id: string
          titulo: string
          user_id: string
        }
        Insert: {
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha_completado?: string | null
          fecha_limite: string
          id?: string
          tesis_id: string
          titulo: string
          user_id: string
        }
        Update: {
          completado?: boolean
          created_at?: string
          descripcion?: string | null
          fecha_completado?: string | null
          fecha_limite?: string
          id?: string
          tesis_id?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tesis_hitos_tesis_id_fkey"
            columns: ["tesis_id"]
            isOneToOne: false
            referencedRelation: "tesis"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajo_archivos: {
        Row: {
          created_at: string
          id: string
          nombre: string
          storage_path: string
          tamanio: number | null
          tipo: string | null
          trabajo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          storage_path: string
          tamanio?: number | null
          tipo?: string | null
          trabajo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          storage_path?: string
          tamanio?: number | null
          tipo?: string | null
          trabajo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_archivos_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos: {
        Row: {
          borrador_fecha: string | null
          borrador_notas: string | null
          calificacion_fecha: string | null
          contenido: string | null
          contenido_humanizado: string | null
          created_at: string
          descripcion: string | null
          documento_url: string | null
          entrega_fecha_real: string | null
          entrega_medio: string | null
          entrega_observaciones: string | null
          estado: string
          fecha_entrega: string | null
          id: string
          instrucciones: string | null
          materia_id: string | null
          nota: number | null
          objetivos: string | null
          paginas_estimadas: number | null
          palabras_clave: string[] | null
          peso: number | null
          revision_comentarios: string | null
          revision_fecha: string | null
          revision_revisor: string | null
          tipo: string
          tipo_actividad: string | null
          titulo: string
          trayecto: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          borrador_fecha?: string | null
          borrador_notas?: string | null
          calificacion_fecha?: string | null
          contenido?: string | null
          contenido_humanizado?: string | null
          created_at?: string
          descripcion?: string | null
          documento_url?: string | null
          entrega_fecha_real?: string | null
          entrega_medio?: string | null
          entrega_observaciones?: string | null
          estado?: string
          fecha_entrega?: string | null
          id?: string
          instrucciones?: string | null
          materia_id?: string | null
          nota?: number | null
          objetivos?: string | null
          paginas_estimadas?: number | null
          palabras_clave?: string[] | null
          peso?: number | null
          revision_comentarios?: string | null
          revision_fecha?: string | null
          revision_revisor?: string | null
          tipo?: string
          tipo_actividad?: string | null
          titulo: string
          trayecto?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          borrador_fecha?: string | null
          borrador_notas?: string | null
          calificacion_fecha?: string | null
          contenido?: string | null
          contenido_humanizado?: string | null
          created_at?: string
          descripcion?: string | null
          documento_url?: string | null
          entrega_fecha_real?: string | null
          entrega_medio?: string | null
          entrega_observaciones?: string | null
          estado?: string
          fecha_entrega?: string | null
          id?: string
          instrucciones?: string | null
          materia_id?: string | null
          nota?: number | null
          objetivos?: string | null
          paginas_estimadas?: number | null
          palabras_clave?: string[] | null
          peso?: number | null
          revision_comentarios?: string | null
          revision_fecha?: string | null
          revision_revisor?: string | null
          tipo?: string
          tipo_actividad?: string | null
          titulo?: string
          trayecto?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_credit: {
        Args: { _user_email: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "estudiante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "estudiante"],
    },
  },
} as const
