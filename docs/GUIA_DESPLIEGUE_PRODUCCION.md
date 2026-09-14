# GUÍA DE DESPLIEGUE Y OPERACIÓN EN PRODUCCIÓN (FET)
## Sistema: "Agendamientos Tutorías FET"
### Fundación Escuela Tecnológica de Neiva - FET
**Fecha:** Septiembre 2026 | **Versión:** 1.0 (Producción Certificada)

---

## 1. RESUMEN DE COMPONENTES DE SEGURIDAD IMPLEMENTADOS

| Componente | Mecanismo | Beneficio para la FET |
| :--- | :--- | :--- |
| **Cifrado de Claves** | `bcryptjs` (Cost Factor: 10 rondas de sal) | Las contraseñas de docentes y alumnos nunca se guardan en texto claro. Resistente a filtraciones de base de datos. |
| **Sesiones y Tokens** | `jsonwebtoken` (JWT con firma HS256, expiración de 12 horas) | Los usuarios reciben credenciales criptográficas tras el login; el backend verifica la identidad y previene suplantaciones (IDOR). |
| **Anti Fuerza Bruta** | `express-rate-limit` (50 peticiones / 15 min por IP) | Protege los formularios de login y registro contra ataques automatizados de diccionarios o bots. |
| **Cabeceras HTTP** | `helmet` + `cors` | Mitiga ataques de Clickjacking, Cross-Site Scripting (XSS) y MIME-sniffing. |
| **Emails de Negocio** | Adaptador `EmailService` con plantillas HTML FET | Notificación oportuna a docentes al recibir citas y a alumnos al confirmarse o rechazarse sus tutorías. |

---

## 2. CONFIGURACIÓN DEL SERVIDOR EN PRODUCCIÓN

### 2.1. Variables de Entorno (`.env`)
En el servidor de producción (Linux Ubuntu Server / Debian o Windows Server):

```ini
# Base de Datos PostgreSQL
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://usuario_fet:password_seguro@localhost:5432/gt_db

# Claves Secretas Criptográficas
JWT_SECRET=clave_secreta_institucional_fet_2026_muy_larga_y_segura
JWT_EXPIRATION=12h

# Dominio Institucional
FRONTEND_URL=https://tutorias.fet.edu.co
```

---

## 3. ARTEFACTOS DE DESPLIEGUE (DOCKER / NGINX / PM2)

### 3.1. Opción A: Despliegue con PM2 y Servidor Node.js
```bash
# 1. Instalar PM2 globalmente
npm install -g pm2

# 2. Compilar el proyecto para producción
npm run build

# 3. Iniciar el servicio con reinicio automático
pm2 start dist/server.cjs --name "fet-tutorias"

# 4. Guardar configuración para arranque del sistema
pm2 save
pm2 startup
```

### 3.2. Opción B: Configuración de Nginx como Proxy Inverso con SSL
```nginx
server {
    listen 80;
    server_name tutorias.fet.edu.co;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tutorias.fet.edu.co;

    ssl_certificate /etc/letsencrypt/live/tutorias.fet.edu.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tutorias.fet.edu.co/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 4. RUTINA DE COPIAS DE SEGURIDAD (BACKUPS)

Para programar copias de seguridad automáticas de PostgreSQL en Linux:
```bash
# Crear directorio de copias
mkdir -p /var/backups/fet_db

# Script en crontab para ejecutarse diariamente a las 2:00 AM
0 2 * * * pg_dump -U postgres -d gt_db -F c -b -v -f "/var/backups/fet_db/gt_db_$(date +\%Y\%m\%d).dump"
```
