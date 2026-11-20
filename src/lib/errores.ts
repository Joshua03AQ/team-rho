export function mensajeError(error: { code?: string } | null | undefined): string {
  if (error?.code === "23505") return "Ya existe un registro con esos datos. Revisa el código o número.";
  if (error?.code === "23503") return "El registro relacionado ya no está disponible. Actualiza la página.";
  if (error?.code === "42501") return "Tu cuenta no tiene permiso para realizar esta acción.";
  return "No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.";
}
