# Prompts de sesión — Mateo Costes

## Sesión 1 — Inicialización del repositorio

### Prompt 1 — Crear CLAUDE.md inicial

**Comando:** `/init`

**Acción:** Análisis del codebase y creación de `CLAUDE.md` con comandos de desarrollo,
arquitectura del proyecto (LTI Talent Tracking System), y estructura de capas del backend.

---

## Sesión 2 — Agente TDD especializado

### Prompt 2 — Crear agente TDD + análisis del stack

**Comando:**

> Analiza el proyecto actual y crea un agente TDD especializado siguiendo estas instrucciones:
>
> FASE 1 — Análisis del stack (hazlo primero, sin escribir nada)
> Examina el proyecto leyendo en este orden:
> 1. package.json → dependencias, scripts de test, versiones
> 2. prisma/schema.prisma → modelos de datos, campos, tipos, constraints
> 3. src/ o app/ → estructura de carpetas, capas (routes, controllers, services)
> 4. Cualquier archivo de configuración de Jest (jest.config.js, babel.config.js)
> 5. Un archivo de test existente si lo hay → convenciones actuales del proyecto
>
> Con eso, extrae: framework y versión exacta, ORM y modelos relevantes (especialmente Candidate),
> estructura de capas, runner de tests y configuración, convenciones de nombres.
>
> FASE 2 — Crea o modifica los siguientes archivos:
> - CLAUDE.md (raíz): stack real, reglas de negocio del modelo Candidate, convenciones de testing
> - .claude/agents/tdd-specialist.md: flujo RED→GREEN→REFACTOR obligatorio, reglas Jest+Prisma mock,
>   casos límite del schema real, naming should_[resultado]_when_[condición], patrón AAA con ejemplo
>   concreto, test.each para validaciones, beforeEach con clearAllMocks
> - .claude/commands/tdd-candidate.md: activa el agente, lista casos antes de escribir código,
>   espera aprobación antes de pasar de RED a GREEN, agrupa en happy path / validaciones /
>   lógica de negocio / edge cases
>
> FASE 3 — Resumen final en tabla: stack encontrado, campos Candidate requeridos/opcionales/únicos,
> casos de test propuestos por grupo.
>
> No escribas ningún test ni código de producción todavía.
> Los prompts de la sesión en prompts/prompts-MC.md
> Los tests generados por el agente en backend/src/test/tests-MC.test.ts

**Archivos generados:**
- `CLAUDE.md` — actualizado con tabla de campos Candidate, reglas de validación y config Jest
- `.claude/agents/tdd-specialist.md` — agente TDD con ciclo RED→GREEN→REFACTOR, mock Prisma, 22 casos
- `.claude/commands/tdd-candidate.md` — comando `/tdd-candidate` con flujo de aprobación por fase
- `prompts/prompts-MC.md` — este archivo

**Output de tests:** `backend/src/test/tests-MC.test.ts`

---

## Sesión 3 — Ciclo TDD con /tdd-candidate

### Prompt 3 — Diagnóstico y setup del entorno

**Problema reportado:** El usuario no podía ejecutar el comando `/tdd-candidate`.

**Causa raíz:** Faltaba `backend/jest.config.js` y las dependencias de node_modules no estaban instaladas.

**Acciones realizadas:**
- Creado `backend/jest.config.js` con preset `ts-jest`, `testEnvironment: node`, `testMatch: **/test/**/*.test.ts`
- Ejecutado `npm install` en `backend/` para instalar dependencias
- Verificado que `npm test` corre correctamente (error esperado: "must contain at least one test")

---

## Sesión 4 — Tests de recepción de formulario y guardado en BD

### Prompt 4 — Ejecutar /tdd-candidate con foco en dos familias de tests

**Comando:** `/tdd-candidate`

**Argumento:**
> Necesito utilizar las dos principales familias de test: recepción de los datos del formulario, y guardado en la base de datos. Quiero tests que cubran ambos procesos.

**Familias requeridas:**
1. **Recepción del formulario** — validaciones de campos (firstName, lastName, email, phone, address)
2. **Guardado en BD** — interacción con Prisma (creación, educations, workExperiences, duplicado de email)

---

**Resultado:** 63 tests — 63 pasando, 0 fallando

**Casos ampliados respecto a la lista inicial:**
- firstName: +símbolos, +ñ/acentos, +email con subdomain y alias (+)
- lastName: +símbolos
- email: +espacios, +doble arroba, +subdominio, +alias con plus
- phone: +dígitos inválidos 2 y 8, +10 dígitos, los tres prefijos válidos (6/7/9)
- educations: +institution > 100 chars, +endDate formato inválido (regex permisivo), +sin endDate
- workExperiences: +startDate formato inválido
- cv: +fileType missing, +cv válido
- DB: +múltiples educations, +múltiples workExperiences, +campos correctos en prisma.create

**Comando para ejecutar todos los tests:**
```bash
npm test                # desde raíz del repo (requiere cd backend internamente)
cd backend && npm test  # directamente en backend
```

---

### Prompt 5 — Refactor (A) + Nuevas familias (B)

**Acciones:**

**REFACTOR:**
- Corregido test mal nombrado (`should_throw_error_when_education_endDate_has_invalid_format` que tenía `.not.toThrow()`)
- Renombrado: `should_accept_education_endDate_with_correct_format_but_invalid_calendar_values`
- Añadido: `should_throw_invalid_end_date_when_education_endDate_uses_wrong_separator` → cubre `validator.ts L50`
- Añadido: `should_throw_invalid_end_date_when_workExperience_endDate_uses_wrong_separator` → cubre `validator.ts L70`
- Añadido: `should_propagate_non_P2002_error_from_candidate_create` → cubre `candidateService.ts L52`

**Familia 3 — Actualización de candidato:** 5 tests (update path de Candidate.save)
**Familia 4 — Búsqueda de candidato:** 3 tests (Candidate.findOne)
**Familia 5 — Manejo de errores:** 4 tests (P2025, error propagation)
**Familia 6 — Tests de modelos directos:** 6 tests (Education/WorkExperience/Resume update paths)

**Resultado final:** 85 tests — 85 pasando, 0 fallando

**Cobertura final:**
| Archivo | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| validator.ts | 100% | 100% | 100% | 100% |
| candidateService.ts | 97.5% | 100% | 100% | 97% |
| Education.ts | 100% | 100% | 100% | 100% |
| WorkExperience.ts | 100% | 100% | 100% | 100% |
| Resume.ts | 100% | 78.9% | 100% | 100% |
| Candidate.ts | 85.7% | 79.2% | 57.1% | 82.6% |

**Líneas no cubiertas en Candidate.ts:** L43-44, L55-56, L68-69 (nested creates en Candidate.save vía arrays propios), L87/L105 (instanceof PrismaClientInitializationError — requiere clase real de Prisma, no mockeable con instanceof en ts-jest)

---
