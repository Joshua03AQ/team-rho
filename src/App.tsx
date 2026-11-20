import { mensajeError } from "./lib/errores";
import { Formulario } from "./Formulario";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  CircleAlert,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { Clientes, type Cliente } from "./Clientes";
import { Legales, type Legal } from "./Legales";
import { Reportes } from "./Reportes";
import { Avisos, type Aviso, type Persona } from "./Avisos";
import { Usuarios, type Usuario } from "./Usuarios";
import { Continuidad } from "./Continuidad";
import { Mesa } from "./Mesa";
import { Detalle } from "./Detalle";
import { descargarExcel } from "./excel";

type Rol = "Gerencia" | "Administracion" | "ConsultaTecnica";
type Page =
  | "resumen"
  | "expedientes"
  | "clientes"
  | "legales"
  | "reportes"
  | "avisos"
  | "usuarios"
  | "continuidad";
type Perfil = { id: string; nombre: string; rol: Rol; email: string };
type Expediente = {
  id: string;
  codigo: string;
  nombre: string;
  estado: string;
  cliente_id: string;
  ubicacion: string;
};

const ROL: Record<Rol, string> = {
  Gerencia: "Gerencia",
  Administracion: "Administración",
  ConsultaTecnica: "Consulta técnica",
};
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
const RAIL = ["Identificada", "EnEvaluacion", "EnPreparacion", "Presentada"];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export default function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setListo(true);
        return;
      }
      const { data: fila } = await supabase.from("perfiles").select("id, nombre, rol").eq("id", user.id).single();
      if (fila) setPerfil({ ...fila, rol: fila.rol as Rol, email: user.email ?? "" });
      setListo(true);
    });
  }, []);

  if (!listo) return <p className="grid min-h-dvh place-items-center p-8 text-sm text-muted">Abriendo sesión…</p>;
  if (!perfil) return <Login onEnter={setPerfil} />;
  return <Panel perfil={perfil} onExit={() => setPerfil(null)} />;
}

function Login({ onEnter }: { onEnter: (p: Perfil) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [missing, setMissing] = useState({ email: "", password: "" });
  const [alert, setAlert] = useState<"vacio" | "clave" | "conexion" | null>(null);
  const correoMal =
    email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const emailBad = Boolean(missing.email) || alert === "clave";
  const claveBad = Boolean(missing.password) || alert === "clave";

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const correo = email.trim();
    const faltaCorreo = !correo
      ? "Escribe el correo."
      : correoMal
        ? "Ese correo no parece válido."
        : "";
    const faltaClave = password ? "" : "Escribe la contraseña.";
    setMissing({ email: faltaCorreo, password: faltaClave });
    if (faltaCorreo || faltaClave) {
      setAlert("vacio");
      return;
    }
    setEnviando(true);
    try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo.toLowerCase(),
      password,
    });
    if (error || !data.user) {
      setAlert("clave");
      return;
    }
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id, nombre, rol")
      .eq("id", data.user.id)
      .single();
    if (!perfil) {
      setAlert("clave");
      return;
    }
    onEnter({
      ...perfil,
      rol: perfil.rol as Rol,
      email: data.user.email ?? correo,
    });
    } catch {
      setAlert("conexion");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="desk">
      <form className="caratula" noValidate onSubmit={entrar}>
        <div className="caratula-spine">
          <img
            src="/logo.png"
            alt=""
            className="size-11 rounded-md bg-card object-contain p-1"
          />
          <span className="spine-word">Team RHO</span>
          <span className="text-[10px] tracking-[0.16em] text-card/70 uppercase">
            2026
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-6">
          <div className="flex flex-1 flex-col rounded-xl border border-line bg-card p-4 sm:p-7">
            <p className="text-xs font-semibold tracking-[0.16em] text-panel uppercase">
              Carátula de acceso
            </p>
            <h1 className="login-title mt-2 text-ink">Abre el expediente.</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Ingresa con el correo y la contraseña de tu cuenta.
            </p>
            <label className="mt-6 block text-sm font-medium" htmlFor="correo">
              <span className="flex items-center justify-between gap-2">
                Correo
                {emailBad ? <span className="field-flag">Revisa</span> : null}
              </span>
              <input
                id="correo" type="email" inputMode="email" aria-invalid={emailBad}
                className={`field mt-1.5 ${emailBad ? "is-bad" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMissing((m) => ({ ...m, email: "" }));
                  setAlert(null);
                }}
                autoComplete="username"
              />
            </label>
            {missing.email ? (
              <p className="field-note">{missing.email}</p>
            ) : null}
            <div className="mt-3">
              <label htmlFor="clave" className="block text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Contraseña
                  {claveBad ? <span className="field-flag">Revisa</span> : null}
                </span>
              </label>
              <span className="secret mt-1.5">
                <input
                  id="clave"
                  type={show ? "text" : "password"} aria-invalid={claveBad}
                  className={`${show ? "field" : "field is-secret"} ${claveBad ? "is-bad" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setMissing((m) => ({ ...m, password: "" }));
                    setAlert(null);
                  }}
                  autoComplete="current-password"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={
                    show ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {show ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </span>
              {missing.password ? (
                <p className="field-note">{missing.password}</p>
              ) : null}
            </div>
            {alert ? (
              <div className="login-alert" role="alert">
                <span className="login-seal" aria-hidden>
                  <CircleAlert className="size-4" />
                </span>
                <span>
                  <strong>
                    {alert === "conexion" ? "No se pudo conectar" : alert === "clave" ? "Revisa tus datos" : "Revisa los campos"}
                  </strong>
                  <span>
                    {alert === "conexion" ? "Revisa tu conexión e inténtalo de nuevo." : alert === "clave"
                      ? "El correo o la contraseña son incorrectos."
                      : "Completa lo marcado para poder entrar."}
                  </span>
                </span>
              </div>
            ) : null}
            <button disabled={enviando} aria-busy={enviando} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-md bg-panel font-semibold text-card">
              {enviando ? "Entrando…" : "Entrar"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Panel({ perfil, onExit }: { perfil: Perfil; onExit: () => void }) {
  const [page, setPage] = useState<Page>("resumen");
  const [rail, setRail] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busca, setBusca] = useState("");
  const [corte, setCorte] = useState("todos");
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [legales, setLegales] = useState<Legal[]>([]);
  const [elegido, setElegido] = useState<Expediente | null>(null);
  const [fallo, setFallo] = useState("");
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({
    codigo: "",
    nombre: "",
    cliente_id: "",
    anio: "2026",
    tipo: "Licitacion",
    ambito: "Privado",
    ubicacion: "",
  });
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [respaldos, setRespaldos] = useState<
    { id: string; fecha: string; nota: string }[]
  >([]);
  const [envios, setEnvios] = useState<
    { id: string; expediente_id: string; fecha: string; estado: string }[]
  >([]);
  const [nota, setNota] = useState("");
  const gerencia = perfil.rol === "Gerencia";
  const puede = perfil.rol !== "ConsultaTecnica";

  function cargarLegales() {
    supabase
      .from("legales")
      .select("id, tipo, numero, emision, hasta")
      .order("hasta")
      .then(({ data }) => setLegales((data ?? []) as Legal[]));
  }
  function cargarUsuarios() {
    supabase
      .from("perfiles")
      .select("id, nombre, rol, correo")
      .order("nombre")
      .then(({ data }) => setUsuarios((data ?? []) as Usuario[]));
  }
  function cargarExpedientes() {
    supabase
      .from("expedientes")
      .select("id, codigo, nombre, estado, cliente_id, ubicacion")
      .order("codigo", { ascending: false })
      .then(({ data }) => setExpedientes(data ?? []));
  }

  useEffect(() => {
    cargarExpedientes();
    supabase
      .from("clientes")
      .select("id, razon, ambito, contacto, correo")
      .order("razon")
      .then(({ data }) => setClientes((data ?? []) as Cliente[]));
    cargarLegales();
    cargarUsuarios();
    supabase
      .from("avisos")
      .select("*")
      .order("fecha", { ascending: false })
      .then(({ data }) => setAvisos((data ?? []) as Aviso[]));
    supabase
      .from("perfiles")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => setPersonas((data ?? []) as Persona[]));
    supabase
      .from("respaldos")
      .select("id, fecha, nota")
      .order("fecha", { ascending: false })
      .then(({ data }) => setRespaldos(data ?? []));
    supabase
      .from("transferencias")
      .select("id, expediente_id, fecha, estado")
      .order("fecha", { ascending: false })
      .then(({ data }) => setEnvios(data ?? []));
  }, []);

  useEffect(() => {
    const canal = supabase
      .channel("avisos-vivo")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "avisos" },
        (payload) => {
          const fila = payload.new as Aviso;
          if (fila.user_id !== perfil.id && fila.autor_id !== perfil.id && perfil.rol !== "Gerencia") return;
          setAvisos((prev) => [fila, ...prev.filter((a) => a.id !== fila.id)]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "avisos" },
        (payload) => {
          const fila = payload.new as Aviso;
          setAvisos((prev) => prev.map((a) => (a.id === fila.id ? fila : a)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "avisos" },
        ({ old }) => setAvisos((prev) => prev.filter((a) => a.id !== old.id)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [perfil.id, perfil.rol]);

  async function salir() {
    await supabase.auth.signOut();
    onExit();
  }

  useEffect(() => {
    if (!nota) return;
    const t = setTimeout(() => setNota(""), 3200);
    return () => clearTimeout(t);
  }, [nota]);

  const cliente = (id: string) =>
    clientes.find((c) => c.id === id)?.razon ?? "";
  const sinLeer = avisos.filter(
    (a) => a.user_id === perfil.id && !a.leida,
  ).length;
  const visibles = expedientes.filter((e) => {
    const texto = (e.codigo + e.nombre + cliente(e.cliente_id)).toLowerCase();
    const hit = texto.includes(busca.toLowerCase());
    const vivo = !["Ganada", "Perdida", "Descartada"].includes(e.estado);
    const st =
      corte === "todos" || (corte === "vivo" ? vivo : e.estado === corte);
    return hit && (page === "resumen" || st);
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside id="menu-principal"
        className={`binder md:visible ${menu ? "visible" : "invisible"} fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-[width,transform] duration-200 ${rail ? "is-rail md:w-[4.75rem]" : ""} ${menu ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="brand">
          <img src="/logo.png" alt="" />
          <div className="brand-copy">
            <p className="brand-kicker">Team</p>
            <p className="brand-name">RHO</p>
          </div>
          <button
            type="button"
            className="rail-toggle"
            onClick={() => setRail((v) => !v)}
            aria-label={rail ? "Abrir el panel" : "Recoger el panel"}
          >
            <ChevronLeft className="rail-chevron size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-auto px-3 pb-4">
          <Grupo titulo="Operación">
            <Item
              activo={page === "resumen"}
              icon={<LayoutDashboard className="size-4" />}
              onClick={() => {
                setElegido(null);
                setPage("resumen");
                setMenu(false);
              }}
            >
              Resumen
            </Item>
            <Item
              activo={page === "expedientes"}
              icon={<FolderKanban className="size-4" />}
              onClick={() => {
                setElegido(null);
                setPage("expedientes");
                setMenu(false);
              }}
            >
              Expedientes
            </Item>
            <Item
              activo={page === "clientes"}
              icon={<Building2 className="size-4" />}
              onClick={() => {
                setElegido(null);
                setPage("clientes");
                setMenu(false);
              }}
            >
              Clientes
            </Item>
            <Item
              activo={page === "legales"}
              icon={<FileText className="size-4" />}
              onClick={() => {
                setElegido(null);
                setPage("legales");
                setMenu(false);
              }}
            >
              Documentos legales
            </Item>
          </Grupo>
          <Grupo titulo="Control">
            <Item
              activo={page === "reportes"}
              icon={<BarChart3 className="size-4" />}
              onClick={() => {
                setElegido(null);
                setPage("reportes");
                setMenu(false);
              }}
            >
              Reportes
            </Item>
            <Item
              activo={page === "avisos"}
              icon={<Bell className="size-4" />}
              cuenta={sinLeer}
              onClick={() => {
                setElegido(null);
                setPage("avisos");
                setMenu(false);
              }}
            >
              Avisos
            </Item>
            {gerencia && (
              <Item
                activo={page === "usuarios"}
                icon={<Users className="size-4" />}
                onClick={() => {
                  setElegido(null);
                  setPage("usuarios");
                  setMenu(false);
                }}
              >
                Usuarios
              </Item>
            )}
            {gerencia && (
              <Item
                activo={page === "continuidad"}
                icon={<ShieldCheck className="size-4" />}
                onClick={() => {
                  setElegido(null);
                  setPage("continuidad");
                  setMenu(false);
                }}
              >
                Continuidad
              </Item>
            )}
          </Grupo>
        </nav>
        <button aria-label="Cerrar sesión" onClick={salir} className="nav-item mx-3 mb-3 w-auto">
          <LogOut className="size-4" />{" "}
          <span className="nav-label">Cerrar sesión</span>
        </button>
      </aside>
      {menu && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <div
        className={`transition-[padding] duration-200 ${rail ? "md:pl-[4.75rem]" : "md:pl-64"}`}
      >
        <header className="sticky top-0 z-20 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="grid size-11 shrink-0 place-items-center rounded-md text-panel md:hidden"
              onClick={() => setMenu(true)}
              aria-label="Abrir menú" aria-controls="menu-principal" aria-expanded={menu}
            >
              <Menu className="size-5" />
            </button>
            <p className="company-name min-w-0 flex-1 text-sm font-semibold tracking-[0.14em] text-panel uppercase">
              Constructora Eder Torres
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="account-name text-right">
                <span className="block text-sm font-medium leading-tight">
                  {perfil.nombre}
                </span>
                <span className="block text-xs text-muted">
                  {ROL[perfil.rol]}
                </span>
              </span>
              <span className="grid size-10 place-items-center rounded-full bg-panel text-xs font-semibold text-card">
                {iniciales(perfil.nombre)}
              </span>
            </div>
          </div>
          {(page === "resumen" || page === "expedientes") &&
          !elegido &&
          !creando ? (
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setElegido(null);
                  if (e.target.value && page === "resumen")
                    setPage("expedientes");
                }}
                placeholder="Buscar código, obra o cliente"
                className="field pl-9"
                aria-label="Buscar expedientes"
              />
            </label>
          ) : null}
        </header>
        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-7 md:py-8">
          <div
            key={elegido ? elegido.id : page}
            className="stage flex flex-col gap-6"
          >
            {elegido ? (
              <Detalle
                id={elegido.id}
                clientes={clientes}
                yo={perfil.id}
                canWrite={puede}
                gerencia={gerencia}
                onClose={() => setElegido(null)}
                onChanged={cargarExpedientes}
                onNote={setNota}
              />
            ) : page === "resumen" ? (
              <Mesa
                nombre={perfil.nombre}
                expedientes={expedientes}
                clientes={clientes}
                legales={legales}
                sinLeer={sinLeer}
                canWrite={puede}
                onOpen={(e) => {
                  setElegido(e);
                  setFallo("");
                }}
                onGo={(p, estado) => {
                  setElegido(null);
                  setPage(p);
                  if (estado) setCorte(estado);
                }}
                onNew={() => {
                  if (!puede) return;
                  setFallo("");
                  setNuevo({
                    codigo: "",
                    nombre: "",
                    cliente_id: clientes[0]?.id ?? "",
                    anio: "2026",
                    tipo: "Licitacion",
                    ambito: "Privado",
                    ubicacion: "",
                  });
                  setCreando(true);
                }}
              />
            ) : page === "expedientes" ? (
              <>
                <header className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h1 className="font-display text-4xl">Expedientes</h1>
                    <p className="mt-1 text-sm text-muted">
                      {visibles.length} en este corte.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {puede ? (
                      <button
                        onClick={() => {
                          setFallo("");
                          setNuevo({
                            codigo: "",
                            nombre: "",
                            cliente_id: clientes[0]?.id ?? "",
                            anio: "2026",
                            tipo: "Licitacion",
                            ambito: "Privado",
                            ubicacion: "",
                          });
                          setCreando(true);
                        }}
                        className="flex min-h-11 items-center gap-2 rounded-md bg-panel px-4 text-sm font-semibold text-card"
                      >
                        <Plus className="size-4" /> Nuevo
                      </button>
                    ) : null}
                    <button
                      onClick={() =>
                        descargarExcel(
                          "expedientes.xlsx",
                          [
                            [
                              "Código",
                              "Obra",
                              "Cliente",
                              "Estado",
                              "Ubicación",
                            ],
                            ...visibles.map((e) => [
                              e.codigo,
                              e.nombre,
                              cliente(e.cliente_id),
                              LABEL[e.estado] ?? e.estado,
                              e.ubicacion,
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
                <div className="filter-options flex gap-2 overflow-x-auto pb-3">
                  {["todos", "vivo", ...Object.keys(LABEL)].map((k) => (
                    <button
                      key={k}
                      className={`chip ${corte === k ? "is-on" : ""}`}
                      onClick={() => setCorte(k)}
                    >
                      {k === "todos"
                        ? "Todos"
                        : k === "vivo"
                          ? "En proceso"
                          : LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="expediente-list overflow-hidden rounded-xl bg-card ring-1 ring-line">
                  {visibles.length === 0 && <p className="px-4 py-6 text-sm text-muted">No hay expedientes que coincidan con esta vista.</p>}
                  {visibles.map((e) => {
                    const idx = RAIL.indexOf(e.estado);
                    return (
                      <button
                        key={e.id}
                        className="dossier border-t border-line first:border-t-0"
                        onClick={() => {
                          setElegido(e);
                          setFallo("");
                        }}
                      >
                        <span className="hidden w-32 font-medium md:block">
                          {e.codigo}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {e.nombre}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {e.codigo} · {cliente(e.cliente_id)}
                          </span>
                          <span className="mini-rail" aria-hidden>
                            {RAIL.map((step, i) => (
                              <i
                                key={step}
                                className={
                                  e.estado === "Ganada" ||
                                  (idx >= 0 && i <= idx)
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
                          {LABEL[e.estado]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : page === "clientes" ? (
              <Clientes
                rows={clientes}
                canWrite={puede}
                yo={perfil.id}
                onNote={setNota}
                onSaved={() => {
                  supabase
                    .from("clientes")
                    .select("id, razon, ambito, contacto, correo")
                    .order("razon")
                    .then(({ data }) => setClientes((data ?? []) as Cliente[]));
                }}
              />
            ) : page === "legales" ? (
              <Legales
                rows={legales}
                canWrite={puede}
                yo={perfil.id}
                onNote={setNota}
                onSaved={cargarLegales}
              />
            ) : page === "reportes" ? (
              <Reportes filas={expedientes} />
            ) : page === "avisos" ? (
              <Avisos
                rows={avisos}
                personas={personas}
                yo={perfil.id}
                canWrite={puede}
                onNote={setNota}
                onSaved={() => {
                  supabase
                    .from("avisos")
                    .select("*")
                    .order("fecha", { ascending: false })
                    .then(({ data }) => setAvisos((data ?? []) as Aviso[]));
                }}
              />
            ) : page === "usuarios" && gerencia ? (
              <Usuarios
                rows={usuarios}
                yo={perfil.id}
                onNote={setNota}
                onSaved={cargarUsuarios}
              />
            ) : page === "continuidad" && gerencia ? (
              <Continuidad
                respaldos={respaldos}
                envios={envios}
                expedientes={expedientes}
                yo={perfil.id}
                onNote={setNota}
                onSaved={() => {
                  supabase
                    .from("respaldos")
                    .select("id, fecha, nota")
                    .order("fecha", { ascending: false })
                    .then(({ data }) => setRespaldos(data ?? []));
                  supabase
                    .from("transferencias")
                    .select("id, expediente_id, fecha, estado")
                    .order("fecha", { ascending: false })
                    .then(({ data }) => setEnvios(data ?? []));
                }}
              />
            ) : null}
          </div>
          {creando ? (
            <Formulario onClose={() => setCreando(false)}>
              <form
                className="sheet grid content-start gap-3"
                onClick={(ev) => ev.stopPropagation()}
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  if (!nuevo.codigo.trim() || !nuevo.nombre.trim() || !nuevo.ubicacion.trim()) {
                    setFallo("Completa el código, el nombre y la ubicación del expediente.");
                    return;
                  }
                  const { error } = await supabase
                    .from("expedientes")
                    .insert({
                      codigo: nuevo.codigo.trim(),
                      nombre: nuevo.nombre.trim(),
                      cliente_id: nuevo.cliente_id,
                      anio: Number(nuevo.anio),
                      tipo: nuevo.tipo,
                      ambito: nuevo.ambito,
                      ubicacion: nuevo.ubicacion.trim(),
                      estado: "Identificada",
                      responsable_id: perfil.id,
                    });
                  if (error) {
                    setFallo(mensajeError(error));
                    return;
                  }
                  setCreando(false);
                  await supabase
                    .from("auditoria")
                    .insert({
                      actor_id: perfil.id,
                      accion: "Crear expediente",
                      recurso: nuevo.codigo.trim(),
                    });
                  setNota("Expediente creado.");
                  cargarExpedientes();
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id="titulo-formulario" className="font-display text-2xl">Nuevo expediente</h2>
                  <button
                    type="button"
                    aria-label="Cerrar formulario"
                    className="grid size-10 place-items-center rounded-md text-muted hover:bg-paper"
                    onClick={() => setCreando(false)}
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <label className="text-sm">
                  Código
                  <input
                    required
                    className="field mt-1"
                    value={nuevo.codigo}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, codigo: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm">
                  Obra
                  <input
                    required
                    className="field mt-1"
                    value={nuevo.nombre}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, nombre: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm">
                  Cliente
                  <select
                    className="field mt-1"
                    value={nuevo.cliente_id}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, cliente_id: e.target.value })
                    }
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razon}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Año
                  <input
                    required
                    type="number"
                    className="field mt-1"
                    value={nuevo.anio}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, anio: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm">
                  Tipo
                  <select
                    className="field mt-1"
                    value={nuevo.tipo}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, tipo: e.target.value })
                    }
                  >
                    <option value="Licitacion">Licitación</option>
                    <option value="Propuesta">Propuesta</option>
                  </select>
                </label>
                <label className="text-sm">
                  Ámbito
                  <select
                    className="field mt-1"
                    value={nuevo.ambito}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, ambito: e.target.value })
                    }
                  >
                    <option value="Publico">Público</option>
                    <option value="Privado">Privado</option>
                  </select>
                </label>
                <label className="text-sm">
                  Ubicación
                  <input
                    className="field mt-1"
                    value={nuevo.ubicacion}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, ubicacion: e.target.value })
                    }
                  />
                </label>
                {fallo ? <p className="text-sm text-bad">{fallo}</p> : null}
                <button className="min-h-11 rounded-md bg-panel font-semibold text-card">
                  Crear
                </button>
              </form>
            </Formulario>
          ) : null}
          {nota ? <div className="toast" role="status">{nota}</div> : null}
        </main>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="nav-group">
      <p className="nav-group-label px-3 pb-2 text-[11px] font-semibold tracking-[0.16em] text-card/80 uppercase">
        {titulo}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  activo,
  icon,
  onClick,
  cuenta,
  children,
}: {
  activo: boolean;
  icon: ReactNode;
  onClick: () => void;
  cuenta?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      aria-label={typeof children === "string" ? children : undefined}
      className={`nav-item ${activo ? "is-on" : ""}`}
    >
      {icon} <span className="nav-label">{children}</span>
      {cuenta ? <span className="nav-count">{cuenta}</span> : null}
    </button>
  );
}
