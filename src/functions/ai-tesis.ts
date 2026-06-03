import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const SUPER_ADMIN_EMAIL = "wmartinezm360@gmail.com";

async function callAI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemParts) body.systemInstruction = { parts: [{ text: systemParts }] };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Límite de uso de Gemini alcanzado. Intenta más tarde.");
  if (res.status === 401 || res.status === 403) throw new Error("API key de Gemini inválida o sin permisos.");
  if (!res.ok) throw new Error(`Error Gemini (${res.status}): ${await res.text()}`);

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return text;
}

async function consumeCredit(supabase: any, userId: string, email: string | undefined) {
  if (email === SUPER_ADMIN_EMAIL) return; // exento

  const { error } = await supabase.rpc("consume_ai_credit", {
    _user_id: userId,
    _user_email: email ?? "",
  });
  if (error) throw new Error(error.message);
}

// =========================================================================
// COMPONENTE 1: Definición de la Tesis
// =========================================================================
export const generarDefinicionTema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como investigador experto en metodología de la investigación con enfoque en sostenibilidad corporativa. Propón 5 temas de tesis innovadores, viables y específicos en el área de ${data.area}, considerando el contexto de Colombia. Cada tema debe incluir: título claro y delimitado, variable independiente y variable dependiente, problema que resuelve, justificación breve (máximo 3 líneas), enfoque metodológico sugerido. Evita temas genéricos. Temas aplicables, actuales (2020-2026), con posibilidad de obtener datos reales. Redacción humanizada.

Devuelve los 5 temas en formato JSON estricto, sin texto adicional, sin bloques de código markdown, sin explicaciones. Solo el JSON con esta estructura exacta:
[
  {
    "numero": 1,
    "titulo": "...",
    "variableIndependiente": "...",
    "variableDependiente": "...",
    "problema": "...",
    "justificacion": "...",
    "enfoqueMetodologico": "..."
  }
]
(5 objetos en total)`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 2: Planteamiento del Problema
// =========================================================================
export const generarPlanteamientoProblema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como asesor de tesis con experiencia doctoral. Desarrolla el planteamiento del problema, de forma humanizada, para la siguiente investigación: ${data.tema}. Incluye: descripción del problema (contexto internacional, nacional y local), formulación del problema general (pregunta central), problemas específicos (mínimo 3), redacción formal, académica y coherente. Evita redundancias y lenguaje básico. Listo para tesis universitaria de maestría, alineado a metodología científica. Formato Markdown.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 3: Marco Teórico
// =========================================================================
export const generarMarcoTeorico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como investigador experto en redacción científica. Desarrolla el marco teórico de las variables de la siguiente investigación: ${data.tema}. Incluye: definiciones según autores relevantes (2020–2025), enfoques teóricos principales, dimensiones de cada variable, relación con la investigación. Condiciones: redacción original no detectable por Turnitin ni detectores de IA, lenguaje académico avanzado, parafraseo profundo (no copiar estructuras típicas de IA), integración coherente entre párrafos. No uses listas; redacta en párrafos continuos y humanizados. Formato Markdown con encabezados correspondientes.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 4: Metodología
// =========================================================================
export const generarMetodologia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como experto en metodología de la investigación (enfoque Hernández Sampieri). Desarrolla el capítulo de metodología para: ${data.tema}. Incluye: tipo de investigación, enfoque (cuantitativo / cualitativo / mixto), diseño de investigación, población y muestra (con justificación), técnicas e instrumentos de recolección de datos, procedimiento de análisis de datos. Redacción académica, clara y coherente, lista para incluirse en tesis. Sin riesgo de detección en Turnitin. Todo alineado al título definido. Sin explicaciones genéricas. Formato Markdown.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 5: Análisis e Interpretación de Resultados
// =========================================================================
export const generarAnalisisResultados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string; metodologia: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como estadístico y metodólogo experto. Para la investigación ${data.tema} con el enfoque metodológico definido: ${data.metodologia}, desarrolla el capítulo de análisis e interpretación de resultados. Incluye: estadística descriptiva (propuesta de gráficos, tablas de frecuencias, medias, modas), estadística inferencial (pruebas de hipótesis apropiadas según el enfoque: Rho de Spearman, Pearson, Chi-cuadrado u otras), interpretación narrativa de los resultados relacionándolos con los autores del marco teórico. Todo humanizado para evitar detección de Turnitin. Formato Markdown.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 6: Discusión de Resultados
// =========================================================================
export const generarDiscusionResultados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string; analisis: string }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como investigador con capacidad crítica avanzada. Para la investigación ${data.tema}, teniendo en cuenta el siguiente análisis de resultados: ${data.analisis}, desarrolla la discusión de resultados. Incluye: contraste de hallazgos con antecedentes nacionales e internacionales (¿coinciden o difieren?), explicación técnica de cualquier diferencia (limitaciones, contexto local, nuevas tecnologías). Redacción crítica, académica y humanizada. Formato Markdown.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// COMPONENTE 7: Conclusiones y Recomendaciones
// =========================================================================
export const generarConclusiones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { 
    tema: string; 
    problema: string;
    analisis: string;
    discusion: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Actúa como investigador principal. Para la investigación ${data.tema}, redacta las conclusiones y recomendaciones finales basándote en: \nProblema: ${data.problema}\nAnálisis: ${data.analisis}\nDiscusión: ${data.discusion}\n\nConclusiones: una conclusión por cada objetivo específico, respondiendo directamente a los problemas planteados y al objetivo general. Recomendaciones: viables, dirigidas a la empresa o sector del estudio, con soluciones técnicas aplicables (no ideas abstractas). Redacción académica y humanizada. Formato Markdown.`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// HUMANIZAR TEXTO (Genérico para cualquier componente)
// =========================================================================
export const humanizarTextoTesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contenido: string }) => input)
  .handler(async ({ data, context }) => {
    if (!data.contenido?.trim()) throw new Error("Contenido vacío");

    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email);

    const prompt = `Reescribe el siguiente texto de forma completamente humanizada, eliminando patrones detectables como generados por IA, usando variación sintáctica natural, conectores discursivos variados, ritmo narrativo humano, sin alterar el contenido académico ni las citas. Mantén el formato Markdown original:\n\n${data.contenido}`;
    
    const contenido = await callAI([{ role: "user", content: prompt }]);
    return { contenido };
  });

// =========================================================================
// ENSAMBLAR TESIS FINAL
// =========================================================================
export const ensamblarTesisFinal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { 
    componentes: Record<string, string>;
    plantillaBase64?: string;
    plantillaExt?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const email = context.claims.email as string | undefined;
    await consumeCredit(context.supabase, context.userId, email); // Cobramos un crédito por el ensamblaje inteligente

    let plantillaTexto = "";

    // Si hay plantilla, extraer el texto
    if (data.plantillaBase64 && data.plantillaExt) {
      try {
        const buffer = Buffer.from(data.plantillaBase64, "base64");
        if (data.plantillaExt === "docx") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          plantillaTexto = result.value;
        } else if (data.plantillaExt === "pdf") {
          const pdfParseModule = await import("pdf-parse");
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const result = await pdfParse(buffer);
          plantillaTexto = result.text;
        }
      } catch (e) {
        console.error("Error al extraer texto de la plantilla:", e);
        // Continuamos incluso si falla la extracción, para no bloquear al usuario
      }
    }

    // Armamos el super prompt
    const componentesUnidos = Object.entries(data.componentes)
      .map(([k, v]) => `--- ${k.toUpperCase()} ---\n${v}`)
      .join("\n\n");

    const system = `Eres un editor académico profesional. Tu tarea es compilar y ensamblar un documento final de tesis estructurado y coherente.
Se te entregará el contenido generado de varios capítulos de la investigación.
${plantillaTexto ? `Además, se te entregará el texto extraído de la plantilla oficial de la universidad de la que debes derivar e inferir la ESTRUCTURA requerida (títulos, subtítulos, secciones adicionales obligatorias, etc.).\n\nTu tarea:
1. Respeta el orden y las secciones de la plantilla universitaria.
2. Inserta el contenido generado en las secciones correspondientes de la plantilla.
3. Si la plantilla tiene apartados adicionales que no están en el contenido generado (ej. Dedicatoria, Agradecimientos, Resumen/Abstract, Introducción general), COMPLÉTALOS creativamente de forma coherente con la investigación.
4. Si hay partes de la plantilla que solo contienen marcadores o instrucciones, reemplázalas por el contenido real.
5. Usa formato Markdown (## Títulos, etc.) para que luego pueda exportarse a Word sin problemas.` : `Tu tarea:
Ensambla todo este contenido en un solo documento coherente, asegurándote de que la transición entre capítulos sea suave. Aplica formato Markdown (## Títulos) y asegúrate de que esté listo para exportarse a Word.`}
Responde SOLO con el contenido ensamblado en Markdown, sin notas adicionales.`;

    const userMsg = `CONTENIDO GENERADO PREVIAMENTE:\n\n${componentesUnidos}\n\n${plantillaTexto ? `TEXTO DE LA PLANTILLA UNIVERSITARIA:\n\n${plantillaTexto}` : ""}`;

    const contenido = await callAI([
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ]);

    return { contenido };
  });
