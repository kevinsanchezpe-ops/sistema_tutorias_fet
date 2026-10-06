# Guía de ejecución local

## Requisitos

- Node.js 18 o superior y npm 9 o superior.
- PostgreSQL 14 o superior instalado y activo en este equipo.

## Preparación

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env`.
3. En `.env`, configura `PGUSER`, `PGPASSWORD`, `PGHOST=localhost`, `PGPORT=5432` y `PGDATABASE=gt_db` según tu instalación local de PostgreSQL.
4. Inicia la aplicación con `npm run dev` y abre `http://localhost:3000`.

Al iniciar, la aplicación crea o actualiza las tablas y carga los datos iniciales cuando la base de datos está vacía. SMTP es opcional durante el desarrollo; sin sus datos, el envío de correos se simula.

El archivo `.env` contiene valores privados y no se debe subir al repositorio.
