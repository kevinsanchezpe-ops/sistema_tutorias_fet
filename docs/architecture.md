# Arquitectura del Sistema GT: Monolito Modular Limpio

## 1. Visión General

El sistema modernizado de Gestión de Tutorías se estructura siguiendo los principios de **Clean Architecture**, **Domain-Driven Design Ligero** y **SOLID**, adoptando una arquitectura de **Monolito Modular** preparado para una futura transición a microservicios sin reescrituras de dominio.

```text
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                    │
│   (Controllers, DTOs, OpenAPI / Swagger, React UI)      │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                    │
│    (Use Cases, Commands, Queries, Application DTOs)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                       │
│    (Entities, Value Objects, Domain Services, Events)   │
└────────────────────────────▲────────────────────────────┘
                             │ Dependency Inversion
┌────────────────────────────┴────────────────────────────┐
│                  INFRASTRUCTURE LAYER                   │
│   (Prisma ORM, PostgreSQL, Repositories, JWT, Logging)  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Organización Modular de las Capas

Cada módulo de negocio (`auth`, `users`, `tutorings`, `schedules`, `subjects`, `notifications`, `ratings`, `analytics`, `admin`) implementa:

1. **`domain/`**:
   - Modelos puros y reglas de negocio sin dependencias externas.
   - Interfaces de Repositorios (`ITutoringRepository`, `IUserRepository`, etc.).
   - Excepciones de Dominio (`DomainException`, `ScheduleConflictException`).

2. **`application/`**:
   - Casos de uso atómicos (`CreateTutoringUseCase`, `ApproveTutoringUseCase`, etc.).
   - Principio: **One Use Case = One Business Action**.
   - DTOs de entrada/salida y servicios orquestadores.

3. **`infrastructure/`**:
   - Implementaciones concretas de los repositorios (`PrismaTutoringRepository`, etc.).
   - Mapeadores de base de datos a entidades de dominio y viceversa.
   - Adaptadores de eventos, correo o WebSockets.

4. **`presentation/`**:
   - Controladores HTTP REST.
   - Guards de autorización RBAC (`RolesGuard`, `JwtAuthGuard`).
   - Presenters de formato uniforme JSON.

---

## 3. Seguridad y Control de Acceso (RBAC)

- Autenticación centralizada basada en tokens JWT con firmas asimétricas o HMAC-SHA256.
- Roles canónicos: `STUDENT`, `TEACHER`, `ADMIN`.
- Decoradores `@Roles(...)` y `@CurrentUser()` para validar permisos en cada endpoint.
- Sanitización estricta de entradas y filtros de excepción globales.
