import { mensajeError } from "./lib/errores";
import { Formulario } from "./Formulario";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import { descargarExcel } from "./excel";

export type Legal = {
  id: string;
  tipo: string;
  numero: string;
  emision: string;
  hasta: string;
};
type LegalForm = {
  id?: string;
  tipo: string;
  numero: string;
  emision: string;
  hasta: string;
};
const vacio: LegalForm = { tipo: "", numero: "", emision: "", hasta: "" };

function dia(iso: string) {
  return iso.slice(0, 10);
}
function dias(iso: string) {
  return Math.ceil((new Date(dia(iso)).getTime() - Date.now()) / 86400000);
}

export function Legales({
  rows,
  canWrite,
  yo,
  onNote,
  onSaved,
}: {
  rows: Legal[];
  canWrite: boolean;
  yo: string;
  onNote: (texto: string) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LegalForm | null>(null);
  const [error, setError] = useState("");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.tipo.trim() || !form.numero.trim()) { setError("Completa el tipo y número del documento."); return; }
    if (form.hasta < form.emision) { setError("La fecha de vencimiento debe ser igual o posterior a la fecha de emisión."); return; }
    setError("");
    const datos = {
      tipo: form.tipo.trim(),
      numero: form.numero.trim(),
      emision: form.emision,
      hasta: form.hasta,
    };
    const q = form.id
      ? supabase.from("legales").update(datos).eq("id", form.id)
      : supabase.from("legales").insert(datos);
    const { error: fallo } = await q;
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    const renovacion = Boolean(form.id);
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: renovacion
          ? "Renovar documento legal"
          : "Registrar documento legal",
        recurso: datos.tipo,
      });
    setForm(null);
    onNote(renovacion ? "Renovación registrada." : "Documento legal creado.");
    onSaved();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Documentos legales</h1>
          <p className="mt-1 text-sm text-muted">
            Son de la empresa, no de un expediente. Renovar no borra la emisión
            usada en una oferta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <button
              onClick={() => {
                setError("");
                setForm(vacio);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-panel px-4 text-sm font-semibold text-card"
            >
              <Plus className="size-4" aria-hidden="true" /> Nuevo
            </button>
          ) : null}
          <button
            onClick={() =>
              descargarExcel(
                "documentos-legales.xlsx",
                [
                  ["Tipo", "Número", "Emisión", "Vence", "Días", "Situación"],
                  ...rows.map((l) => {
                    const n = dias(l.hasta);
                    return [
                      l.tipo,
                      l.numero,
                      dia(l.emision),
                      dia(l.hasta),
                      n,
                      n < 0 ? "Vencido" : n <= 30 ? "Por vencer" : "Vigente",
                    ];
                  }),
                ],
                [0],
              )
            }
            className="min-h-11 rounded-md bg-card px-4 text-sm font-medium ring-1 ring-line"
          >
            Exportar Excel
          </button>
        </div>
      </header>
      <div className="grid gap-3">
        {rows.map((d) => {
          const left = dias(d.hasta);
          const tone = left < 0 ? "bg-bad" : left <= 15 ? "bg-warn" : "bg-good";
          return (
            <article
              key={d.id}
              className="registro-card rounded-xl bg-card p-4 ring-1 ring-line"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{d.tipo}</p>
                  <p className="text-sm text-muted">
                    {d.numero} · vence {dia(d.hasta)}
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {left < 0 ? "Vencido" : `${left} días`}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper">
                <div
                  className={`h-full ${tone}`}
                  style={{
                    width: `${Math.max(8, Math.min(100, left < 0 ? 100 : (30 - Math.min(left, 30)) * 3))}%`,
                  }}
                />
              </div>
              {canWrite ? (
                <button
                  onClick={() => {
                    setError("");
                    setForm({
                      id: d.id,
                      tipo: d.tipo,
                      numero: d.numero,
                      emision: dia(d.emision),
                      hasta: dia(d.hasta),
                    });
                  }}
                  className="mt-3 text-sm font-medium text-panel"
                >
                  Registrar renovación
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {form ? (
        <Formulario onClose={() => setForm(null)}>
          <form
            className="sheet grid content-start gap-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardar}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-formulario" className="font-display text-2xl">
                {form.id ? "Registrar renovación" : "Nuevo documento legal"}
              </h2>
              <button type="button" aria-label="Cerrar formulario" className="grid size-10 place-items-center rounded-md text-muted hover:bg-paper" onClick={() => setForm(null)}>
                <X className="size-5" />
              </button>
            </div>
            <label className="text-sm">
              Tipo
              <input
                required
                className="field mt-1"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Número
              <input
                required
                className="field mt-1"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Emisión
              <input
                required
                type="date"
                className="field mt-1"
                value={form.emision}
                onChange={(e) => setForm({ ...form, emision: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Vence
              <input
                required
                type="date"
                className="field mt-1"
                value={form.hasta}
                onChange={(e) => setForm({ ...form, hasta: e.target.value })}
              />
            </label>
            {error ? <p className="text-sm text-bad">{error}</p> : null}
            <button className="min-h-11 rounded-md bg-panel font-semibold text-card">
              Guardar
            </button>
          </form>
        </Formulario>
      ) : null}
    </>
  );
}
