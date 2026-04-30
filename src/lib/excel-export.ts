import ExcelJS from "exceljs";

/**
 * Exportador especializado a Excel para trabajos académicos.
 *
 * Filosofía: parsear el contenido Markdown generado por la IA, detectar tablas
 * y números, y reconstruirlas en hojas separadas con FÓRMULAS ACTIVAS (no
 * valores estáticos), aplicando lógica financiera cuando el tipo de trabajo lo
 * sugiere ("Estudio Económico y Financiero", flujos de caja, balances, etc.).
 *
 * No toca la generación, ni la base de datos, ni el flujo Word.
 */

export type ExcelExportInput = {
  titulo: string;
  tipo: string;
  autor?: string;
  institucion?: string;
  curso?: string;
  docente?: string;
  contenido: string;
  referencias?: string[];
};

type MarkdownTable = {
  titulo?: string;
  headers: string[];
  rows: string[][];
};

type TableSheetInfo = {
  sheetName: string;
  numericCols: number[];
  rowCount: number;
  startRow: number;
  colCount: number;
  totalRow?: number;
};

const sanitizeSheetName = (raw: string | undefined, fallback: string) => {
  const cleaned = stripInline(raw ?? fallback)
    .replace(/[\\/?*\[\]:]/g, " ")
    .replace(/^'+|'+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned && cleaned.toLowerCase() !== "history" ? cleaned : fallback;
  return base.slice(0, 31).trim() || fallback;
};

const uniqueSheetName = (wb: ExcelJS.Workbook, raw: string | undefined, fallback: string) => {
  const base = sanitizeSheetName(raw, fallback);
  if (!wb.getWorksheet(base)) return base;
  let n = 2;
  while (n < 1000) {
    const suffix = ` ${n}`;
    const candidate = `${base.slice(0, 31 - suffix.length).trim()}${suffix}`;
    if (!wb.getWorksheet(candidate)) return candidate;
    n++;
  }
  return `Hoja ${Date.now()}`.slice(0, 31);
};

const quoteSheet = (sheetName: string) => `'${sheetName.replace(/'/g, "''")}'`;
const cellRef = (sheetName: string, address: string) => `${quoteSheet(sheetName)}!${address}`;
const formula = (value: string): ExcelJS.CellFormulaValue => ({ formula: value });

// ──────────────────────────────────────────────────────────────────────────────
// Parsing
// ──────────────────────────────────────────────────────────────────────────────

const stripInline = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

function extractTables(md: string): MarkdownTable[] {
  const lines = md.split(/\r?\n/);
  const tables: MarkdownTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isRow = /^\s*\|.*\|\s*$/.test(line);
    const sep = i + 1 < lines.length && /^\s*\|?\s*:?-{2,}.*\|.*$/.test(lines[i + 1]);
    if (isRow && sep) {
      const headers = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => stripInline(c));
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
        const cells = lines[j]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => stripInline(c));
        rows.push(cells);
        j++;
      }
      // título: línea anterior si parece "Tabla N. ..."
      let titulo: string | undefined;
      for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
        const t = stripInline(lines[k] ?? "");
        if (/^tabla\s+\d/i.test(t) || /^cuadro\s+\d/i.test(t)) {
          titulo = t;
          break;
        }
      }
      tables.push({ titulo, headers, rows });
      i = j;
      continue;
    }
    i++;
  }
  return tables;
}

function parseNumber(raw: string): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s || s === "—" || s === "-") return null;
  // paréntesis = negativo
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  const isPct = /%\s*$/.test(s);
  s = s.replace(/[$€£\s%]/g, "");
  // formato es: 1.234,56  → 1234.56
  if (/,\d{1,2}$/.test(s) && /\./.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/,\d{1,2}$/.test(s) && !/\./.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  const v = neg ? -n : n;
  return isPct ? v / 100 : v;
}

// ──────────────────────────────────────────────────────────────────────────────
// Estilo
// ──────────────────────────────────────────────────────────────────────────────

const COLOR_HEADER = "FF0F172A";
const COLOR_HEADER_TEXT = "FFFFFFFF";
const COLOR_ACCENT = "FF1E3A8A";
const COLOR_SUBTLE = "FFF1F5F9";
const COLOR_TOTAL = "FFE0E7FF";

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function autosize(ws: ExcelJS.Worksheet, min = 12, max = 48) {
  ws.columns.forEach((col) => {
    let w = min;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value == null ? "" : String((cell as any).result ?? cell.value);
      const len = Math.max(...v.split("\n").map((l) => l.length));
      if (len + 2 > w) w = len + 2;
    });
    col.width = Math.min(max, Math.max(min, w));
  });
}

function bordersAll(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Hojas
// ──────────────────────────────────────────────────────────────────────────────

function buildResumen(wb: ExcelJS.Workbook, input: ExcelExportInput, tablas: MarkdownTable[]) {
  const ws = wb.addWorksheet("Resumen", { properties: { tabColor: { argb: COLOR_ACCENT } } });
  ws.mergeCells("A1:D1");
  const t = ws.getCell("A1");
  t.value = input.titulo;
  t.font = { name: "Calibri", size: 18, bold: true, color: { argb: COLOR_ACCENT } };
  t.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  const meta: Array<[string, string | undefined]> = [
    ["Tipo de trabajo", input.tipo],
    ["Autor(a)", input.autor],
    ["Institución / Programa", input.institucion],
    ["Curso / Materia", input.curso],
    ["Docente", input.docente],
    ["Fecha de exportación", new Date().toLocaleDateString("es-ES")],
    ["Tablas detectadas", String(tablas.length)],
  ];
  let r = 3;
  meta.forEach(([k, v]) => {
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SUBTLE } };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = v ?? "—";
    ws.getCell(r, 2).alignment = { wrapText: true };
    r++;
  });

  r += 1;
  ws.getCell(r, 1).value = "Índice del libro";
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: COLOR_ACCENT } };
  r++;
  const idx = [
    ["Resumen", "Información general y metadatos del trabajo."],
    ["Contenido", "Texto completo del trabajo (sin tablas)."],
    ["Tablas y Datos", "Cada tabla detectada se vuelca a una hoja con fórmulas activas."],
    ["Análisis Financiero", "Proyección, márgenes y flujos derivados (si aplica)."],
    ["Supuestos", "Variables editables que alimentan las fórmulas."],
    ["Bibliografía", "Referencias APA del trabajo."],
  ];
  idx.forEach(([h, d]) => {
    ws.getCell(r, 1).value = h;
    ws.getCell(r, 1).font = { bold: true };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = d;
    ws.getCell(r, 2).alignment = { wrapText: true };
    r++;
  });

  bordersAll(ws, 3, 1, r - 1, 4);
  ws.columns = [{ width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }];
}

function buildContenido(wb: ExcelJS.Workbook, input: ExcelExportInput) {
  const ws = wb.addWorksheet("Contenido");
  // Quitar tablas markdown del texto para no duplicar
  const sinTablas = input.contenido
    .split(/\r?\n/)
    .filter((l) => !/^\s*\|.*\|\s*$/.test(l) && !/^\s*\|?\s*:?-{2,}.*\|.*$/.test(l));
  let r = 1;
  for (const raw of sinTablas) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      r++;
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const cell = ws.getCell(r, 1);
    if (h) {
      cell.value = stripInline(h[2]);
      const lvl = h[1].length;
      cell.font = { bold: true, size: lvl <= 2 ? 14 : 12, color: { argb: COLOR_ACCENT } };
    } else {
      cell.value = stripInline(line);
      cell.alignment = { wrapText: true, vertical: "top" };
    }
    r++;
  }
  ws.getColumn(1).width = 110;
}

function buildTabla(
  wb: ExcelJS.Workbook,
  table: MarkdownTable,
  index: number,
): { sheetName: string; numericCols: number[]; rowCount: number } {
  const baseName = (table.titulo ?? `Tabla ${index + 1}`).slice(0, 28).replace(/[\\/\?\*\[\]:]/g, " ");
  let name = baseName || `Tabla ${index + 1}`;
  let n = 2;
  while (wb.getWorksheet(name)) name = `${baseName} ${n++}`.slice(0, 31);
  const ws = wb.addWorksheet(name);

  // Título
  if (table.titulo) {
    ws.mergeCells(1, 1, 1, Math.max(2, table.headers.length));
    const t = ws.getCell(1, 1);
    t.value = table.titulo;
    t.font = { bold: true, size: 13, color: { argb: COLOR_ACCENT } };
  }
  const startRow = table.titulo ? 3 : 1;

  // Encabezados
  table.headers.forEach((h, i) => (ws.getCell(startRow, i + 1).value = h || `Col ${i + 1}`));
  styleHeaderRow(ws.getRow(startRow));

  // Detectar columnas numéricas: una col es numérica si >50% de filas parsean a número
  const numericCols: number[] = [];
  const colCount = table.headers.length;
  for (let c = 0; c < colCount; c++) {
    let ok = 0;
    let total = 0;
    for (const row of table.rows) {
      if (row[c] == null) continue;
      total++;
      if (parseNumber(row[c]) != null) ok++;
    }
    if (total > 0 && ok / total >= 0.5) numericCols.push(c);
  }

  // Datos
  table.rows.forEach((row, ri) => {
    const r = startRow + 1 + ri;
    for (let c = 0; c < colCount; c++) {
      const cell = ws.getCell(r, c + 1);
      const raw = row[c] ?? "";
      if (numericCols.includes(c)) {
        const n = parseNumber(raw);
        if (n != null) {
          cell.value = n;
          cell.numFmt = /%/.test(raw) ? "0.00%" : "#,##0.00;(#,##0.00);-";
          cell.alignment = { horizontal: "right" };
        } else {
          cell.value = stripInline(raw);
        }
      } else {
        cell.value = stripInline(raw);
        cell.alignment = { wrapText: true, vertical: "top" };
      }
    }
  });

  // Fila de totales con fórmulas SUM para columnas numéricas (excepto la 1ª si es etiqueta)
  if (numericCols.length && table.rows.length > 1) {
    const totalRowIdx = startRow + 1 + table.rows.length;
    ws.getCell(totalRowIdx, 1).value = "TOTAL";
    ws.getCell(totalRowIdx, 1).font = { bold: true };
    for (const c of numericCols) {
      if (c === 0) continue;
      const colLetter = ws.getColumn(c + 1).letter;
      const fromRow = startRow + 1;
      const toRow = startRow + table.rows.length;
      const cell = ws.getCell(totalRowIdx, c + 1);
      cell.value = { formula: `SUM(${colLetter}${fromRow}:${colLetter}${toRow})` } as any;
      cell.font = { bold: true };
      cell.numFmt = "#,##0.00;(#,##0.00);-";
      cell.alignment = { horizontal: "right" };
    }
    ws.getRow(totalRowIdx).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR_TOTAL },
    };
    bordersAll(ws, startRow, 1, totalRowIdx, colCount);

    // Gráfico no nativo en exceljs; lo simulamos con formato. El "Análisis Financiero"
    // sí incluirá gráficas mediante una tabla dedicada con formato condicional.
  } else {
    bordersAll(ws, startRow, 1, startRow + table.rows.length, colCount);
  }

  autosize(ws);
  return { sheetName: ws.name, numericCols, rowCount: table.rows.length };
}

function buildSupuestosYFinanzas(
  wb: ExcelJS.Workbook,
  input: ExcelExportInput,
  tablas: MarkdownTable[],
) {
  const esFinanciero =
    /financ|econ[oó]mic|presupues|flujo|caja|balance|estado de resultad|inversi[oó]n|costos?/i.test(
      `${input.tipo} ${input.titulo} ${input.contenido.slice(0, 2000)}`,
    );

  // ── Supuestos ──
  const sup = wb.addWorksheet("Supuestos", {
    properties: { tabColor: { argb: "FFF59E0B" } },
  });
  sup.getCell("A1").value = "Variables y supuestos del modelo";
  sup.getCell("A1").font = { bold: true, size: 14, color: { argb: COLOR_ACCENT } };
  sup.mergeCells("A1:C1");

  const supuestos: Array<[string, number | string, string]> = [
    ["Ingreso inicial (Año 1)", 100000, "Base usada para proyectar ingresos."],
    ["Tasa de crecimiento anual", 0.08, "Crecimiento aplicado año a año (editable)."],
    ["Costo variable (% sobre ingreso)", 0.45, "Porcentaje de costos directos."],
    ["Costo fijo anual", 25000, "Costos que no varían con las ventas."],
    ["Tasa impositiva", 0.3, "Impuesto sobre la utilidad antes de impuestos."],
    ["Inversión inicial", 80000, "Desembolso en t=0 para el flujo descontado."],
    ["Tasa de descuento (WACC)", 0.12, "Para cálculo de VPN."],
    ["Horizonte (años)", 5, "Número de años proyectados."],
  ];
  sup.getRow(3).values = ["Variable", "Valor", "Descripción"];
  styleHeaderRow(sup.getRow(3));
  supuestos.forEach((row, i) => {
    const r = 4 + i;
    sup.getCell(r, 1).value = row[0];
    sup.getCell(r, 2).value = row[1];
    if (typeof row[1] === "number" && row[1] < 1 && row[1] > 0) sup.getCell(r, 2).numFmt = "0.00%";
    else if (typeof row[1] === "number") sup.getCell(r, 2).numFmt = "#,##0.00;(#,##0.00);-";
    sup.getCell(r, 2).font = { color: { argb: "FF1D4ED8" }, bold: true };
    sup.getCell(r, 2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };
    sup.getCell(r, 3).value = row[2];
    sup.getCell(r, 3).alignment = { wrapText: true };
  });
  bordersAll(sup, 3, 1, 3 + supuestos.length, 3);
  sup.columns = [{ width: 38 }, { width: 16 }, { width: 60 }];

  // Nombres con rango (para fórmulas legibles)
  const nameMap: Record<string, string> = {
    Ingreso_Inicial: "Supuestos!$B$4",
    Crecimiento: "Supuestos!$B$5",
    Costo_Variable_Pct: "Supuestos!$B$6",
    Costo_Fijo: "Supuestos!$B$7",
    Tasa_Impuestos: "Supuestos!$B$8",
    Inversion_Inicial: "Supuestos!$B$9",
    WACC: "Supuestos!$B$10",
    Horizonte: "Supuestos!$B$11",
  };
  Object.entries(nameMap).forEach(([n, ref]) => {
    try {
      wb.definedNames.add(ref, n);
    } catch {
      /* ignore */
    }
  });

  if (!esFinanciero) return;

  // ── Análisis Financiero (Estado de Resultados proyectado) ──
  const fin = wb.addWorksheet("Análisis Financiero", {
    properties: { tabColor: { argb: "FF059669" } },
  });
  fin.getCell("A1").value = `Proyección financiera — ${input.titulo}`;
  fin.getCell("A1").font = { bold: true, size: 14, color: { argb: COLOR_ACCENT } };
  fin.mergeCells("A1:G1");

  const headerRow = 3;
  const headers = ["Concepto", "Año 1", "Año 2", "Año 3", "Año 4", "Año 5"];
  headers.forEach((h, i) => (fin.getCell(headerRow, i + 1).value = h));
  styleHeaderRow(fin.getRow(headerRow));

  // Filas con fórmulas activas referenciando Supuestos
  const conceptos: Array<{ label: string; formula: (col: string, prev?: string) => string; fmt?: string; bold?: boolean; fill?: string }> = [
    {
      label: "Ingresos",
      formula: (col, prev) => (prev ? `${prev}*(1+Crecimiento)` : `Ingreso_Inicial`),
      fmt: "$#,##0;($#,##0);-",
    },
    {
      label: "Costos variables",
      formula: (col) => `-${col}4*Costo_Variable_Pct`,
      fmt: "$#,##0;($#,##0);-",
    },
    {
      label: "Costos fijos",
      formula: () => `-Costo_Fijo`,
      fmt: "$#,##0;($#,##0);-",
    },
    {
      label: "Utilidad bruta",
      formula: (col) => `${col}4+${col}5+${col}6`,
      fmt: "$#,##0;($#,##0);-",
      bold: true,
      fill: COLOR_SUBTLE,
    },
    {
      label: "Impuestos",
      formula: (col) => `IF(${col}7>0,-${col}7*Tasa_Impuestos,0)`,
      fmt: "$#,##0;($#,##0);-",
    },
    {
      label: "Utilidad neta",
      formula: (col) => `${col}7+${col}8`,
      fmt: "$#,##0;($#,##0);-",
      bold: true,
      fill: COLOR_TOTAL,
    },
    {
      label: "Margen neto",
      formula: (col) => `IFERROR(${col}9/${col}4,0)`,
      fmt: "0.00%",
    },
    {
      label: "Flujo de caja",
      formula: (col) => `${col}9`,
      fmt: "$#,##0;($#,##0);-",
    },
  ];

  const cols = ["B", "C", "D", "E", "F"];
  conceptos.forEach((c, i) => {
    const r = headerRow + 1 + i;
    fin.getCell(r, 1).value = c.label;
    if (c.bold) fin.getCell(r, 1).font = { bold: true };
    cols.forEach((col, ci) => {
      const prev = ci > 0 ? cols[ci - 1] : undefined;
      const cell = fin.getCell(r, ci + 2);
      cell.value = { formula: c.formula(col, prev) } as any;
      if (c.fmt) cell.numFmt = c.fmt;
      if (c.bold) cell.font = { bold: true };
      if (c.fill)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.fill } };
      cell.alignment = { horizontal: "right" };
    });
  });

  // VPN y resumen
  const vpnRow = headerRow + conceptos.length + 2;
  fin.getCell(vpnRow, 1).value = "VPN del flujo de caja";
  fin.getCell(vpnRow, 1).font = { bold: true };
  fin.getCell(vpnRow, 2).value = {
    formula: `-Inversion_Inicial+NPV(WACC,B${headerRow + 8}:F${headerRow + 8})`,
  } as any;
  fin.getCell(vpnRow, 2).numFmt = "$#,##0;($#,##0);-";
  fin.getCell(vpnRow, 2).font = { bold: true, color: { argb: "FF059669" } };

  fin.getCell(vpnRow + 1, 1).value = "TIR";
  fin.getCell(vpnRow + 1, 1).font = { bold: true };
  fin.getCell(vpnRow + 1, 2).value = {
    formula: `IFERROR(IRR((-Inversion_Inicial,B${headerRow + 8},C${headerRow + 8},D${headerRow + 8},E${headerRow + 8},F${headerRow + 8})),0)`,
  } as any;
  // IRR no acepta lista literal: usar rango auxiliar. Construimos uno en H.
  fin.getCell("H3").value = "Flujo descontable";
  fin.getCell("H3").font = { bold: true, color: { argb: COLOR_HEADER_TEXT } };
  fin.getCell("H3").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER },
  };
  fin.getCell("H4").value = { formula: `-Inversion_Inicial` } as any;
  for (let i = 0; i < 5; i++) {
    fin.getCell(`H${5 + i}`).value = {
      formula: `${cols[i]}${headerRow + 8}`,
    } as any;
    fin.getCell(`H${5 + i}`).numFmt = "$#,##0;($#,##0);-";
  }
  fin.getCell("H4").numFmt = "$#,##0;($#,##0);-";
  fin.getCell(vpnRow + 1, 2).value = { formula: `IFERROR(IRR(H4:H9),0)` } as any;
  fin.getCell(vpnRow + 1, 2).numFmt = "0.00%";
  fin.getCell(vpnRow + 1, 2).font = { bold: true, color: { argb: "FF059669" } };

  bordersAll(fin, headerRow, 1, headerRow + conceptos.length, 6);
  fin.columns = [
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 4 },
    { width: 18 },
  ];

  // Gráfico: exceljs no soporta charts nativos en xlsx generados, así que
  // dejamos una mini-tabla "barras" con formato condicional para visualizar
  // ingresos por año (queda como gráfico visual dentro de la hoja).
  const gRow = vpnRow + 4;
  fin.getCell(gRow, 1).value = "Gráfico — Ingresos por año";
  fin.getCell(gRow, 1).font = { bold: true, size: 12, color: { argb: COLOR_ACCENT } };
  cols.forEach((col, i) => {
    fin.getCell(gRow + 1, i + 2).value = `Año ${i + 1}`;
    fin.getCell(gRow + 1, i + 2).font = { bold: true };
    fin.getCell(gRow + 1, i + 2).alignment = { horizontal: "center" };
    fin.getCell(gRow + 2, i + 2).value = { formula: `${col}4` } as any;
    fin.getCell(gRow + 2, i + 2).numFmt = "$#,##0";
    fin.getCell(gRow + 2, i + 2).alignment = { horizontal: "center" };
  });
  fin.addConditionalFormatting({
    ref: `B${gRow + 2}:F${gRow + 2}`,
    rules: [
      {
        type: "dataBar",
        priority: 1,
        cfvo: [{ type: "min" }, { type: "max" }],
        color: { argb: "FF3B82F6" },
        gradient: true,
      } as any,
    ],
  });
  bordersAll(fin, gRow + 1, 2, gRow + 2, 6);
}

function buildBibliografia(wb: ExcelJS.Workbook, refs: string[]) {
  if (!refs?.length) return;
  const ws = wb.addWorksheet("Bibliografía");
  ws.getCell("A1").value = "Referencias (APA)";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: COLOR_ACCENT } };
  ws.getRow(3).values = ["#", "Referencia"];
  styleHeaderRow(ws.getRow(3));
  refs.forEach((r, i) => {
    ws.getCell(4 + i, 1).value = i + 1;
    ws.getCell(4 + i, 1).alignment = { horizontal: "center" };
    ws.getCell(4 + i, 2).value = stripInline(r);
    ws.getCell(4 + i, 2).alignment = { wrapText: true, vertical: "top" };
  });
  bordersAll(ws, 3, 1, 3 + refs.length, 2);
  ws.columns = [{ width: 6 }, { width: 110 }];
}

// ──────────────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────────────

export async function exportarTrabajoExcel(input: ExcelExportInput): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AcadémicoPro";
  wb.created = new Date();

  const tablas = extractTables(input.contenido);

  buildResumen(wb, input, tablas);
  buildContenido(wb, input);
  tablas.forEach((t, i) => buildTabla(wb, t, i));
  buildSupuestosYFinanzas(wb, input, tablas);
  buildBibliografia(wb, input.referencias ?? []);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
