import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageOrientation, Header, PageNumber, Footer, Table, TableRow, TableCell,
  BorderStyle, WidthType, ImageRun,
} from "docx";
import mermaid from "mermaid";

// Inicializar mermaid una sola vez (solo navegador)
let mermaidReady = false;
function ensureMermaid() {
  if (mermaidReady || typeof window === "undefined") return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    fontFamily: "Arial, Helvetica, sans-serif",
    flowchart: { htmlLabels: false, useMaxWidth: false, curve: "basis" },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
  });
  mermaidReady = true;
}

/** Limpia un string de markdown inline y etiquetas HTML simples. */
function stripInlineMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/**
 * Renderiza un bloque mermaid a PNG (Uint8Array) + dimensiones.
 * Devuelve null si mermaid falla o si no estamos en el navegador.
 */
async function renderMermaidToPng(
  code: string,
  index: number
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  // Contenedor temporal en el DOM (mermaid lo necesita para medir texto)
  const host = document.createElement("div");
  host.id = `mmd-host-${Date.now()}-${index}`;
  host.style.cssText = "position:fixed;left:-99999px;top:0;visibility:hidden;width:1200px;";
  document.body.appendChild(host);
  try {
    ensureMermaid();
    const id = `mmd-export-${Date.now()}-${index}`;
    // mermaid v10+ acepta tercer parámetro container
    const { svg } = await mermaid.render(id, code.trim(), host as unknown as HTMLElement);

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.documentElement as unknown as SVGSVGElement;

    // Asegurar xmlns para que <img> pueda cargarlo
    if (!svgEl.getAttribute("xmlns")) svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!svgEl.getAttribute("xmlns:xlink")) svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    let width = parseFloat(svgEl.getAttribute("width") || "0");
    let height = parseFloat(svgEl.getAttribute("height") || "0");
    if ((!width || !height) && svgEl.getAttribute("viewBox")) {
      const [, , w, h] = svgEl.getAttribute("viewBox")!.split(/\s+/).map(Number);
      width = width || w;
      height = height || h;
    }
    if (!width || !height) { width = 800; height = 600; }
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const svgString = new XMLSerializer().serializeToString(svgEl);
    // data URL evita restricciones de CSP/Blob en algunos entornos
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = dataUrl;
    });
    if (!img) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return null;
    const buf = new Uint8Array(await blob.arrayBuffer());

    const maxW = 600;
    let outW = width;
    let outH = height;
    if (outW > maxW) {
      const r = maxW / outW;
      outW = maxW;
      outH = Math.round(height * r);
    }
    return { data: buf, width: Math.round(outW), height: Math.round(outH) };
  } catch (e) {
    console.warn("[mermaid] render falló:", e);
    return null;
  } finally {
    host.remove();
  }
}

type ExportInput = {
  titulo: string;
  autor?: string;
  institucion?: string;
  curso?: string;
  docente?: string;
  contenido: string;
  referencias?: string[];
};

// Constantes APA 7ª (en twips: 1 pulgada = 1440)
const FONT = "Times New Roman";
const SIZE = 24;            // 12pt = 24 half-points
const LINE_DOUBLE = 480;    // interlineado doble (240 = simple)
const INDENT_FIRST = 720;   // 0.5" sangría primera línea
const MARGIN = 1440;        // 1" márgenes en todos los lados

export async function exportarTrabajoWord(input: ExportInput): Promise<Blob> {
  const fechaLarga = new Date().toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ===== PORTADA APA 7ª (centrada, doble espacio, sin número de página visible) =====
  const portada: Paragraph[] = [];

  for (let i = 0; i < 4; i++) {
    portada.push(blankLine());
  }

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 0 },
      children: [new TextRun({ text: input.titulo, bold: true, size: SIZE, font: FONT })],
    })
  );
  portada.push(blankLine());

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 0 },
      children: [new TextRun({ text: input.autor ?? "Autor del trabajo", size: SIZE, font: FONT })],
    })
  );

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 0 },
      children: [new TextRun({ text: input.institucion ?? "Institución educativa", size: SIZE, font: FONT })],
    })
  );

  if (input.curso) {
    portada.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_DOUBLE, after: 0 },
        children: [new TextRun({ text: input.curso, size: SIZE, font: FONT })],
      })
    );
  }

  if (input.docente) {
    portada.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_DOUBLE, after: 0 },
        children: [new TextRun({ text: input.docente, size: SIZE, font: FONT })],
      })
    );
  }

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 0 },
      children: [new TextRun({ text: fechaLarga, size: SIZE, font: FONT })],
    })
  );

  portada.push(new Paragraph({ pageBreakBefore: true, children: [] }));

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 240 },
      children: [new TextRun({ text: input.titulo, bold: true, size: SIZE, font: FONT })],
    })
  );

  // ===== CUERPO: parsea Markdown a estilos APA y Tablas =====
  const children: (Paragraph | Table)[] = [];
  const lines = input.contenido.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) continue;

    // ===== Bloques de código con triple backtick (```lang ... ```) =====
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim().toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      // i queda en la línea de cierre ``` (o al final)
      const code = buf.join("\n");

      if (lang === "mermaid") {
        const png = await renderMermaidToPng(code, children.length);
        if (png) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: LINE_DOUBLE, before: 240, after: 120 },
              children: [
                new ImageRun({
                  type: "png",
                  data: png.data,
                  transformation: { width: png.width, height: png.height },
                  altText: { title: "Diagrama", description: "Diagrama Mermaid", name: "diagrama" },
                }),
              ],
            })
          );
        } else {
          // Fallback: nota discreta sin filtrar el código fuente
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: LINE_DOUBLE, before: 120, after: 120 },
              children: [new TextRun({
                text: "[Diagrama no disponible]",
                italics: true, size: SIZE, font: FONT, color: "888888",
              })],
            })
          );
        }
      }
      // Cualquier otro bloque de código: se omite del documento (no se vuelca como texto plano).
      continue;
    }

    // Detección de Título de Tabla (Ej: "Tabla 1. Matriz de Interesados")
    if (line.match(/^Tabla\s+\d+[:.]/i) && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_DOUBLE, before: 240, after: 0 },
          children: [new TextRun({ text: line, italics: true, size: SIZE, font: FONT })],
        })
      );
      continue;
    }

    // Detección de Tabla Markdown
    if (line.startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && (lines[i].trim().startsWith("|") || lines[i].trim() === "")) {
        const rowText = lines[i].trim();
        if (rowText.startsWith("|")) {
          const cells = rowText.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
          // Ignorar fila de separación |---|---|
          if (!cells.every(c => c.match(/^[- :]+$/))) {
            tableRows.push(cells);
          }
        }
        i++;
      }
      i--; // retroceder para no saltar la siguiente línea válida en el for

      if (tableRows.length > 0) {
        children.push(createAPATable(tableRows));
      }
      continue;
    }

    // Bloques de Visualización (Stylized summary)
    if (line.toUpperCase().includes("BLOQUE DE VISUALIZACIÓN")) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "666666" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "666666" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "666666" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "666666" },
          },
          shading: { fill: "F9FAFB" },
          spacing: { before: 240, after: 240, line: 360 },
          children: [
            new TextRun({ text: line, bold: true, size: SIZE, font: FONT }),
          ],
        })
      );
      continue;
    }

    // Nivel 1 APA: centrado, negrita
    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: LINE_DOUBLE, before: 240, after: 0 },
          children: [new TextRun({ text: line.slice(2).trim(), bold: true, size: SIZE, font: FONT })],
        })
      );
      continue;
    }

    // Nivel 2 APA: izquierda, negrita
    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_DOUBLE, before: 240, after: 0 },
          children: [new TextRun({ text: line.slice(3).trim(), bold: true, size: SIZE, font: FONT })],
        })
      );
      continue;
    }

    // Nivel 3 APA: izquierda, negrita y cursiva
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_DOUBLE, before: 240, after: 0 },
          children: [new TextRun({ text: line.slice(4).trim(), bold: true, italics: true, size: SIZE, font: FONT })],
        })
      );
      continue;
    }

    // Párrafo normal
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_DOUBLE, after: 0 },
        indent: { firstLine: INDENT_FIRST },
        children: parseInline(raw), // Usar raw para preservar espacios si fuera necesario
      })
    );
  }

  // ===== REFERENCIAS APA 7ª =====
  const referenciasParagraphs: Paragraph[] = [];
  if (input.referencias?.length) {
    referenciasParagraphs.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    referenciasParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_DOUBLE, after: 240 },
        children: [new TextRun({ text: "Referencias", bold: true, size: SIZE, font: FONT })],
      })
    );

    const ordenadas = [...input.referencias]
      .map((r) => r.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    for (const ref of ordenadas) {
      referenciasParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_DOUBLE, after: 0 },
          indent: { left: INDENT_FIRST, hanging: INDENT_FIRST },
          children: parseInline(ref),
        })
      );
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: SIZE } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })],
            }),
          ],
        }),
      },
      children: [...portada, ...children, ...referenciasParagraphs],
    }],
  });

  return await Packer.toBlob(doc);
}

function createAPATable(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: rows.map((cells, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        children: cells.map(cellText => {
          // Convertir <br> en saltos de línea reales y limpiar otras etiquetas HTML
          const normalized = cellText
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/?[a-z][^>]*>/gi, "");
          const lines = normalized.split(/\r?\n/);

          const paragraphs = lines.map((ln, idx) => {
            const runs = parseInline(ln);
            // Si es header, forzar negrita en todos los runs
            const finalRuns = isHeader
              ? runs.map(r => new TextRun({ ...(r as any).options, bold: true, font: FONT, size: SIZE }))
              : runs;
            return new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: {
                line: 276,
                before: idx === 0 ? 80 : 0,
                after: idx === lines.length - 1 ? 80 : 0,
              },
              children: finalRuns.length ? finalRuns : [new TextRun({ text: "", font: FONT, size: SIZE })],
            });
          });

          return new TableCell({
            borders: {
              top: isHeader ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              bottom: (isHeader || rowIndex === rows.length - 1) ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: paragraphs,
          });
        }),
      });
    }),
  });
}

function blankLine(): Paragraph {
  return new Paragraph({
    spacing: { line: LINE_DOUBLE, after: 0 },
    children: [new TextRun({ text: "", font: FONT, size: SIZE })],
  });
}

function parseInline(input: string): TextRun[] {
  // Limpiar HTML residual antes de procesar markdown inline
  const text = input.replace(/<\/?[a-z][^>]*>/gi, "");
  const runs: TextRun[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SIZE }));
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, font: FONT, size: SIZE }));
    } else {
      runs.push(new TextRun({ text: tok.slice(1, -1), italics: true, font: FONT, size: SIZE }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), font: FONT, size: SIZE }));
  }
  return runs.length ? runs : [new TextRun({ text, font: FONT, size: SIZE })];
}

