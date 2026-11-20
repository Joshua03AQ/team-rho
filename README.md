# Team RHO

Sistema de gestión de ofertas de Constructora Eder Torres. Permite dar seguimiento a licitaciones y propuestas, organizar sus documentos y presupuestos, y consultar resultados según el cargo del usuario.

## Requisitos

- Node.js con npm. Para una instalación nueva, puedes usar Node.js 26.13.1, versión probada con este proyecto.
- Un proyecto de prueba en Supabase con acceso a SQL Editor y Authentication.
- Una conexión a internet para iniciar sesión y consultar los datos.

## 1. Preparar Supabase

Si el proyecto de Supabase ya contiene las tablas, las cuentas y los datos de Team RHO, continúa en el paso 2. Para configurar un proyecto vacío:

1. En **SQL Editor**, ejecuta el contenido de [schema.sql](supabase/schema.sql) para crear las tablas y los permisos.
2. En **Authentication → Users**, crea las tres cuentas de la tabla con la contraseña de demostración indicada. Marca **Auto Confirm User** al crear cada una.
3. Ejecuta [seed.sql](supabase/seed.sql) una sola vez. Este archivo vincula las cuentas con sus cargos y carga los datos de ejemplo.
4. Para recibir avisos en tiempo real, abre **Database → Publications → supabase_realtime** y activa la tabla **public.avisos**.

| Correo | Contraseña de prueba | Cargo |
| --- | --- | --- |
| maria.torres@edertorres.com | Demo123! | Gerencia |
| luis.navarro@edertorres.com | Demo123! | Administración |
| ana.campos@edertorres.com | Demo123! | Consulta técnica |

## 2. Conectar la aplicación

En el Explorador de Windows, abre la carpeta que contiene `package.json`, escribe `powershell` en la barra de dirección y pulsa **Enter**. Si es la primera instalación, crea el archivo de configuración:

```powershell
Copy-Item .env.example .env
notepad .env
```

Copia la URL desde la página principal de tu proyecto de Supabase y la clave pública **anon** desde **Project Settings → API Keys → View legacy API keys**. Sustituye los valores de ejemplo en `.env` y guarda el archivo con **Ctrl + S**.

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

## 3. Abrir el sistema en tu PC

En la misma carpeta, ejecuta estas órdenes una por una. La primera instala las dependencias y la segunda inicia el servidor local.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre en el navegador la dirección que aparece junto a **Local** (normalmente `http://localhost:5173/`) e inicia sesión con una de las cuentas de prueba. Mantén la terminal abierta mientras uses el sistema.

**Para volver a abrirlo otro día**, ejecuta solo `npm.cmd run dev` desde la carpeta del proyecto. Para detenerlo, pulsa **Ctrl + C**. Si cambias los valores de `.env`, guarda el archivo y reinicia el servidor.

## Comprobar la instalación

Al entrar con María Torres, el encabezado debe mostrar **Gerencia** y el menú debe incluir **Usuarios** y **Continuidad**. Si el sistema rechaza una cuenta confirmada, ejecuta esta consulta en el SQL Editor del mismo proyecto y comprueba que aparezcan los tres correos con sus cargos:

```sql
SELECT correo, rol FROM public.perfiles ORDER BY correo;
```

Si la página queda en blanco, comprueba que el archivo se llama exactamente `.env`, que ambas variables tienen valor y que guardaste los cambios. Reinicia el servidor y recarga la dirección **Local**.

Para comprobar la compilación, ejecuta `npm.cmd run build` en la carpeta del proyecto. Si termina correctamente, encontrarás `dist/index.html`. Puedes abrir la versión compilada con `npm.cmd run preview` y la dirección que indique la terminal.

## Documentación

- [Manual técnico](docs/Manual%20t%C3%A9cnico.pdf)
- [Manual de usuario](docs/Manual%20de%20usuario.pdf)
- [Matriz de pruebas](docs/Matriz-de-pruebas-Team-RHO.xlsx)
