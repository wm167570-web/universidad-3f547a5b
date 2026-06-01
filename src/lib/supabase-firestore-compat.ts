import { supabase } from "@/integrations/supabase/client";

type Filter = { column: string; op: string; value: unknown };
type Order = { column: string; ascending: boolean };
type CollectionRef = { table: string };
type DocRef = { table: string; id: string };
type QueryRef = CollectionRef & { filters: Filter[]; orders: Order[] };

type QueryLike = CollectionRef | QueryRef;
type CompatDoc = { id: string; data: () => any };
type CompatQuerySnapshot = { empty: boolean; docs: CompatDoc[] };
type CompatDocSnapshot = { exists: () => boolean; id: string; data: () => any };

const isQueryRef = (value: QueryLike): value is QueryRef => "filters" in value;
const keyColumnFor = (table: string) => table === "profiles" || table === "user_roles" ? "user_id" : "id";

const normalizeData = (table: string, data: Record<string, unknown>) => {
  if (table === "materia_encuentros") {
    return {
      ...data,
      materia_id: data.materia_id ?? data.materiaId,
      enlace_sesion: data.enlace_sesion ?? data.link,
      enlace_grabacion: data.enlace_grabacion ?? data.linkGrabacion,
    };
  }
  return data;
};

const denormalizeData = (table: string, row: Record<string, unknown>) => {
  if (table === "materia_encuentros") {
    return {
      ...row,
      materiaId: row.materia_id,
      link: row.enlace_sesion,
      linkGrabacion: row.enlace_grabacion,
      plataforma: row.plataforma ?? "Teams",
    };
  }
  return row;
};

const applyFilter = (builder: any, filter: Filter) => {
  if (filter.op === "==") return builder.eq(filter.column, filter.value);
  if (filter.op === "!=") return builder.neq(filter.column, filter.value);
  if (filter.op === ">") return builder.gt(filter.column, filter.value);
  if (filter.op === ">=") return builder.gte(filter.column, filter.value);
  if (filter.op === "<") return builder.lt(filter.column, filter.value);
  if (filter.op === "<=") return builder.lte(filter.column, filter.value);
  return builder.eq(filter.column, filter.value);
};

async function fetchRows(ref: QueryLike) {
  let builder = (supabase as any).from(ref.table).select("*");
  if (isQueryRef(ref)) {
    for (const filter of ref.filters) builder = applyFilter(builder, filter);
    for (const order of ref.orders) builder = builder.order(order.column, { ascending: order.ascending });
  }
  const { data, error } = await builder;
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => denormalizeData(ref.table, row));
}

export function getFirestore(_app?: unknown) {
  return {};
}

export function collection(_db: unknown, table: string): CollectionRef {
  return { table };
}

export function doc(_db: unknown, table: string, id: string): DocRef {
  return { table, id };
}

export function where(column: string, op: string, value: unknown): Filter {
  return { column: column === "materiaId" ? "materia_id" : column, op, value };
}

export function orderBy(column: string, direction: "asc" | "desc" = "asc"): Order {
  return { column, ascending: direction !== "desc" };
}

export function query(ref: CollectionRef, ...constraints: Array<Filter | Order>): QueryRef {
  return {
    table: ref.table,
    filters: constraints.filter((c): c is Filter => "op" in c),
    orders: constraints.filter((c): c is Order => "ascending" in c),
  };
}

export async function getDocs(ref: QueryLike): Promise<CompatQuerySnapshot> {
  const rows = await fetchRows(ref);
  return {
    empty: rows.length === 0,
    docs: rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      data: () => row,
    })),
  };
}

export async function getDoc(ref: DocRef): Promise<CompatDocSnapshot> {
  if (ref.table === "user_roles") {
    const { data, error } = await (supabase as any).from(ref.table).select("*").eq("user_id", ref.id);
    if (error) throw error;
    const selected = (data ?? []).find((row: Record<string, unknown>) => row.role === "admin") ?? data?.[0] ?? null;
    const row = selected ? denormalizeData(ref.table, selected as Record<string, unknown>) : null;
    return {
      exists: () => !!row,
      id: ref.id,
      data: () => row,
    };
  }

  const { data, error } = await (supabase as any).from(ref.table).select("*").eq(keyColumnFor(ref.table), ref.id).maybeSingle();
  if (error) throw error;
  const row = data ? denormalizeData(ref.table, data as Record<string, unknown>) : null;
  return {
    exists: () => !!row,
    id: ref.id,
    data: () => row,
  };
}

export async function addDoc(ref: CollectionRef, data: Record<string, unknown>) {
  const payload = normalizeData(ref.table, data);
  const { data: inserted, error } = await (supabase as any).from(ref.table).insert(payload).select("id").single();
  if (error) throw error;
  return { id: inserted.id };
}

export async function setDoc(ref: DocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
  const keyColumn = keyColumnFor(ref.table);
  const payload = normalizeData(ref.table, { ...data, [keyColumn]: ref.id });
  const query = (supabase as any).from(ref.table);
  const existing = options?.merge ? await query.select("id").eq(keyColumn, ref.id).maybeSingle() : null;
  if (existing?.error) throw existing.error;
  const { error } = options?.merge && !existing?.data
    ? await query.insert(payload)
    : await query.update(payload).eq(keyColumn, ref.id);
  if (error) throw error;
}

export async function updateDoc(ref: DocRef, data: Record<string, unknown>) {
  const payload = normalizeData(ref.table, data);
  const { error } = await (supabase as any).from(ref.table).update(payload).eq(keyColumnFor(ref.table), ref.id);
  if (error) throw error;
}

export async function deleteDoc(ref: DocRef) {
  const { error } = await (supabase as any).from(ref.table).delete().eq(keyColumnFor(ref.table), ref.id);
  if (error) throw error;
}

export function onSnapshot(ref: DocRef | QueryLike, callback: (snapshot: any) => void) {
  let active = true;
  if ("id" in ref) {
    getDoc(ref).then((snapshot) => active && callback(snapshot)).catch(console.error);
  } else {
    getDocs(ref).then((snapshot) => active && callback(snapshot)).catch(console.error);
  }
  return () => { active = false; };
}

export function increment(value: number) {
  return value;
}