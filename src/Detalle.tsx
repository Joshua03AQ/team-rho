import { mensajeError } from "./lib/errores";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

type Exp = {
  id: string;
  codigo: string;
  nombre: string;
  cliente_id: string;
  anio: number;
  tipo: string;
  ambito: string;
  ubicacion: string;
  estado: string;
  responsable_id: string;
  motivo: string;
};
type Ver = { n: number; archivo: string; motivo: string; fecha: string };
type Doc = {
  id: string;
  nombre: string;
  categoria: string;
  visibilidad: string;
  versiones: Ver[];
};
type Pre = {
  id: string;
  revision: number;
  moneda: string;
  materiales: number;
  mano: number;
  equipos: number;
  transporte: number;
  otros: number;
  aprobado: boolean;
};
type Persona = { id: string; nombre: string; rol: string };
type Cli = { id: string; razon: string; contacto: string };

const RAIL = ["Identificada", "EnEvaluacion", "EnPreparacion", "Presentada"];
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
const SIGUE: Record<string, string[]> = {
  Identificada: ["EnEvaluacion", "Descartada"],
  EnEvaluacion: ["EnPreparacion", "Descartada"],
  EnPreparacion: ["Presentada", "Descartada"],
  Presentada: ["Ganada", "Perdida", "Descartada"],
  Ganada: [],
  Perdida: [],
  Descartada: [],
};

function money(n: number) {
  return new Intl.NumberFormat("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}
function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-NI", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Detalle({
  id,
  clientes,
  yo,
  canWrite,
  gerencia,
  onClose,
  onChanged,
  onNote,
}: {
  id: string;
  clientes: Cli[];
  yo: string;
  canWrite: boolean;
  gerencia: boolean;
  onClose: () => void;
  onChanged: () => void;
  onNote: (texto: string) => void;
}) {
  const [exp, setExp] = useState<Exp | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pres, setPres] = useState<Pre[]>([]);
  const [accesos, setAccesos] = useState<string[]>([]);
  const [gente, setGente] = useState<Persona[]>([]);
  const [tab, setTab] = useState<
    "info" | "docs" | "presupuesto" | "estado" | "compartir"
  >("info");
  const [error, setError] = useState("");
  const [estado, setEstado] = useState("EnEvaluacion");
  const [motivo, setMotivo] = useState("");
  const [share, setShare] = useState("");
  const [doc, setDoc] = useState({
    nombre: "",
    categoria: "Plano",
    visibilidad: "Campo",
    archivo: "",
    motivo: "",
  });
  const [budget, setBudget] = useState({
    moneda: "NIO",
    materiales: 0,
    mano: 0,
    equipos: 0,
    transporte: 0,
    otros: 0,
  });

  async function cargar() {
    const [
      { data: fila },
      { data: drows },
      { data: prows },
      { data: arows },
      { data: urows },
    ] = await Promise.all([
      supabase
        .from("expedientes")
        .select(
          "id, codigo, nombre, cliente_id, anio, tipo, ambito, ubicacion, estado, responsable_id, motivo",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("documentos")
        .select(
          "id, nombre, categoria, visibilidad, versiones(n, archivo, motivo, fecha)",
        )
        .eq("expediente_id", id),
      supabase
        .from("presupuestos")
        .select(
          "id, revision, moneda, materiales, mano, equipos, transporte, otros, aprobado",
        )
        .eq("expediente_id", id)
        .order("revision", { ascending: false }),
      supabase
        .from("expediente_accesos")
        .select("user_id")
        .eq("expediente_id", id),
      supabase.from("perfiles").select("id, nombre, rol").order("nombre"),
    ]);
    if (fila) {
      setExp(fila as Exp);
      setEstado((SIGUE[fila.estado] ?? [])[0] ?? fila.estado);
    }
    setDocs((drows ?? []) as Doc[]);
    setPres((prows ?? []) as Pre[]);
    setAccesos((arows ?? []).map((a) => a.user_id));
    const personas = (urows ?? []) as Persona[];
    setGente(personas);
    setShare(personas.find((p) => p.rol === "ConsultaTecnica")?.id ?? "");
  }

  useEffect(() => {
    cargar();
  }, [id]);

  if (!exp) return <p className="text-sm text-muted">Abriendo expediente…</p>;
  const abierto = exp;
  const cliente = clientes.find((c) => c.id === abierto.cliente_id);
  const consultas = gente.filter((p) => p.rol === "ConsultaTecnica");
  const fin = ["Ganada", "Perdida", "Descartada"].includes(abierto.estado)
    ? abierto.estado
    : null;
  const total = (p: Pre) =>
    Number(p.materiales) +
    Number(p.mano) +
    Number(p.equipos) +
    Number(p.transporte) +
    Number(p.otros);

  async function guardarEstado(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { error: fallo } = await supabase
      .from("expedientes")
      .update({ estado, motivo })
      .eq("id", abierto.id);
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    const { error: bitacora } = await supabase.from("auditoria").insert({
      actor_id: yo,
      accion: "Cambiar estado",
      recurso: abierto.codigo,
    });
    if (bitacora) {
      setError("El estado se actualizó, pero no se pudo registrar en el historial. Informa a la persona encargada del sistema.");
      return;
    }
    onNote("Estado actualizado.");
    onChanged();
    cargar();
  }

  async function guardarDoc(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (doc.motivo.trim().length < 4) {
      setError("El motivo necesita al menos 4 caracteres.");
      return;
    }
    const previo = docs.find(
      (d) => d.nombre.toLowerCase() === doc.nombre.trim().toLowerCase(),
    );
    let documentoId = previo?.id;
    if (!documentoId) {
      const { data, error: fallo } = await supabase
        .from("documentos")
        .insert({
          expediente_id: abierto.id,
          nombre: doc.nombre.trim(),
          categoria: doc.categoria,
          visibilidad: doc.visibilidad,
        })
        .select("id")
        .single();
      if (fallo || !data) {
        setError(mensajeError(fallo));
        return;
      }

      documentoId = data.id;
    }
    const n = previo ? Math.max(...previo.versiones.map((v) => v.n), 0) + 1 : 1;
    const { error: fallo } = await supabase
      .from("versiones")
      .insert({
        documento_id: documentoId,
        n,
        archivo: doc.archivo.trim(),
        motivo: doc.motivo.trim(),
        autor_id: yo,
      });
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: "Registrar versión",
        recurso: abierto.codigo,
      });
    setDoc({
      nombre: "",
      categoria: "Plano",
      visibilidad: "Campo",
      archivo: "",
      motivo: "",
    });
    onNote("Versión registrada.");
    cargar();
  }

  async function guardarPresupuesto(e: FormEvent) {
    e.preventDefault();
    setError("");
    const revision = pres.reduce((m, p) => Math.max(m, p.revision), 0) + 1;
    const { error: fallo } = await supabase
      .from("presupuestos")
      .insert({ expediente_id: abierto.id, revision, ...budget });
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: "Nueva revisión de presupuesto",
        recurso: abierto.codigo,
      });
    onNote("Revisión guardada.");
    cargar();
  }

  return (
    <div>
      <button onClick={onClose} className="mb-3 text-sm font-medium text-panel">
        Volver al listado
      </button>
      <header className="cover">
        <p className="text-xs tracking-[0.16em] text-card/70 uppercase">
          {abierto.codigo} · {abierto.anio}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">
            {abierto.nombre}
          </h2>
          <span className={`estado-pill ${PILA[abierto.estado] ?? ""}`}>
            {LABEL[abierto.estado] ?? abierto.estado}
          </span>
        </div>
        <p className="mt-2 text-sm text-card/80">
          {cliente?.razon} · {abierto.ubicacion}
        </p>
        <ol aria-label="Etapas del expediente" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RAIL.map((step, i) => {
            const idx = RAIL.indexOf(abierto.estado);
            const on =
              abierto.estado === "Ganada" ||
              abierto.estado === "Perdida" ||
              idx >= i;
            return (
              <li
                key={step}
                aria-current={abierto.estado === step ? "step" : undefined}
                className={`rail-step ${PILA[step]} ${on ? "is-on" : "is-ahead"} ${abierto.estado === step ? "is-now" : ""}`}
              >
                <span className="rail-number">{i + 1}</span>
                <span>{LABEL[step]}</span>
              </li>
            );
          })}
        </ol>
        {fin ? (
          <p className="mt-3 text-sm text-card/85">
            Cierre: {LABEL[fin]}
            {abierto.motivo ? ` — ${abierto.motivo}` : ""}
          </p>
        ) : null}
      </header>
      <div className="hanger" role="tablist">
        {(
          [
            ["info", "Ficha"],
            ["docs", "Documentos"],
            ["presupuesto", "Presupuesto"],
            ["estado", "Estado"],
            ["compartir", "Acceso"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setError("");
            }}
            className={tab === k ? "is-on" : ""}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="folder-body space-y-4">
        {tab === "info" ? (
          <section className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-line sm:grid-cols-2">
            <p>
              <span className="block text-xs text-muted">Tipo</span>
              <span className="font-medium">
                {abierto.tipo === "Licitacion" ? "Licitación" : "Propuesta"}
              </span>
            </p>
            <p>
              <span className="block text-xs text-muted">Ámbito</span>
              <span className="font-medium">
                {abierto.ambito === "Publico" ? "Público" : "Privado"}
              </span>
            </p>
            <p>
              <span className="block text-xs text-muted">Responsable</span>
              <span className="font-medium">
                {gente.find((p) => p.id === abierto.responsable_id)?.nombre ??
                  "—"}
              </span>
            </p>
            <p>
              <span className="block text-xs text-muted">Contacto</span>
              <span className="font-medium">{cliente?.contacto ?? "—"}</span>
            </p>
          </section>
        ) : null}
        {tab === "docs" ? (
          <section className="space-y-4">
            {canWrite ? (
              <form
                className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-line sm:grid-cols-2"
                onSubmit={guardarDoc}
              >
                <h2 className="font-display text-2xl sm:col-span-2">
                  Nueva versión
                </h2>
                <label className="text-sm">
                  Nombre
                  <input
                    required
                    className="field mt-1"
                    value={doc.nombre}
                    onChange={(e) => setDoc({ ...doc, nombre: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  Archivo
                  <input
                    required
                    className="field mt-1"
                    placeholder="plano-v3.pdf"
                    value={doc.archivo}
                    onChange={(e) =>
                      setDoc({ ...doc, archivo: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm">
                  Categoría
                  <select
                    className="field mt-1"
                    value={doc.categoria}
                    onChange={(e) =>
                      setDoc({ ...doc, categoria: e.target.value })
                    }
                  >
                    <option>Plano</option>
                    <option>Oferta</option>
                    <option>Evidencia</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label className="text-sm">
                  Visibilidad
                  <select
                    className="field mt-1"
                    value={doc.visibilidad}
                    onChange={(e) =>
                      setDoc({ ...doc, visibilidad: e.target.value })
                    }
                  >
                    <option value="Campo">Campo</option>
                    <option value="Interna">Interna</option>
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  Motivo
                  <input
                    required
                    className="field mt-1"
                    value={doc.motivo}
                    onChange={(e) => setDoc({ ...doc, motivo: e.target.value })}
                  />
                </label>
                <button className="min-h-11 rounded-md bg-panel text-sm font-semibold text-card sm:col-span-2">
                  Guardar versión
                </button>
              </form>
            ) : null}
            <ul className="overflow-clip divide-y divide-line rounded-xl bg-card ring-1 ring-line">
              {docs.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{d.nombre}</p>
                      <p className="text-xs text-muted">
                        {d.categoria} · {d.visibilidad}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-panel">
                      v{Math.max(...d.versiones.map((v) => v.n), 0)}
                    </span>
                  </div>
                  <ol className="mt-2 space-y-1 border-l border-line pl-3">
                    {[...d.versiones]
                      .sort((a, b) => b.n - a.n)
                      .map((v) => (
                        <li key={v.n} className="text-xs text-muted">
                          v{v.n} · {v.archivo} · {v.motivo} · {fecha(v.fecha)}
                        </li>
                      ))}
                  </ol>
                </li>
              ))}
              {docs.length === 0 ? (
                <li className="px-4 py-8 text-sm text-muted">
                  Sin documentos visibles para tu rol.
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
        {tab === "presupuesto" ? (
          <section className="space-y-4">
            {canWrite ? (
              <form
                className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-line sm:grid-cols-3"
                onSubmit={guardarPresupuesto}
              >
                <h2 className="font-display text-2xl sm:col-span-3">
                  Nueva revisión
                </h2>
                {(
                  [
                    "materiales",
                    "mano",
                    "equipos",
                    "transporte",
                    "otros",
                  ] as const
                ).map((k) => (
                  <label key={k} className="text-sm capitalize">
                    {k}
                    <input
                      type="number"
                      min={0}
                      className="field mt-1"
                      value={budget[k]}
                      onChange={(e) =>
                        setBudget({ ...budget, [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <label className="text-sm">
                  Moneda
                  <select
                    className="field mt-1"
                    value={budget.moneda}
                    onChange={(e) =>
                      setBudget({ ...budget, moneda: e.target.value })
                    }
                  >
                    <option>NIO</option>
                    <option>USD</option>
                  </select>
                </label>
                <button className="min-h-11 rounded-md bg-panel text-sm font-semibold text-card sm:col-span-3">
                  Guardar revisión
                </button>
              </form>
            ) : null}
            {pres.map((p) => (
              <article
                key={p.id}
                className="rounded-xl bg-card p-4 ring-1 ring-line"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    Revisión {p.revision} · {p.moneda} {money(total(p))}
                  </p>
                  <span
                    className={`text-xs font-medium ${p.aprobado ? "text-good" : "text-warn"}`}
                  >
                    {p.aprobado ? "Aprobado" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Mat {money(p.materiales)} · MO {money(p.mano)} · Eq{" "}
                  {money(p.equipos)} · Tr {money(p.transporte)} · Ot{" "}
                  {money(p.otros)}
                </p>
                {gerencia && !p.aprobado ? (
                  <button
                    onClick={async () => {
                      const { error: fallo } = await supabase
                        .from("presupuestos")
                        .update({ aprobado: true })
                        .eq("id", p.id);
                      if (fallo) { onNote(mensajeError(fallo)); return; }
                      await supabase
                        .from("auditoria")
                        .insert({
                          actor_id: yo,
                          accion: "Aprobar presupuesto",
                          recurso: abierto.codigo,
                        });
                      onNote("Presupuesto aprobado.");
                      cargar();
                    }}
                    className="mt-3 min-h-10 rounded-md bg-panel px-3 text-sm font-semibold text-card"
                  >
                    Aprobar
                  </button>
                ) : null}
              </article>
            ))}
            {pres.length === 0 ? (
              <p className="text-sm text-muted">No hay revisiones visibles.</p>
            ) : null}
          </section>
        ) : null}
        {tab === "estado" ? (
          <section className="rounded-xl bg-card p-4 ring-1 ring-line">
            <h2 className="font-display text-2xl">Cambiar estado</h2>
            <p className="mt-1 text-sm text-muted">
              Ahora: {LABEL[abierto.estado]}. Solo se ofrecen los pasos válidos.
            </p>
            {canWrite && (SIGUE[abierto.estado] ?? []).length > 0 ? (
              <form className="mt-4 grid gap-3" onSubmit={guardarEstado}>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="field"
                >
                  {(SIGUE[abierto.estado] ?? []).map((s) => (
                    <option key={s} value={s}>
                      {LABEL[s]}
                    </option>
                  ))}
                </select>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo, obligatorio si cierras"
                  className="field min-h-24"
                />
                <button className="min-h-11 rounded-md bg-panel text-sm font-semibold text-card">
                  Confirmar
                </button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-muted">
                {canWrite
                  ? "Este expediente ya está cerrado."
                  : "Tu rol no cambia estados."}
              </p>
            )}
          </section>
        ) : null}
        {tab === "compartir" ? (
          <section className="rounded-xl bg-card p-4 ring-1 ring-line">
            <h2 className="font-display text-2xl">Acceso de campo</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {accesos.length === 0 ? (
                <li className="text-muted">Nadie de consulta tiene acceso.</li>
              ) : null}
              {accesos.map((uid) => (
                <li key={uid}>
                  {gente.find((p) => p.id === uid)?.nombre ?? "Usuario"}
                </li>
              ))}
            </ul>
            {canWrite ? (
              <form
                className="mt-4 flex flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  const { error: fallo } = await supabase
                    .from("expediente_accesos")
                    .insert({ expediente_id: abierto.id, user_id: share });
                  if (fallo) {
                    setError(mensajeError(fallo));
                    return;
                  }
                  await supabase
                    .from("auditoria")
                    .insert({
                      actor_id: yo,
                      accion: "Compartir expediente",
                      recurso: abierto.codigo,
                    });
                  onNote("Acceso compartido.");
                  cargar();
                }}
              >
                <select
                  value={share}
                  onChange={(e) => setShare(e.target.value)}
                  className="field min-w-52"
                >
                  {consultas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
                <button className="min-h-11 rounded-md bg-panel px-4 text-sm font-semibold text-card">
                  Compartir
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </div>
    </div>
  );
}
