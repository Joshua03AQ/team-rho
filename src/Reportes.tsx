import { descargarExcel } from "./excel";

const LABEL: Record<string, string> = {
  Identificada: "Identificada",
  EnEvaluacion: "En evaluación",
  EnPreparacion: "En preparación",
  Presentada: "Presentada",
  Ganada: "Ganada",
  Perdida: "Perdida",
  Descartada: "Descartada",
};

type Fila = {
  codigo: string;
  nombre: string;
  estado: string;
  ubicacion: string;
};

function Bar({
  label,
  n,
  max,
  tone,
}: {
  label: string;
  n: number;
  max: number;
  tone: string;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
      <span>{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-paper">
        <span
          className={`block h-full ${tone}`}
          style={{ width: `${max ? (n / max) * 100 : 0}%` }}
        />
      </span>
      <span>{n}</span>
    </div>
  );
}

export function Reportes({ filas }: { filas: Fila[] }) {
  const g = filas.filter((f) => f.estado === "Ganada").length;
  const p = filas.filter((f) => f.estado === "Perdida").length;
  const d = filas.filter((f) => f.estado === "Descartada").length;
  const tasa = g + p > 0 ? Math.round((g / (g + p)) * 100) : null;
  const max = Math.max(g, p, d, 1);

  function exportar() {
    descargarExcel(
      "resultados.xlsx",
      [
        ["Código", "Obra", "Estado", "Ubicación"],
        ...filas.map((f) => [
          f.codigo,
          f.nombre,
          LABEL[f.estado] ?? f.estado,
          f.ubicacion,
        ]),
      ],
      [0],
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Resultados</h1>
        <button
          onClick={exportar}
          className="min-h-11 rounded-md bg-card px-4 text-sm font-medium ring-1 ring-line"
        >
          Exportar Excel
        </button>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="registro-card rounded-xl bg-card p-4 ring-1 ring-line">
          <p className="text-sm text-muted">Ganadas</p>
          <p className="mt-2 font-display text-4xl">{g}</p>
          <p className="mt-1 text-xs text-muted">Favorables</p>
        </article>
        <article className="registro-card rounded-xl bg-card p-4 ring-1 ring-line">
          <p className="text-sm text-muted">Perdidas</p>
          <p className="mt-2 font-display text-4xl">{p}</p>
          <p className="mt-1 text-xs text-muted">No adjudicadas</p>
        </article>
        <article className="registro-card rounded-xl bg-card p-4 ring-1 ring-line">
          <p className="text-sm text-muted">Descartadas</p>
          <p className="mt-2 font-display text-4xl">{d}</p>
          <p className="mt-1 text-xs text-muted">No se presentaron</p>
        </article>
      </div>
      <section className="rounded-xl bg-card p-4 ring-1 ring-line">
        <p className="font-display text-3xl">
          {tasa === null ? "Sin tasa" : `${tasa}%`}
        </p>
        <p className="text-sm text-muted">
          {tasa === null
            ? "Hace falta al menos una ganada o una perdida."
            : "Las descartadas no entran en este porcentaje."}
        </p>
        <div className="mt-4 space-y-2">
          <Bar label="Ganadas" n={g} max={max} tone="bg-good" />
          <Bar label="Perdidas" n={p} max={max} tone="bg-bad" />
          <Bar label="Descartadas" n={d} max={max} tone="bg-muted" />
        </div>
      </section>
    </>
  );
}
