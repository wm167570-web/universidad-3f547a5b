import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainerProps,
  Legend,
} from "recharts";

const PROMEDIO_MINIMO = 3.5;

/** Tooltip customizado con estética cyberpunk cálida */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const nota = payload[0]?.value as number;
  const color = nota >= PROMEDIO_MINIMO ? "#22c55e" : "#ef4444";
  return (
    <div className="rounded px-3 py-2 text-xs"
      style={{ background: "rgba(15,2,2,0.96)", border: `1px solid ${color}55`,
        boxShadow: `0 0 12px ${color}33` }}>
      <p className="font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(212,165,116,0.8)" }}>{label}</p>
      <p style={{ color }}>Promedio: <strong>{typeof nota === "number" ? nota.toFixed(2) : "—"}</strong></p>
    </div>
  );
}

export function PromedioChart() {
  const { user } = useAuth();

  // Consultar trabajos con nota y materia
  const { data: trabajos = [] } = useQuery({
    enabled: !!user,
    queryKey: ["trabajos-promedio-chart", user?.uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajos").select("*, materias(nombre)");
      if (error) throw error;
      // Filtrar los que tienen nota
      return (data || []).filter((t: any) => t.nota != null);
    },
  });

  // Agrupar por materia y calcular promedio ponderado
  const dataByMateria = (() => {
    const map = new Map<string, { nombre: string; notas: { nota: number; peso: number }[] }>();
    trabajos.forEach((t: any) => {
      const nombre = t.materias?.nombre ?? "Sin materia";
      if (!map.has(nombre)) map.set(nombre, { nombre, notas: [] });
      map.get(nombre)!.notas.push({ nota: t.nota ?? 0, peso: t.peso ?? 1 });
    });

    return Array.from(map.entries()).map(([nombre, { notas }]) => {
      const totalPeso = notas.reduce((s, n) => s + n.peso, 0);
      const promedio = totalPeso > 0
        ? notas.reduce((s, n) => s + n.nota * n.peso, 0) / totalPeso
        : notas.reduce((s, n) => s + n.nota, 0) / notas.length;
      return { materia: nombre.length > 14 ? nombre.slice(0, 14) + "…" : nombre, promedio: +promedio.toFixed(2) };
    });
  })();

  // Promedio global ponderado
  const promedioGlobal = (() => {
    if (!trabajos.length) return null;
    const all = trabajos.filter((t: any) => t.nota !== null);
    if (!all.length) return null;
    const totalPeso = all.reduce((s: number, t: any) => s + (t.peso ?? 1), 0);
    const suma = all.reduce((s: number, t: any) => s + ((t.nota ?? 0) * (t.peso ?? 1)), 0);
    return totalPeso > 0 ? suma / totalPeso : null;
  })();

  const sinDatos = dataByMateria.length === 0;
  const globalColor = promedioGlobal === null ? "#d4a574"
    : promedioGlobal >= PROMEDIO_MINIMO ? "#22c55e" : "#ef4444";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <BarChart2 className="size-5" style={{ color: "#f59e0b" }} />
            Promedio por materia
          </CardTitle>
          {promedioGlobal !== null && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Promedio global</div>
              <div className="text-2xl font-bold font-serif" style={{ color: globalColor,
                filter: `drop-shadow(0 0 6px ${globalColor}88)` }}>
                {promedioGlobal.toFixed(2)}
              </div>
            </div>
          )}
        </div>
        {/* Indicador de línea mínima */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-6 h-px border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(239,68,68,0.7)" }}>
            Mínimo aprobatorio: {PROMEDIO_MINIMO}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {sinDatos ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BarChart2 className="size-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">
              Aún no hay notas registradas.<br />
              Asigna notas a tus trabajos en el módulo de Producción.
            </p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataByMateria} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <filter id="glow-line">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(245,158,11,0.08)"
                  vertical={false}
                />

                <XAxis
                  dataKey="materia"
                  stroke="rgba(212,165,116,0.4)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(212,165,116,0.7)", fontFamily: "Inter, sans-serif", fontSize: 9 }}
                />

                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 3.5, 4, 5]}
                  stroke="rgba(212,165,116,0.4)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(212,165,116,0.7)", fontFamily: "Inter, sans-serif", fontSize: 9 }}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Línea de promedio mínimo aprobatorio — siempre visible */}
                <ReferenceLine
                  y={PROMEDIO_MINIMO}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  label={{
                    value: "3.5 MÍN",
                    position: "right",
                    fontSize: 8,
                    fill: "#ef4444",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "bold",
                  }}
                />

                {/* Zona de reprobación: fondo rojo muy sutil por debajo de 3.5 */}
                <ReferenceLine y={PROMEDIO_MINIMO} stroke="transparent">
                </ReferenceLine>

                {/* Línea de promedios por materia */}
                <Line
                  type="monotone"
                  dataKey="promedio"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.promedio >= PROMEDIO_MINIMO ? "#22c55e" : "#ef4444";
                    return (
                      <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={color}
                        stroke="rgba(15,2,2,0.8)" strokeWidth={2}
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
                    );
                  }}
                  activeDot={{ r: 7, stroke: "#f59e0b", strokeWidth: 2, fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leyenda de colores de puntos */}
        {!sinDatos && (
          <div className="flex items-center gap-4 mt-2 justify-center">
            {[
              { color: "#22c55e", label: "≥ 3.5 · Aprobado" },
              { color: "#ef4444", label: "< 3.5 · En riesgo" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
