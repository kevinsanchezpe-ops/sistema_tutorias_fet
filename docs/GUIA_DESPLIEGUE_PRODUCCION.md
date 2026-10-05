# Despliegue y operación del sistema FET

## Arquitectura actual

- Cliente: React 19, TypeScript, Vite y Tailwind CSS.
- Servidor: Express 4 con endpoints REST bajo `/api`.
- Persistencia: PostgreSQL, acceso mediante `pg` y consultas parametrizadas.
- Sesión: JWT de 2 horas en cookie `HttpOnly`; el servidor vuelve a validar cuenta, estado, versión de sesión y rol contra PostgreSQL en cada petición autenticada.
- Contraseñas: bcrypt con 12 rondas. Las cuentas creadas por administración deben cambiar la contraseña temporal al entrar.
- Adjuntos de tutorías: guardados en volumen `uploads` y descargados solo tras comprobar la identidad y participación.

## Configurar localmente

1. Copia `.env.example` como `.env` y cambia las credenciales de PostgreSQL y `JWT_SECRET`.
2. Para dominios institucionales adicionales, configura `INSTITUTIONAL_EMAIL_DOMAINS` como lista separada por comas. El valor inicial es `fet.edu.co` y debe confirmarse con la institución.
3. SMTP puede omitirse en desarrollo. Sin SMTP los mensajes se simulan y no llegan al correo.
4. Inicia PostgreSQL y ejecuta `npm run dev`.

El archivo `.env` contiene secretos y no se sube al repositorio. `.env.example` no contiene credenciales reales.

## Producción con Docker Compose

Configura secretos aleatorios en el entorno del servidor o en un `.env` privado: `POSTGRES_USER`, `POSTGRES_PASSWORD` (solo hexadecimal para interpolación segura en URL), `JWT_SECRET` (mínimo 32 caracteres aleatorios), `FRONTEND_URL` con HTTPS, `INSTITUTIONAL_EMAIL_DOMAINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y opcionalmente `SMTP_FROM`.

Luego ejecuta:

```sh
docker compose up --build -d
```

El servicio PostgreSQL no publica su puerto al host. El servidor web publica el puerto 3000; se recomienda ponerlo detrás de un proxy inverso con TLS y permitir tráfico externo solo por HTTPS. La base y los archivos cargados usan volúmenes persistentes.

La base Docker interna usa una red privada del Compose y no TLS entre contenedores. Para una base de datos gestionada/remota, usa `DATABASE_URL` con `sslmode=verify-full` y certificado CA confiable. No uses `sslmode=disable` para un servidor remoto.

## Backups y recuperación

Respaldar PostgreSQL y el volumen de adjuntos de manera coordinada; conservar copias cifradas fuera del servidor y ensayar restauraciones periódicas. La pérdida del volumen `uploads` deja enlaces de adjuntos sin archivo aunque PostgreSQL conserve sus registros.

Ejemplo de backup de base en instalación local:

```sh
pg_dump "$DATABASE_URL" --format=custom --file="gt_db.dump"
```

## Antes de abrir el acceso público

- Reemplaza todos los secretos del entorno y verifica la URL HTTPS.
- Confirma el dominio de correo institucional permitido.
- Confirma el SMTP saliente y la entrega de recuperación de contraseñas.
- Conserva la base y los uploads en volúmenes persistentes con backups probados.
- Mantén actualizadas las dependencias y ejecuta `npm audit` durante el ciclo de publicación.
- No uses cuentas ni datos de muestra para usuarios reales.
