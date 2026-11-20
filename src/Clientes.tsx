import { mensajeError } from "./lib/errores";
import { Formulario } from "./Formulario";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import { descargarExcel } from "./excel";

export type Cliente = {
  id: string;
  razon: string;
  ambito: "Publico" | "Privado";
  contacto: string;
  correo: string;
};

type ClienteForm = {
  id?: string;
  razon: string;
  ambito: "Publico" | "Privado";
  contacto: string;
  correo: string;
};

const vacio: ClienteForm = {
  razon: "",
  ambito: "Privado",
  contacto: "",
  correo: "",
};

export function Clientes({
  rows,
  canWrite,
  yo,
  onNote,
  onSaved,
}: {
  rows: Cliente[];
  canWrite: boolean;
  yo: string;
  onNote: (texto: string) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClienteForm | null>(null);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
const q = busca.trim().toLowerCase();
const visibles = rows.filter((c) => (c.razon + c.contacto + c.correo).toLowerCase().includes(q));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.razon.trim()) { setError("Escribe la razón social del cliente."); return; }
    setError("");
    const datos = {
      razon: form.razon.trim(),
      ambito: form.ambito,
      contacto: form.contacto.trim(),
      correo: form.correo.trim().toLowerCase(),
    };
    const q = form.id
      ? supabase.from("clientes").update(datos).eq("id", form.id)
      : supabase.from("clientes").insert(datos);
    const { error: fallo } = await q;
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    const nuevo = !form.id;
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: nuevo ? "Crear cliente" : "Editar cliente",
        recurso: datos.razon,
      });
    setForm(null);
    onNote(nuevo ? "Cliente creado." : "Cliente actualizado.");
    onSaved();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">Clientes</h1>
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
                "clientes.xlsx",
                [
                  ["Razón social", "Ámbito", "Contacto", "Correo"],
                  ...rows.map((c) => [
                    c.razon,
                    c.ambito === "Publico" ? "Público" : "Privado",
                    c.contacto,
                    c.correo,
                  ]),
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
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar razón social, contacto o correo" className="field" aria-label="Buscar clientes" />
      <div className="grid gap-3 md:grid-cols-2">
        {visibles.map((c) => (
          <article
            key={c.id}
            className="registro-card rounded-xl bg-card p-4 ring-1 ring-line"
          >
            <p className="font-medium">{c.razon}</p>
            <p className="mt-1 text-sm text-muted">
              {c.ambito === "Publico" ? "Público" : "Privado"} · {c.contacto}
            </p>
            <p className="text-sm text-muted">{c.correo}</p>
            {canWrite ? (
              <button
                onClick={() => {
                  setError("");
                  setForm(c);
                }}
                className="mt-3 min-h-10 text-sm font-medium text-panel"
              >
                Editar
              </button>
            ) : null}
          </article>
        ))}
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
                {form.id ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button type="button" aria-label="Cerrar formulario" className="grid size-10 place-items-center rounded-md text-muted hover:bg-paper" onClick={() => setForm(null)}>
                <X className="size-5" />
              </button>
            </div>
            <label className="text-sm">
              Razón social
              <input
                required
                className="field mt-1"
                value={form.razon}
                onChange={(e) => setForm({ ...form, razon: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Ámbito
              <select
                className="field mt-1"
                value={form.ambito}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ambito: e.target.value as "Publico" | "Privado",
                  })
                }
              >
                <option value="Publico">Público</option>
                <option value="Privado">Privado</option>
              </select>
            </label>
            <label className="text-sm">
              Contacto
              <input
                required
                className="field mt-1"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Correo
              <input
                required
                type="email"
                className="field mt-1"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
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
