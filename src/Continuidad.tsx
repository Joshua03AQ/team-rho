import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Respaldo = { id: string; fecha: string; nota: string };
type Envio = {
  id: string;
  expediente_id: string;
  fecha: string;
  estado: string;
};
type Fila = { id: string; codigo: string; nombre: string; estado: string };

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-NI", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Continuidad({
  respaldos,
  envios,
  expedientes,
  yo,
  onNote,
  onSaved,
}: {
  respaldos: Respaldo[];
  envios: Envio[];
  expedientes: Fila[];
  yo: string;
  onNote: (texto: string) => void;
  onSaved: () => void;
}) {
  const [conPresupuesto, setConPresupuesto] = useState<string[]>([]);
  const [conDocumento, setConDocumento] = useState<string[]>([]);
  const ganadas = expedientes.filter((e) => e.estado === "Ganada");

  useEffect(() => {
    const ids = expedientes.filter((e) => e.estado === "Ganada").map((e) => e.id);
    if (ids.length === 0) return;
    supabase
      .from("presupuestos")
      .select("expediente_id")
      .eq("aprobado", true)
      .in("expediente_id", ids)
      .then(({ data }) => {
        setConPresupuesto([
          ...new Set((data ?? []).map((r) => r.expediente_id)),
        ]);
      });
    supabase
      .from("documentos")
      .select("expediente_id")
      .in("expediente_id", ids)
      .then(({ data }) => {
        setConDocumento([...new Set((data ?? []).map((r) => r.expediente_id))]);
      });
  }, [expedientes]);

  async function copiar() {
    const { error } = await supabase
      .from("respaldos")
      .insert({
        nota: "Copia de demostración. No sustituye un respaldo productivo.",
      });
    if (error) { onNote("No se pudo registrar la solicitud. Revisa tu conexión e inténtalo de nuevo."); return; }
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: "Registrar solicitud de copia",
        recurso: "Respaldo",
      });
    onNote("Solicitud de copia registrada.");
    onSaved();
  }

  async function encolar(fila: Fila) {
    const { error } = await supabase
      .from("transferencias")
      .insert({ expediente_id: fila.id, estado: "Encolada para Operaciones" });
    if (error) { onNote("No se pudo registrar el envío. Revisa tu conexión e inténtalo de nuevo."); return; }
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: "Encolar a Operaciones",
        recurso: fila.codigo,
      });
    onNote("Envío a Operaciones registrado.");
    onSaved();
  }

  return (
    <>
      <div>
        <h1 className="font-display text-4xl">Continuidad</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Solicitudes de respaldo y envío a Operaciones.
        </p>
      </div>
      <section className="rounded-xl bg-card p-4 ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Respaldo</h2>
          <button
            onClick={copiar}
            className="control-action min-h-10 rounded-md bg-panel px-3 text-sm font-semibold text-card"
          >
            Registrar solicitud de copia
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Demostración: registra la solicitud, sin copiar archivos.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {respaldos.map((r) => (
            <li key={r.id}>
              <span className="font-medium">{fecha(r.fecha)}</span> · {r.nota}
            </li>
          ))}
          {respaldos.length === 0 ? (
            <li className="text-muted">Todavía no hay solicitudes de copia.</li>
          ) : null}
        </ul>
      </section>
      <section className="rounded-xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl">Hacia Operaciones</h2>
        <ul className="mt-3 space-y-2">
          {ganadas.map((e) => {
            const okP = conPresupuesto.includes(e.id);
            const okD = conDocumento.includes(e.id);
            const enviado = envios.find((t) => t.expediente_id === e.id);
            return (
              <li
                key={e.id}
                className="control-row flex flex-wrap items-center justify-between gap-3 rounded-md border border-line px-3 py-3"
              >
                <div>
                  <p className="font-medium">{e.codigo}</p>
                  <p className="text-xs text-muted">
                    {okP ? "Presupuesto aprobado" : "Sin presupuesto aprobado"}{" "}
                    · {okD ? "Hay evidencia" : "Sin documento"}
                  </p>
                </div>
                {enviado ? (
                  <span className="text-sm text-warn">{enviado.estado}</span>
                ) : (
                  <button
                    disabled={!okP || !okD}
                    onClick={() => encolar(e)}
                    className="control-action min-h-10 rounded-md bg-panel px-3 text-sm font-semibold text-card disabled:bg-line disabled:text-muted"
                  >
                    Preparar envío
                  </button>
                )}
              </li>
            );
          })}
          {ganadas.length === 0 ? (
            <li className="py-4 text-sm text-muted">
              Ningún expediente está en Ganada.
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
