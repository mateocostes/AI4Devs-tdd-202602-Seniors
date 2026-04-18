# /tdd-candidate

Comando TDD para el modelo Candidate del sistema LTI.
Activa el agente `tdd-specialist` y guía el ciclo RED→GREEN→REFACTOR.

## Archivo de output

Todos los tests deben escribirse en:
```
backend/src/test/tests-MC.test.ts
```

## Paso 1 — Lista de casos (ANTES de escribir código)

Antes de escribir cualquier test, muestra todos los casos agrupados así:

### Happy Path
- [ ] should_return_saved_candidate_when_all_required_fields_are_valid
- [ ] should_save_candidate_without_optional_fields
- [ ] should_save_candidate_with_educations
- [ ] should_save_candidate_with_workExperiences
- [ ] should_save_candidate_with_cv

### Validaciones
- [ ] should_throw_invalid_name_when_firstName_is_empty
- [ ] should_throw_invalid_name_when_firstName_has_one_char
- [ ] should_throw_invalid_name_when_firstName_exceeds_100_chars
- [ ] should_throw_invalid_name_when_firstName_contains_numbers
- [ ] should_throw_invalid_name_when_lastName_is_empty
- [ ] should_throw_invalid_email_when_email_is_empty
- [ ] should_throw_invalid_email_when_email_has_invalid_format
- [ ] should_throw_invalid_phone_when_phone_has_invalid_format
- [ ] should_throw_invalid_address_when_address_exceeds_100_chars

### Lógica de negocio
- [ ] should_throw_error_when_email_already_exists_in_database
- [ ] should_skip_validation_when_candidate_has_id
- [ ] should_assign_candidateId_to_education_after_candidate_save

### Edge Cases
- [ ] should_accept_undefined_phone
- [ ] should_accept_undefined_address
- [ ] should_accept_null_endDate_in_education
- [ ] should_accept_firstName_with_exactly_2_chars
- [ ] should_accept_firstName_with_exactly_100_chars

---

## Paso 2 — Esperar aprobación

**STOP. No escribas ningún test hasta que el usuario confirme la lista o la ajuste.**

Pregunta: "¿Apruebas estos casos o quieres añadir/quitar alguno antes de comenzar?"

---

## Paso 3 — Ciclo RED → GREEN → REFACTOR

Para cada caso aprobado, en orden:

1. **RED** — Escribe solo ese test. Ejecuta `cd backend && npm test`. Confirma que el test falla con el error esperado (no con un error de compilación ni de setup).
2. **STOP** — Muestra el error de fallo al usuario y pregunta: "¿Paso a GREEN para este caso?"
3. **GREEN** — Solo tras aprobación: escribe el mínimo código de producción. Vuelve a ejecutar tests.
4. **REFACTOR** — Limpia si aplica. Confirma que todos los tests siguen en verde.
5. Marca el caso como `[x]` y pasa al siguiente.

---

## Reglas del agente durante este comando

- Usar el agente `tdd-specialist` para todas las decisiones de diseño de tests.
- Mockear Prisma con `jest.mock('@prisma/client')` — nunca conectar a la base de datos real.
- Limpiar mocks en `beforeEach(() => jest.clearAllMocks())`.
- Usar `test.each` para los casos de validación de firstName, email y phone.
- Naming: `should_[resultado]_when_[condición]`.
- Si no existe `backend/jest.config.js`, crearlo antes del primer test:
  ```js
  module.exports = { preset: 'ts-jest', testEnvironment: 'node', testMatch: ['**/test/**/*.test.ts'] };
  ```
