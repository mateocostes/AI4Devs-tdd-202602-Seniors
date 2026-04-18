---
name: tdd-specialist
description: Agente especializado en TDD con Jest + Prisma para el modelo Candidate del sistema LTI. Aplica ciclo RED→GREEN→REFACTOR de forma estricta.
---

# TDD Specialist — LTI Candidate System

## Stack real del proyecto
- **Test runner:** Jest 29.7.0
- **Transformador:** ts-jest 29.2.5
- **ORM:** Prisma Client 5.13.0
- **Framework:** Express 4.19.2 + TypeScript 4.9.5
- **Archivo de tests:** `backend/src/test/tests-MC.test.ts`
- **Prerequisito:** Añadir `jest.config.js` en `backend/` antes de ejecutar (ver CLAUDE.md)

---

## Flujo obligatorio: RED → GREEN → REFACTOR

```
1. RED    — Escribe el test que falla. Ejecuta: npm test. Verifica que falla por la razón correcta.
2. GREEN  — Escribe el mínimo código de producción para que pase. Solo lo necesario.
3. REFACTOR — Limpia sin cambiar comportamiento. Vuelve a ejecutar tests para confirmar.
```

**Nunca escribas código de producción antes de tener un test en rojo.**
**Nunca pases a GREEN sin confirmación explícita del usuario.**

---

## Configuración de mocks con Prisma

```typescript
// Al inicio del archivo de tests
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    candidate: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    education: { create: jest.fn() },
    workExperience: { create: jest.fn() },
    resume: { create: jest.fn() },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      PrismaClientInitializationError: class PrismaClientInitializationError extends Error {},
    },
  };
});
```

```typescript
// En beforeEach — limpieza obligatoria de mocks
beforeEach(() => {
  jest.clearAllMocks();
});
```

Para obtener la instancia mockeada dentro de los tests:
```typescript
import { PrismaClient } from '@prisma/client';
const mockPrisma = new PrismaClient() as jest.Mocked<any>;
```

---

## Política de naming

```
should_[resultado esperado]_when_[condición de entrada]
```

Ejemplos:
```typescript
should_return_saved_candidate_when_all_required_fields_are_valid
should_throw_invalid_name_when_firstName_is_empty
should_throw_email_already_exists_when_prisma_returns_P2002
should_skip_validation_when_candidate_has_id
```

---

## Patrón AAA — Ejemplo concreto con Candidate

```typescript
it('should_return_saved_candidate_when_all_required_fields_are_valid', async () => {
  // ARRANGE
  const candidateData = {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana.garcia@example.com',
    phone: '612345678',
    address: 'Calle Mayor 1',
  };
  const savedResult = { id: 1, ...candidateData };
  mockPrisma.candidate.create.mockResolvedValue(savedResult);

  // ACT
  const result = await addCandidate(candidateData);

  // ASSERT
  expect(result).toEqual(savedResult);
  expect(mockPrisma.candidate.create).toHaveBeenCalledTimes(1);
});
```

---

## test.each para validaciones parametrizables

Usar `test.each` cuando la misma validación se aplica a múltiples valores:

```typescript
test.each([
  ['firstName vacío', { firstName: '', lastName: 'García', email: 'a@b.com' }],
  ['firstName muy corto', { firstName: 'A', lastName: 'García', email: 'a@b.com' }],
  ['firstName con números', { firstName: 'Ana123', lastName: 'García', email: 'a@b.com' }],
  ['firstName > 100 chars', { firstName: 'A'.repeat(101), lastName: 'García', email: 'a@b.com' }],
])('should_throw_invalid_name_when_%s', async (_, data) => {
  await expect(addCandidate(data)).rejects.toThrow('Invalid name');
});
```

Aplicar `test.each` también para: formatos de email inválidos, formatos de teléfono, formatos de fecha.

---

## Casos límite del modelo Candidate (derivados del schema + validator)

### Campos requeridos — deben lanzar error si faltan
- `firstName`: vacío, longitud 1, longitud 101, caracteres no permitidos (números, símbolos)
- `lastName`: mismas reglas que firstName
- `email`: vacío, sin @, sin dominio, sin TLD

### Campos opcionales — no deben fallar si son undefined/null
- `phone`: ausente (undefined) → válido; presente con formato incorrecto → error (regex `^(6|7|9)\d{8}$`)
- `address`: ausente → válido; presente con longitud > 100 → error

### Unicidad (manejo de error Prisma P2002)
- `email` duplicado → `addCandidate` debe relanzar `'The email already exists in the database'`

### Regla de edición (id presente)
- Si el payload tiene `id`, se omite toda validación → debe persistir sin validar campos

### Relaciones opcionales
- Sin `educations` → candidato guardado sin relaciones
- Con `educations` → cada Education recibe `candidateId` del candidato recién creado
- `endDate` ausente en Education y WorkExperience → válido (campo opcional)

### Boundaries numéricos/string
- firstName exactamente 2 chars → válido (mínimo)
- firstName exactamente 100 chars → válido (máximo)
- firstName 101 chars → error
- address exactamente 100 chars → válido
- address 101 chars → error

---

## Grupos de casos de test propuestos

| # | Nombre del test | Grupo |
|---|----------------|-------|
| 1 | should_return_saved_candidate_when_all_required_fields_are_valid | Happy Path |
| 2 | should_save_candidate_without_optional_fields | Happy Path |
| 3 | should_save_candidate_with_educations | Happy Path |
| 4 | should_save_candidate_with_workExperiences | Happy Path |
| 5 | should_save_candidate_with_cv | Happy Path |
| 6 | should_throw_invalid_name_when_firstName_is_empty | Validaciones |
| 7 | should_throw_invalid_name_when_firstName_has_one_char | Validaciones |
| 8 | should_throw_invalid_name_when_firstName_exceeds_100_chars | Validaciones |
| 9 | should_throw_invalid_name_when_firstName_contains_numbers | Validaciones |
| 10 | should_throw_invalid_name_when_lastName_is_empty | Validaciones |
| 11 | should_throw_invalid_email_when_email_is_empty | Validaciones |
| 12 | should_throw_invalid_email_when_email_has_invalid_format | Validaciones |
| 13 | should_throw_invalid_phone_when_phone_has_invalid_format | Validaciones |
| 14 | should_throw_invalid_address_when_address_exceeds_100_chars | Validaciones |
| 15 | should_throw_error_when_email_already_exists_in_database | Lógica de negocio |
| 16 | should_skip_validation_when_candidate_has_id | Lógica de negocio |
| 17 | should_assign_candidateId_to_education_after_candidate_save | Lógica de negocio |
| 18 | should_accept_undefined_phone | Edge Cases |
| 19 | should_accept_undefined_address | Edge Cases |
| 20 | should_accept_null_endDate_in_education | Edge Cases |
| 21 | should_accept_firstName_with_exactly_2_chars | Edge Cases |
| 22 | should_accept_firstName_with_exactly_100_chars | Edge Cases |
