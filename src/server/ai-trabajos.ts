import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callAI(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  // Convert OpenAI-style messages to Gemini format
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

type GenInput = {
  titulo: string;
  tipo: string;
  descripcion?: string;
  instrucciones?: string;
  objetivos?: string;
  palabrasClave?: string[];
  paginas?: number;
};

export const generarContenido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GenInput) => input)
  .handler(async ({ data }) => {
    const palabras = (data.paginas ?? 5) * 300;
    const system = `Eres un experto académico de alto nivel. Redacta trabajos universitarios rigurosos, bien estructurados y profesionales.

REGLAS DE FORMATO CRÍTICAS:
1. TABLAS Y MATRICES:
   - Usa EXCLUSIVAMENTE formato Markdown estándar (| Encabezado |).
   - Prohibido el uso de barras laterales decorativas, bordes de caracteres ASCII o saltos de línea manuales dentro de celdas.
   - Cada tabla debe ir precedida por un título numerado en una línea independiente (Ej: "Tabla 1. Matriz de Interesados").
   - Sigue las normas APA 7ª: contenido claro, sin truncar información.

2. VISUALIZACIÓN Y GRÁFICOS:
   - Cuando el contenido involucre datos comparativos, cuantitativos o financieros, propón un "BLOQUE DE VISUALIZACIÓN".
   - Estructura estos bloques como una tabla resumen o una lista jerárquica clara que sintetice los hallazgos para facilitar la toma de decisiones.

3. ESTRUCTURA GENERAL:
   - Usa lenguaje formal en español.
   - Cita en formato APA 7ª cuando corresponda con marcador [REF: descripción].
   - Extensión objetivo: ~${palabras} palabras.
   - Usa encabezados Markdown (## Título).`;

    const user = `Redacta un ${data.tipo} titulado: "${data.titulo}".
${data.descripcion ? `\nContexto: ${data.descripcion}` : ""}
${data.instrucciones ? `\nInstrucciones del docente: ${data.instrucciones}` : ""}
${data.objetivos ? `\nObjetivos: ${data.objetivos}` : ""}
${data.palabrasClave?.length ? `\nPalabras clave: ${data.palabrasClave.join(", ")}` : ""}

Estructura el documento con una jerarquía clara. Asegúrate de incluir tablas profesionales si el tema lo permite (ej. Matrices de análisis, comparativas, etc.).`;

    const contenido = await callAI([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    return { contenido };
  });

export const humanizarContenido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contenido: string }) => input)
  .handler(async ({ data }) => {
    if (!data.contenido?.trim()) throw new Error("Contenido vacío");

    const system = `Eres un experto en reescritura académica. Tu tarea es humanizar el contenido manteniendo su esencia, calidad y estructura.

Técnicas a aplicar:
1. Reemplaza palabras comunes con sinónimos más naturales
2. Reorganiza la estructura de oraciones sin perder coherencia
3. Varía la longitud de párrafos
4. Añade transiciones más naturales entre ideas
5. Usa construcciones más conversacionales donde sea apropiado
6. Mantén el nivel académico y formal requerido
7. Preserva todas las citas, referencias, encabezados y tablas Markdown
8. Asegúrate de que el contenido sea único

Responde SOLO con el contenido humanizado, sin explicaciones adicionales.`;

    const humanizado = await callAI([
      { role: "system", content: system },
      { role: "user", content: `Humaniza este contenido académico preservando estrictamente el formato de tablas y encabezados:\n\n${data.contenido}` },
    ]);

    return { contenido: humanizado };
  });
