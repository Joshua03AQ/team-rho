import { Plus } from "lucide-react";

type Exp = {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  cliente_id: string;
  ubicacion: string;
};
type Cli = { id: string; razon: string };
type Doc = { id: string; tipo: string; numero: string; hasta: string };

const RAIL = [
  "Identificada",
  "EnEvaluacion",
  "EnPreparacion",
  "Presentada",
] as const;
const LABEL: Record<string, string> = {
  Identificada: "Identificada",
  EnEvaluacion: "En evaluación",
  EnPreparacion: "En preparación",
  Presentada: "Presentada",
  Ganada: "Ganada",
  Perdida: "Perdida",
  Descartada: "Descartada",
};
const PILA: Record<string, string> = {
  Identificada: "is-id",
  EnEvaluacion: "is-ev",
  EnPreparacion: "is-pr",
  Presentada: "is-ps",
  Ganada: "is-ok",
  Perdida: "is-no",
  Descartada: "is-off",
};

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
function dias(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function Mesa({
  nombre,
  expedientes,
  clientes,
  legales,
  sinLeer,
  onOpen,
  onGo,
  onNew,
  canWrite,
}: {
  nombre: string;
  expedientes: Exp[];
  clientes: Cli[];
  legales: Doc[];
  sinLeer: number;
  onOpen: (e: Exp) => void;
  onGo: (p: "expedientes" | "reportes" | "avisos" | "legales", estado?: string) => void;
  onNew: () => void;
  canWrite: boolean;
}) {
  const cliente = (id: string) =>
    clientes.find((c) => c.id === id)?.razon ?? "";
  const vigencias = [...legales].sort((a, b) => dias(a.hasta) - dias(b.hasta));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-panel uppercase">
            {saludo()}, {nombre.split(" ")[0]}
          </p>
          <h1 className="mt-1 font-display text-4xl">Mesa de trabajo</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            El tramo es el expediente. Toca un estado para ver solo ese grupo.
          </p>
        </div>
        {canWrite ? (
  <button onClick={onNew} className="flex min-h-11 items-center gap-2 rounded-md bg-panel px-4 text-sm font-semibold text-card">
    <Plus className="size-4" /> Nuevo expediente
  </button>
) : null}
      </header>
      <div className="pipe">
        {RAIL.map((step, i) => (
          <button
            key={step}
            className="pipe-step"
            onClick={() => onGo("expedientes", step)}
          >
            <i>0{i + 1}</i>
            <strong>
              {expedientes.filter((e) => e.estado === step).length}
            </strong>
            <em>{LABEL[step]}</em>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["Ganada", "Perdida", "Descartada"] as const).map((step) => (
          <button
            key={step}
            className="chip"
            onClick={() => onGo("expedientes", step)}
          >
            {LABEL[step]} ·{" "}
            {expedientes.filter((e) => e.estado === step).length}
          </button>
        ))}
        <button className="chip" onClick={() => onGo("reportes")}>
          Ver tasa
        </button>
        <button className="chip" onClick={() => onGo("avisos")}>
          Avisos · {sinLeer}
        </button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <section className="rounded-xl bg-card p-3 ring-1 ring-line lg:col-span-3">
          <div className="mb-1 flex items-center justify-between px-2 pt-1">
            <h2 className="font-display text-2xl">En la mesa</h2>
            <button
              className="text-sm font-medium text-panel"
              onClick={() => onGo("expedientes", "todos")}
            >
              Listado
            </button>
          </div>
          <ul>
            {expedientes.slice(0, 5).map((e) => {
              const idx = RAIL.indexOf(e.estado as (typeof RAIL)[number]);
              return (
                <li key={e.id}>
                  <button className="dossier" onClick={() => onOpen(e)}>
                    <span className="hidden w-28 font-medium sm:block">
                      {e.codigo}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {e.nombre}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {cliente(e.cliente_id)}
                      </span>
                      <span className="mini-rail" aria-hidden>
                        {RAIL.map((step, i) => (
                          <i
                            key={step}
                            className={
                              e.estado === "Ganada" || (idx >= 0 && i <= idx)
                                ? "on"
                                : e.estado === "Perdida" ||
                                    e.estado === "Descartada"
                                  ? "lose"
                                  : ""
                            }
                          />
                        ))}
                      </span>
                    </span>
                    <span className={`estado-pill ${PILA[e.estado] ?? ""}`}>
                      {LABEL[e.estado] ?? e.estado}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-xl bg-card p-4 ring-1 ring-line lg:col-span-2">
          <h2 className="font-display text-2xl">Vigencias</h2>
          <p className="mt-1 text-xs text-muted">
            30, 15 y 5 días. Renovar deja la emisión anterior.
          </p>
          <ul className="mt-3 space-y-3">
            {vigencias.map((l) => {
              const left = dias(l.hasta);
              const tono =
                left <= 5 ? "is-bad" : left <= 15 ? "is-warn" : "is-good";
              return (
                <li key={l.id}>
                  <button
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => onGo("legales")}
                  >
                    <span className={`stamp ${tono}`}>
                      <b>{left < 0 ? 0 : left}</b>
                      <span>{left < 0 ? "vencido" : "días"}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {l.tipo}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {l.numero}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {vigencias.length === 0 ? (
              <li className="text-sm text-muted">No hay documentos legales.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
