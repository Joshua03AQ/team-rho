import { mensajeError } from "./lib/errores";
import { Formulario } from "./Formulario";
import { Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";

export type Aviso = {
  id: string;
  user_id: string;
  autor_id?: string | null;
  texto: string;
  fecha: string;
  leida: boolean;
};

export type Persona = { id: string; nombre: string };

type Hecho = {
  id: string;
  fecha: string;
  actor_id: string;
  accion: string;
  recurso: string;
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-NI", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Avisos({
  rows,
  personas,
  yo,
  canWrite,
  onNote,
  onSaved,
}: {
  rows: Aviso[];
  personas: Persona[];
  yo: string;
  canWrite: boolean;
  onNote: (texto: string) => void;
  onSaved: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [para, setPara] = useState(personas[0]?.id ?? "");
  const [error, setError] = useState("");
  const [gerencia, setGerencia] = useState(false);
  const [hechos, setHechos] = useState<Hecho[]>([]);
  const nombre = (id: string) =>
    personas.find((p) => p.id === id)?.nombre ?? "Usuario";
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const vistos = hechos.filter((h) =>
    (nombre(h.actor_id) + " " + h.accion + " " + h.recurso)
      .toLowerCase()
      .includes(q),
  );

  function cargarHechos() {
    supabase
      .from("auditoria")
      .select("id, fecha, actor_id, accion, recurso")
      .order("fecha", { ascending: false })
      .limit(12)
      .then(({ data }) => setHechos((data ?? []) as Hecho[]));
  }

  useEffect(() => {
    supabase
      .from("perfiles")
      .select("rol")
      .eq("id", yo)
      .single()
      .then(({ data }) => {
        if (data?.rol === "Gerencia") {
          setGerencia(true);
          cargarHechos();
        }
      });
  }, [yo]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError("");
    const mensaje = texto.trim();
    if (!mensaje) {
      setError("Escribe el mensaje del aviso.");
      return;
    }
    const { error: fallo } = editando
  ? await supabase
      .from("avisos")
      .update({ texto: mensaje, user_id: para, leida: false })
      .eq("id", editando)
  : await supabase
      .from("avisos")
      .insert({ user_id: para, autor_id: yo, texto: mensaje });

if (fallo) {
  setError(mensajeError(fallo));
  return;
}

await supabase.channel("avisos-equipo").send({
  type: "broadcast",
  event: "cambio",
  payload: {},
});
    setTexto("");
    setAbierto(false);
    onSaved();
    onNote(editando ? "Aviso actualizado." : "Aviso enviado.");
    cargarHechos();
  }
  async function eliminar(id: string) {
    if (
      !window.confirm(
        "¿Eliminar este aviso? La acción quedará registrada en auditoría.",
      )
    )
      return;

    const { error: fallo } = await supabase.rpc("eliminar_aviso", {
      p_aviso_id: id,
    });

    if (fallo) {
      onNote(mensajeError(fallo));
      return;
    }

    onSaved();
    cargarHechos();
    onNote("Aviso eliminado. ");
  }
  async function leer(id: string) {
    const { error: fallo } = await supabase
      .from("avisos")
      .update({ leida: true })
      .eq("id", id);
    if (!fallo) onSaved();
  }

  const mios = rows.filter(
    (a) => a.user_id === yo || a.autor_id === yo || gerencia,
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Avisos</h1>
          <p className="mt-1 text-sm text-muted">
            Mensajes y recordatorios para el equipo.
          </p>
        </div>
        {canWrite ? (
          <button
            onClick={() => {
              setError("");
              setEditando(null);
              setTexto("");
              setPara(personas[0]?.id ?? "");
              setAbierto(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-panel px-4 text-sm font-semibold text-card"
          >
            <Plus className="size-4" aria-hidden="true" /> Nuevo
          </button>
        ) : null}
      </header>
      <ul className="overflow-clip divide-y divide-line rounded-xl bg-card ring-1 ring-line">
        {mios.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted">Bandeja vacía.</li>
        ) : null}
        {mios.map((a) => (
          <li
            key={a.id}
            className="control-row flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p
                className={`whitespace-pre-wrap break-words ${a.leida ? "text-muted" : "font-medium"}`}
              >
                {a.texto}
              </p>
              <p className="text-xs text-muted">
                {a.user_id !== yo ? `Para ${nombre(a.user_id)} · ` : ""}
                {fecha(a.fecha)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {a.autor_id === yo && (
                <button
                  className="min-h-10 text-sm font-medium text-panel"
                  onClick={() => {
                    setEditando(a.id);
                    setTexto(a.texto);
                    setPara(a.user_id);
                    setError("");
                    setAbierto(true);
                  }}
                >
                  Editar
                </button>
              )}
              {a.autor_id === yo && (
                <button
                  type="button"
                  className="min-h-10 text-sm font-medium text-bad"
                  onClick={() => eliminar(a.id)}
                >
                  Eliminar
                </button>
              )}
              {!a.leida && a.user_id === yo ? (
                <button
                  onClick={() => leer(a.id)}
                  className="min-h-10 text-sm font-medium text-panel"
                >
                  Marcar leído
                </button>
              ) : a.leida ? (
                <span className="estado-pill is-ok">Leído</span>
              ) : (
                <span className="estado-pill is-ev">Pendiente</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {gerencia ? (
        <section className="overflow-clip rounded-xl bg-card ring-1 ring-line">
          <h2 className="px-4 pt-4 font-display text-2xl">Auditoría</h2>
          <div className="mx-4 mt-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar persona, acción o expediente"
              className="field"
              aria-label="Buscar en auditoría"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-2">Cuándo</th>
                  <th className="px-4 py-2">Quién</th>
                  <th className="px-4 py-2">Qué</th>
                </tr>
              </thead>
              <tbody>
                {vistos.map((h) => (
                  <tr key={h.id} className="control-row border-t border-line">
                    <td className="px-4 py-2">{fecha(h.fecha)}</td>
                    <td className="px-4 py-2">{nombre(h.actor_id)}</td>
                    <td className="px-4 py-2">
                      {h.accion} · {h.recurso}
                    </td>
                  </tr>
                ))}
                {vistos.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={3}>
                      Todavía no hay movimientos.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {abierto ? (
        <Formulario onClose={() => setAbierto(false)}>
          <form
            className="sheet grid content-start gap-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardar}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-formulario" className="font-display text-2xl">
                {editando ? "Editar aviso" : "Nuevo aviso"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar formulario"
                className="grid size-10 place-items-center rounded-md text-muted hover:bg-paper"
                onClick={() => setAbierto(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <label className="text-sm">
              Para
              <select
                className="field mt-1"
                required
                //disabled={Boolean(editando)}
                value={para}
                onChange={(e) => setPara(e.target.value)}
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Mensaje
              <textarea
                rows={4}
                required
                className="field mt-1"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-bad">{error}</p> : null}
            <button className="min-h-11 rounded-md bg-panel font-semibold text-card">
              {editando ? "Guardar cambios" : "Enviar"}
            </button>
          </form>
        </Formulario>
      ) : null}
    </>
  );
}
