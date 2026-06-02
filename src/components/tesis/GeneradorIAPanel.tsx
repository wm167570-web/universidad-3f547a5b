import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileUp, FileDown, Sparkles, Wand2, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  generarDefinicionTema,
  generarPlanteamientoProblema,
  generarMarcoTeorico,
  generarMetodologia,
  generarAnalisisResultados,
  generarDiscusionResultados,
  generarConclusiones,
  humanizarTextoTesis,
  ensamblarTesisFinal
} from "@/server/ai-tesis";
import { exportarTesisWord } from "@/lib/word-export-tesis";
import { supabase } from "@/integrations/supabase/client";

export function GeneradorIAPanel({ tituloTesis }: { tituloTesis?: string }) {
  const [plantillaStr, setPlantillaStr] = useState<string | null>(null);
  const [plantillaExt, setPlantillaExt] = useState<string | null>(null);
  const [plantillaNombre, setPlantillaNombre] = useState<string | null>(null);

  // Estados de carga generales
  const [isEnsamblando, setIsEnsamblando] = useState(false);

  // Componente 1: Definición de la Tesis
  const [area, setArea] = useState("");
  const [tema, setTema] = useState("");
  const [loading1, setLoading1] = useState(false);

  // Componente 2: Planteamiento
  const [planteamiento, setPlanteamiento] = useState("");
  const [loading2, setLoading2] = useState(false);

  // Componente 3: Marco Teórico
  const [marcoTeorico, setMarcoTeorico] = useState("");
  const [loading3, setLoading3] = useState(false);

  // Componente 4: Metodología
  const [metodologia, setMetodologia] = useState("");
  const [loading4, setLoading4] = useState(false);

  // Componente 5: Análisis
  const [analisis, setAnalisis] = useState("");
  const [loading5, setLoading5] = useState(false);

  // Componente 6: Discusión
  const [discusion, setDiscusion] = useState("");
  const [loading6, setLoading6] = useState(false);

  // Componente 7: Conclusiones
  const [conclusiones, setConclusiones] = useState("");
  const [loading7, setLoading7] = useState(false);

  // Ref input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Debes iniciar sesión para usar la IA");
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || "";
    if (ext !== "docx" && ext !== "pdf") {
      toast.error("Solo se aceptan archivos .docx o .pdf");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setPlantillaStr(base64);
      setPlantillaExt(ext);
      setPlantillaNombre(file.name);
      toast.success(`Plantilla ${file.name} adjuntada temporalmente`);
    };
    reader.readAsDataURL(file);
  };

  const handleHumanizar = async (
    text: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!text.trim()) {
      toast.error("No hay texto para humanizar");
      return;
    }
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await humanizarTextoTesis({ headers, data: { contenido: text } });
      setter(res.contenido);
      toast.success("Texto humanizado correctamente");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error humanizando");
    } finally {
      setLoading(false);
    }
  };

  const descargarTesis = async () => {
    if (!tema || !planteamiento || !marcoTeorico || !metodologia) {
      toast.error("Debes completar al menos hasta el componente 4 (Metodología)");
      return;
    }

    setIsEnsamblando(true);
    try {
      const headers = await getAuthHeaders();
      
      const componentes: Record<string, string> = {
        "Definición y Tema": tema,
        "Planteamiento del Problema": planteamiento,
        "Marco Teórico": marcoTeorico,
        "Metodología": metodologia,
      };
      if (analisis) componentes["Análisis de Resultados"] = analisis;
      if (discusion) componentes["Discusión de Resultados"] = discusion;
      if (conclusiones) componentes["Conclusiones y Recomendaciones"] = conclusiones;

      let contenidoFinal = "";
      if (plantillaStr) {
        toast.info("Ensamblando documento final con la estructura de la plantilla...");
        const res = await ensamblarTesisFinal({
          headers,
          data: {
            componentes,
            plantillaBase64: plantillaStr,
            plantillaExt: plantillaExt!
          }
        });
        contenidoFinal = res.contenido;
      } else {
        contenidoFinal = Object.entries(componentes)
          .map(([k, v]) => `## ${k}\n\n${v}`)
          .join("\n\n");
      }

      // Obtener nombre autor
      const { data: { user } } = await supabase.auth.getUser();
      let authorName = user?.email;
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile?.display_name) authorName = profile.display_name;
      }

      const tituloDescarga = tituloTesis && tituloTesis !== "Nueva Tesis" ? tituloTesis : "Tesis_Generada";
      const blob = await exportarTesisWord({
        titulo: tituloDescarga,
        autor: authorName || "Autor",
        contenido: contenidoFinal
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tituloDescarga.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Documento descargado con éxito");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al descargar la tesis");
    } finally {
      setIsEnsamblando(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Card className="border-primary/20 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Plantilla Universitaria (Opcional)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Adjunta la estructura oficial (.docx o .pdf) para que el contenido generado se inserte respetando sus apartados al finalizar.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {plantillaNombre && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-success" />
                  {plantillaNombre}
                </Badge>
              )}
              <input 
                type="file" 
                accept=".docx,.pdf" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="size-4 mr-2" /> Adjuntar Plantilla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8 pl-4 border-l-2 border-muted relative">
        {/* COMPONENTE 1 */}
        <GeneradorPaso
          num={1}
          titulo="Definición de la Tesis"
          descripcion="Propuesta de 5 temas innovadores en tu área. (Edita el resultado para dejar solo el tema seleccionado)."
          inputValue={area}
          setInputValue={setArea}
          inputPlaceholder="Ej: Agroindustria, ODS, Sostenibilidad Corporativa..."
          inputLabel="Área de investigación"
          outputValue={tema}
          setOutputValue={setTema}
          loading={loading1}
          onGenerate={async () => {
            if (!area.trim()) return toast.error("Ingresa un área");
            setLoading1(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarDefinicionTema({ headers, data: { area } });
              setTema(res.contenido);
              toast.success("Temas generados");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading1(false); }
          }}
          onHumanize={() => handleHumanizar(tema, setTema, setLoading1)}
        />

        {/* COMPONENTE 2 */}
        <GeneradorPaso
          num={2}
          titulo="Planteamiento del Problema"
          descripcion="Desarrollo del problema general, específicos y justificación."
          outputValue={planteamiento}
          setOutputValue={setPlanteamiento}
          loading={loading2}
          disabledGenerate={!tema.trim()}
          onGenerate={async () => {
            setLoading2(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarPlanteamientoProblema({ headers, data: { tema } });
              setPlanteamiento(res.contenido);
              toast.success("Planteamiento generado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading2(false); }
          }}
          onHumanize={() => handleHumanizar(planteamiento, setPlanteamiento, setLoading2)}
        />

        {/* COMPONENTE 3 */}
        <GeneradorPaso
          num={3}
          titulo="Marco Teórico"
          descripcion="Definiciones, enfoques teóricos e integración de variables."
          outputValue={marcoTeorico}
          setOutputValue={setMarcoTeorico}
          loading={loading3}
          disabledGenerate={!tema.trim()}
          onGenerate={async () => {
            setLoading3(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarMarcoTeorico({ headers, data: { tema } });
              setMarcoTeorico(res.contenido);
              toast.success("Marco teórico generado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading3(false); }
          }}
          onHumanize={() => handleHumanizar(marcoTeorico, setMarcoTeorico, setLoading3)}
        />

        {/* COMPONENTE 4 */}
        <GeneradorPaso
          num={4}
          titulo="Metodología"
          descripcion="Tipo, diseño, población, muestra e instrumentos."
          outputValue={metodologia}
          setOutputValue={setMetodologia}
          loading={loading4}
          disabledGenerate={!tema.trim()}
          onGenerate={async () => {
            setLoading4(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarMetodologia({ headers, data: { tema } });
              setMetodologia(res.contenido);
              toast.success("Metodología generada");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading4(false); }
          }}
          onHumanize={() => handleHumanizar(metodologia, setMetodologia, setLoading4)}
        />

        {/* COMPONENTE 5 */}
        <GeneradorPaso
          num={5}
          titulo="Análisis e Interpretación de Resultados"
          descripcion="Propuesta de estadística descriptiva e inferencial."
          outputValue={analisis}
          setOutputValue={setAnalisis}
          loading={loading5}
          disabledGenerate={!tema.trim() || !metodologia.trim()}
          onGenerate={async () => {
            setLoading5(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarAnalisisResultados({ headers, data: { tema, metodologia } });
              setAnalisis(res.contenido);
              toast.success("Análisis generado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading5(false); }
          }}
          onHumanize={() => handleHumanizar(analisis, setAnalisis, setLoading5)}
        />

        {/* COMPONENTE 6 */}
        <GeneradorPaso
          num={6}
          titulo="Discusión de Resultados"
          descripcion="Contraste de hallazgos con antecedentes teóricos."
          outputValue={discusion}
          setOutputValue={setDiscusion}
          loading={loading6}
          disabledGenerate={!tema.trim() || !analisis.trim()}
          onGenerate={async () => {
            setLoading6(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarDiscusionResultados({ headers, data: { tema, analisis } });
              setDiscusion(res.contenido);
              toast.success("Discusión generada");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading6(false); }
          }}
          onHumanize={() => handleHumanizar(discusion, setDiscusion, setLoading6)}
        />

        {/* COMPONENTE 7 */}
        <GeneradorPaso
          num={7}
          titulo="Conclusiones y Recomendaciones"
          descripcion="Respuesta a los objetivos de investigación."
          outputValue={conclusiones}
          setOutputValue={setConclusiones}
          loading={loading7}
          disabledGenerate={!tema.trim() || !planteamiento.trim() || !analisis.trim() || !discusion.trim()}
          onGenerate={async () => {
            setLoading7(true);
            try {
              const headers = await getAuthHeaders();
              const res = await generarConclusiones({ headers, data: { tema, problema: planteamiento, analisis, discusion } });
              setConclusiones(res.contenido);
              toast.success("Conclusiones generadas");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Error");
            } finally { setLoading7(false); }
          }}
          onHumanize={() => handleHumanizar(conclusiones, setConclusiones, setLoading7)}
        />
      </div>

      <div className="mt-12 flex flex-col items-center justify-center p-8 border-t border-border/50">
        <Button 
          size="lg" 
          className="w-full sm:w-auto text-lg h-14 px-8 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90"
          onClick={descargarTesis}
          disabled={!tema || !planteamiento || !marcoTeorico || !metodologia || isEnsamblando}
        >
          {isEnsamblando ? (
            <><Loader2 className="size-6 mr-2 animate-spin" /> Ensamblando documento...</>
          ) : (
            <><FileDown className="size-6 mr-2" /> Descarga tu tesis</>
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
          {(!tema || !planteamiento || !marcoTeorico || !metodologia) 
            ? "Completa al menos hasta el Paso 4 (Metodología) para habilitar la descarga."
            : "Se generará un archivo de Word con todo el contenido integrado."}
        </p>
      </div>
    </div>
  );
}

function GeneradorPaso({
  num, titulo, descripcion,
  inputValue, setInputValue, inputLabel, inputPlaceholder,
  outputValue, setOutputValue,
  loading, disabledGenerate,
  onGenerate, onHumanize
}: {
  num: number;
  titulo: string;
  descripcion: string;
  inputValue?: string;
  setInputValue?: (v: string) => void;
  inputLabel?: string;
  inputPlaceholder?: string;
  outputValue: string;
  setOutputValue: (v: string) => void;
  loading: boolean;
  disabledGenerate?: boolean;
  onGenerate: () => void;
  onHumanize: () => void;
}) {
  return (
    <div className="relative">
      {/* Icono de número en la línea de tiempo */}
      <div className="absolute -left-[31px] top-4 size-7 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-xs text-primary z-10 shadow-sm">
        {num}
      </div>

      <Card className="ml-4 mb-4 border border-border/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            {titulo}
            {outputValue.trim() && <CheckCircle2 className="size-5 text-success ml-auto" />}
          </CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setInputValue !== undefined && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{inputLabel}</label>
              <Input 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)} 
                placeholder={inputPlaceholder} 
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={onGenerate} disabled={loading || disabledGenerate} className="flex-1 sm:flex-none">
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              Generar
            </Button>
            {outputValue && (
              <Button variant="outline" onClick={onHumanize} disabled={loading} className="flex-1 sm:flex-none">
                <Wand2 className="size-4 mr-2" /> Humanizar
              </Button>
            )}
          </div>

          {(outputValue || loading) && (
            <div className="pt-4 relative">
              <label className="text-sm font-medium mb-2 block">Resultado Editable:</label>
              <Textarea 
                value={outputValue} 
                onChange={e => setOutputValue(e.target.value)} 
                rows={12} 
                className="font-mono text-sm resize-y"
                placeholder={loading ? "Generando contenido..." : ""}
              />
              {loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md top-8">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
