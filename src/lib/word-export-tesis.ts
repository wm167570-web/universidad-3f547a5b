import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageOrientation, Header, PageNumber, BorderStyle, WidthType, Table, TableRow, TableCell
} from "docx";

// Constantes APA 7ª (en twips: 1 pulgada = 1440)
const FONT = "Times New Roman";
const SIZE = 24;            // 12pt = 24 half-points
const LINE_DOUBLE = 480;    // interlineado doble (240 = simple)
const INDENT_FIRST = 720;   // 0.5" sangría primera línea
const MARGIN = 1440;        // 1" márgenes en todos los lados

export type ExportTesisInput = {
  titulo: string;
  autor?: string;
  institucion?: string;
  contenido: string; // Markdown
};

export async function exportarTesisWord(input: ExportTesisInput): Promise<Blob> {
  const fechaLarga = new Date().toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ===== PORTADA APA 7ª =====
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
      children: [new TextRun({ text: input.autor ?? "Autor de Tesis", size: SIZE, font: FONT })],
    })
  );

  portada.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_DOUBLE, after: 0 },
      children: [new TextRun({ text: input.institucion ?? "Institución universitaria", size: SIZE, font: FONT })],
    })
  );

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

  // ===== CUERPO =====
  const children: (Paragraph | Table)[] = [];
  const lines = input.contenido.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) continue;

    // Ignorar bloques de código
    if (line.startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        i++;
      }
      continue;
    }

    // Tabla Markdown
    if (line.startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && (lines[i].trim().startsWith("|") || lines[i].trim() === "")) {
        const rowText = lines[i].trim();
        if (rowText.startsWith("|")) {
          const cells = rowText.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
          if (!cells.every(c => c.match(/^[- :]+$/))) {
            tableRows.push(cells);
          }
        }
        i++;
      }
      i--;
      if (tableRows.length > 0) children.push(createAPATable(tableRows));
      continue;
    }

    // Nivel 1
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

    // Nivel 2
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

    // Nivel 3
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

    // Separadores
    if (line.startsWith("---")) continue;

    // Párrafo normal
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_DOUBLE, after: 0 },
        indent: { firstLine: INDENT_FIRST },
        children: parseInline(raw),
      })
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
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
      children: [...portada, ...children],
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
          const runs = parseInline(cellText.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?[a-z][^>]*>/gi, ""));
          const finalRuns = isHeader
            ? runs.map(r => new TextRun({ ...(r as any).options, bold: true, font: FONT, size: SIZE }))
            : runs;
          return new TableCell({
            borders: {
              top: isHeader ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              bottom: (isHeader || rowIndex === rows.length - 1) ? { style: BorderStyle.SINGLE, size: 4 } : { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 276, before: 80, after: 80 },
                children: finalRuns.length ? finalRuns : [new TextRun({ text: "", font: FONT, size: SIZE })],
              }),
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

function parseInline(input: string): TextRun[] {
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
