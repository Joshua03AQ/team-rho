import { mensajeError } from "./lib/errores";
import { X } from "lucide-react";
import { Formulario } from "./Formulario";
import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabase";
import { descargarExcel } from "./excel";

export type Usuario = {
  id: string;
  nombre: string;
  rol: "Gerencia" | "Administracion" | "ConsultaTecnica";
  correo: string | null;
};

const ROL: Record<Usuario["rol"], string> = {
  Gerencia: "Gerencia",
  Administracion: "Administración",
  ConsultaTecnica: "Consulta técnica",
};

export function Usuarios({
  rows,
  yo,
  onNote,
  onSaved,
}: {
  rows: Usuario[];
  yo: string;
  onNote: (texto: string) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Usuario | null>(null);
  const [error, setError] = useState("");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.nombre.trim()) { setError("Escribe el nombre de la persona."); return; }
    setError("");
    const { error: fallo } = await supabase
      .from("perfiles")
      .update({ nombre: form.nombre.trim(), rol: form.rol })
      .eq("id", form.id);
    if (fallo) {
      setError(mensajeError(fallo));
      return;
    }
    await supabase
      .from("auditoria")
      .insert({
        actor_id: yo,
        accion: "Editar usuario",
        recurso: form.nombre.trim(),
      });
    setForm(null);
    onNote("Usuario actualizado.");
    onSaved();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Usuarios</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Consulta los usuarios del sistema y actualiza su nombre y cargo.
          </p>
        </div>
        <button
          onClick={() =>
            descargarExcel(
              "usuarios.xlsx",
              [
                ["Nombre", "Correo", "Cargo"],
                ...rows.map((u) => [u.nombre, u.correo ?? "", ROL[u.rol]]),
              ],
              [0],
            )
          }
          className="min-h-11 rounded-md bg-card px-4 text-sm font-medium ring-1 ring-line"
        >
          Exportar Excel
        </button>
      </header>
      <ul className="overflow-clip divide-y divide-line rounded-xl bg-card ring-1 ring-line">
        {rows.map((u) => (
          <li
            key={u.id}
            className="control-row flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium">{u.nombre}</p>
              <p className="text-sm text-muted">{u.correo}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">{ROL[u.rol]}</span>
              <button
                onClick={() => {
                  setError("");
                  setForm(u);
                }}
                className="min-h-10 text-sm font-medium text-panel"
              >
                Editar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {form ? (
        <Formulario onClose={() => setForm(null)}>
          <form
            className="sheet grid content-start gap-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={guardar}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-formulario" className="font-display text-2xl">Editar usuario</h2>
              <button type="button" aria-label="Cerrar formulario" onClick={() => setForm(null)} className="grid size-11 place-items-center rounded-md hover:bg-paper"><X className="size-5" /></button>
            </div>
            <label className="text-sm">
              Nombre
              <input
                required
                className="field mt-1"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Cargo
              <select
                className="field mt-1"
                value={form.rol}
                onChange={(e) =>
                  setForm({ ...form, rol: e.target.value as Usuario["rol"] })
                }
              >
                <option value="Gerencia">Gerencia</option>
                <option value="Administracion">Administración</option>
                <option value="ConsultaTecnica">Consulta técnica</option>
              </select>
            </label>
            <p className="text-sm text-muted">{form.correo}</p>
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
