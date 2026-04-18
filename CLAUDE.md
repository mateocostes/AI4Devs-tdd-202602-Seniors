# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
npm run dev          # Start dev server (ts-node-dev, port 3010, auto-restart)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled dist/index.js
npm test             # Run Jest tests
npm test -- <file>   # Run a specific test file
npm test -- --testNamePattern="<name>"  # Run a single test by name
npx prisma migrate dev   # Apply database migrations
npx prisma generate      # Regenerate Prisma client after schema changes
```

### Frontend
```bash
cd frontend
npm start    # Dev server on port 3000
npm run build
npm test
```

### Database
```bash
docker-compose up -d    # Start PostgreSQL container (required before running backend)
docker-compose down     # Stop container
```

## Architecture

This is a **Talent Tracking System (LTI)** — a recruiter tool for managing job candidates with their education, work experience, and CV files.

### Backend — Clean Architecture (`backend/src/`)

```
domain/models/       ← Prisma-backed models: Candidate, Education, WorkExperience, Resume
                       Each has save() / findOne() methods that call Prisma directly
application/
  services/          ← candidateService (addCandidate), fileUploadService (multer, PDF/DOCX, 10MB)
  validator.ts       ← All input validation: regex for names/email/phone, date formats, lengths
presentation/
  controllers/       ← candidateController wraps service calls into HTTP responses
routes/              ← Express routes (POST /candidates)
test/
  tests-MC.test.ts   ← Test file (target for TDD work)
```

**Data flow:** `routes → controller → candidateService → domain models (Prisma)`

### Key Domain Rules (enforced in `backend/src/application/validator.ts`)

**Candidate fields:**
| Campo | Tipo | Requerido | Único | Constraint |
|-------|------|-----------|-------|-----------|
| id | Int | auto | — | autoincrement |
| firstName | String | Sí | No | VarChar(100), regex `^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$`, min 2 chars |
| lastName | String | Sí | No | VarChar(100), misma regex |
| email | String | Sí | Sí | VarChar(255), regex estándar email |
| phone | String | No | No | VarChar(15), regex `^(6|7|9)\d{8}$` (teléfono español) |
| address | String | No | No | VarChar(100), max 100 chars |

**Regla especial:** Si el payload contiene `id`, se salta toda la validación (modo edición).

**Errores Prisma manejados:** `P2002` → email duplicado; `P2025` → candidato no encontrado.

**Education:** institution (req, ≤100), title (req, ≤100 — nota: schema dice 250, validator dice 100), startDate (req, YYYY-MM-DD), endDate (opcional, YYYY-MM-DD).

**WorkExperience:** company (req, ≤100), position (req, ≤100), description (opt, ≤200), startDate (req), endDate (opt).

### Database
PostgreSQL via Docker. Prisma schema at `backend/prisma/schema.prisma`. Connection string en `.env` en la raíz del repo.

### Frontend
React 18 + TypeScript, Create React App, Bootstrap 5. Componentes clave: `AddCandidateForm`, `FileUploader`, `RecruiterDashboard`. Conecta con backend en `localhost:3010`.

## Testing

Jest 29.7.0 + ts-jest 29.2.5. **No existe jest.config.js** — antes de ejecutar tests hay que añadir configuración ts-jest en `package.json` o crear `jest.config.js`:

```js
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
};
```

Tests en `backend/src/test/tests-MC.test.ts`. Mockear Prisma con `jest.mock('@prisma/client')`.

The test file `backend/src/test/tests-MC.test.ts` is the intended target for TDD exercises in this repo.
