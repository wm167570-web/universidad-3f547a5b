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
    theme: "default",
    securityLevel: "loose",
    fontFamily: "Times New Roman, serif",
  });
  mermaidReady = true;
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
  try {
    ensureMermaid();
    const id = `mmd-export-${Date.now()}-${index}`;
    const { svg } = await mermaid.render(id, code.trim());

    // Asegurar dimensiones explícitas en el SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.documentElement as unknown as SVGSVGElement;

    let width = parseFloat(svgEl.getAttribute("width") || "0");
    let height = parseFloat(svgEl.getAttribute("height") || "0");
    if ((!width || !height) && svgEl.getAttribute("viewBox")) {
      const [, , w, h] = svgEl.getAttribute("viewBox")!.split(/\s+/).map(Number);
      width = width || w;
      height = height || h;
    }
    if (!width || !height) { width = 800; height = 600; }

    // Escalar para nitidez
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = url;
    });
    if (!img) { URL.revokeObjectURL(url); return null; }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return null;
    const buf = new Uint8Array(await blob.arrayBuffer());

    // Encajar en ancho útil de página (~6.5" = 624px @ 96dpi)
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
          return new TableCell({
            borders: {
              top: isHeader ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              bottom: (isHeader || rowIndex === rows.length - 1) ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.BOTH, // Texto justificado como se pidió
                spacing: { line: 240, before: 120, after: 120 },
                children: [new TextRun({ text: cellText, size: SIZE, font: FONT, bold: isHeader })],
              })
            ],
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

function parseInline(text: string): TextRun[] {
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

