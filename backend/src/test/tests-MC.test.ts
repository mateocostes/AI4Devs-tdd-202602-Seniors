/**
 * tests-MC.test.ts
 * TDD — Modelo Candidate (LTI Talent Tracking System)
 *
 * Familia 1 — Recepción de datos del formulario (validaciones)
 * Familia 2 — Guardado en base de datos (Prisma mockeado)
 * Familia 3 — Actualización de candidato
 * Familia 4 — Búsqueda de candidato (findOne)
 * Familia 5 — Manejo de errores y conexión a BD
 * Familia 6 — Tests de modelos directos (update paths)
 */

import { validateCandidateData } from '../application/validator';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';

// ─── Mock de Prisma ─────────────────────────────────────────────────────────────
// Los jest.fn() se crean dentro del factory para que existan antes de que los
// modelos llamen a new PrismaClient(). Se exponen via _mocks para acceso en tests.
jest.mock('@prisma/client', () => {
  const candidateCreate      = jest.fn();
  const candidateUpdate      = jest.fn();
  const candidateFindUnique  = jest.fn();
  const educationCreate      = jest.fn();
  const educationUpdate      = jest.fn();
  const workExperienceCreate = jest.fn();
  const workExperienceUpdate = jest.fn();
  const resumeCreate         = jest.fn();

  class PrismaClientInitializationError extends Error {
    constructor(message: string) { super(message); this.name = 'PrismaClientInitializationError'; }
  }

  const PrismaClient = jest.fn(() => ({
    candidate:      { create: candidateCreate,      update: candidateUpdate,      findUnique: candidateFindUnique },
    education:      { create: educationCreate,       update: educationUpdate },
    workExperience: { create: workExperienceCreate,  update: workExperienceUpdate },
    resume:         { create: resumeCreate },
  }));

  return {
    PrismaClient,
    Prisma: { PrismaClientInitializationError },
    _mocks: {
      candidateCreate,
      candidateUpdate,
      candidateFindUnique,
      educationCreate,
      educationUpdate,
      workExperienceCreate,
      workExperienceUpdate,
      resumeCreate,
    },
  };
});

// ─── Acceso tipado a los mocks y a la clase de error ────────────────────────────
const { _mocks, Prisma: MockPrisma } = jest.requireMock('@prisma/client') as {
  _mocks: {
    candidateCreate:      jest.Mock;
    candidateUpdate:      jest.Mock;
    candidateFindUnique:  jest.Mock;
    educationCreate:      jest.Mock;
    educationUpdate:      jest.Mock;
    workExperienceCreate: jest.Mock;
    workExperienceUpdate: jest.Mock;
    resumeCreate:         jest.Mock;
  };
  Prisma: { PrismaClientInitializationError: new (msg: string) => Error };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validCandidate = () => ({
  firstName: 'Juan',
  lastName:  'García',
  email:     'juan@example.com',
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 1 — Recepción de datos del formulario (validaciones)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 1 — Recepción de datos del formulario', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── firstName ─────────────────────────────────────────────────────────────────
  describe('Validación de firstName', () => {
    test.each([
      ['vacío',                 ''],
      ['un solo carácter',      'A'],
      ['supera 100 caracteres', 'A'.repeat(101)],
      ['contiene números',      'Juan1'],
      ['contiene símbolos',     'Juan@'],
    ])(
      'should_throw_invalid_name_when_firstName_%s',
      (_, firstName) => {
        expect(() =>
          validateCandidateData({ ...validCandidate(), firstName })
        ).toThrow('Invalid name');
      }
    );

    it('should_accept_firstName_with_exactly_2_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), firstName: 'Jo' })
      ).not.toThrow();
    });

    it('should_accept_firstName_with_exactly_100_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), firstName: 'A'.repeat(100) })
      ).not.toThrow();
    });

    it('should_accept_firstName_with_accented_and_special_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), firstName: 'María José' })
      ).not.toThrow();
    });

    it('should_accept_firstName_with_ñ', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), firstName: 'Íñigo' })
      ).not.toThrow();
    });
  });

  // ── lastName ──────────────────────────────────────────────────────────────────
  describe('Validación de lastName', () => {
    test.each([
      ['vacío',                 ''],
      ['un solo carácter',      'G'],
      ['supera 100 caracteres', 'B'.repeat(101)],
      ['contiene números',      'García2'],
      ['contiene símbolos',     'Pérez-'],
    ])(
      'should_throw_invalid_name_when_lastName_%s',
      (_, lastName) => {
        expect(() =>
          validateCandidateData({ ...validCandidate(), lastName })
        ).toThrow('Invalid name');
      }
    );
  });

  // ── email ─────────────────────────────────────────────────────────────────────
  describe('Validación de email', () => {
    test.each([
      ['vacío',                    ''],
      ['sin arroba',               'juanatexample.com'],
      ['sin dominio tras arroba',  'juan@'],
      ['sin extensión de dominio', 'juan@example'],
      ['con espacios',             'ju an@example.com'],
      ['doble arroba',             'juan@@example.com'],
    ])(
      'should_throw_invalid_email_when_%s',
      (_, email) => {
        expect(() =>
          validateCandidateData({ ...validCandidate(), email })
        ).toThrow('Invalid email');
      }
    );

    it('should_accept_valid_email_with_subdomain', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), email: 'juan@mail.example.com' })
      ).not.toThrow();
    });

    it('should_accept_valid_email_with_plus_alias', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), email: 'juan+tag@example.com' })
      ).not.toThrow();
    });
  });

  // ── phone ─────────────────────────────────────────────────────────────────────
  describe('Validación de phone (teléfono español)', () => {
    test.each([
      ['empieza por 1 (inválido)',    '123456789'],
      ['empieza por 2 (inválido)',    '223456789'],
      ['empieza por 8 (inválido)',    '823456789'],
      ['demasiado corto (8 dígitos)', '61234567'],
      ['demasiado largo (10 dígitos)','6123456789'],
      ['contiene letras',             '6123456AB'],
    ])(
      'should_throw_invalid_phone_when_%s',
      (_, phone) => {
        expect(() =>
          validateCandidateData({ ...validCandidate(), phone })
        ).toThrow('Invalid phone');
      }
    );

    test.each([
      ['empieza por 6', '612345678'],
      ['empieza por 7', '712345678'],
      ['empieza por 9', '912345678'],
    ])(
      'should_accept_valid_spanish_phone_%s',
      (_, phone) => {
        expect(() =>
          validateCandidateData({ ...validCandidate(), phone })
        ).not.toThrow();
      }
    );

    it('should_accept_undefined_phone', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), phone: undefined })
      ).not.toThrow();
    });
  });

  // ── address ───────────────────────────────────────────────────────────────────
  describe('Validación de address', () => {
    it('should_throw_invalid_address_when_address_exceeds_100_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), address: 'C'.repeat(101) })
      ).toThrow('Invalid address');
    });

    it('should_accept_address_with_exactly_100_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), address: 'C'.repeat(100) })
      ).not.toThrow();
    });

    it('should_accept_undefined_address', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), address: undefined })
      ).not.toThrow();
    });
  });

  // ── educations ────────────────────────────────────────────────────────────────
  describe('Validación de educations', () => {
    const baseEdu = { institution: 'UPM', title: 'Grado', startDate: '2020-01-01' };

    it('should_throw_error_when_education_institution_is_empty', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, institution: '' }] })
      ).toThrow('Invalid institution');
    });

    it('should_throw_error_when_education_institution_exceeds_100_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, institution: 'I'.repeat(101) }] })
      ).toThrow('Invalid institution');
    });

    it('should_throw_error_when_education_title_is_empty', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, title: '' }] })
      ).toThrow('Invalid title');
    });

    it('should_throw_error_when_education_startDate_is_empty', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, startDate: '' }] })
      ).toThrow('Invalid date');
    });

    it('should_throw_error_when_education_startDate_has_invalid_format', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, startDate: '01/01/2020' }] })
      ).toThrow('Invalid date');
    });

    // REFACTOR: el endDate con separadores incorrectos SÍ debe lanzar (cubre validator.ts L50)
    it('should_throw_invalid_end_date_when_education_endDate_uses_wrong_separator', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, endDate: '2024/06/30' }] })
      ).toThrow('Invalid end date');
    });

    // El regex valida formato YYYY-MM-DD pero no rangos: 2024-13-99 tiene el formato correcto
    it('should_accept_education_endDate_with_correct_format_but_invalid_calendar_values', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, endDate: '2024-13-99' }] })
      ).not.toThrow();
    });

    it('should_accept_null_endDate_in_education', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [{ ...baseEdu, endDate: null }] })
      ).not.toThrow();
    });

    it('should_accept_education_without_endDate', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), educations: [baseEdu] })
      ).not.toThrow();
    });
  });

  // ── workExperiences ───────────────────────────────────────────────────────────
  describe('Validación de workExperiences', () => {
    const baseExp = { company: 'Acme', position: 'Dev', startDate: '2021-01-01' };

    it('should_throw_error_when_workExperience_company_is_empty', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [{ ...baseExp, company: '' }] })
      ).toThrow('Invalid company');
    });

    it('should_throw_error_when_workExperience_position_is_empty', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [{ ...baseExp, position: '' }] })
      ).toThrow('Invalid position');
    });

    it('should_throw_error_when_workExperience_description_exceeds_200_chars', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [{ ...baseExp, description: 'D'.repeat(201) }] })
      ).toThrow('Invalid description');
    });

    it('should_throw_error_when_workExperience_startDate_has_invalid_format', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [{ ...baseExp, startDate: '2021/01/01' }] })
      ).toThrow('Invalid date');
    });

    // REFACTOR: endDate con separadores incorrectos SÍ debe lanzar (cubre validator.ts L70)
    it('should_throw_invalid_end_date_when_workExperience_endDate_uses_wrong_separator', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [{ ...baseExp, endDate: '2024/06/30' }] })
      ).toThrow('Invalid end date');
    });

    it('should_accept_workExperience_without_endDate', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), workExperiences: [baseExp] })
      ).not.toThrow();
    });
  });

  // ── cv ────────────────────────────────────────────────────────────────────────
  describe('Validación de cv', () => {
    it('should_throw_error_when_cv_has_missing_filePath', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), cv: { fileType: 'pdf' } })
      ).toThrow('Invalid CV data');
    });

    it('should_throw_error_when_cv_has_missing_fileType', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), cv: { filePath: '/uploads/cv.pdf' } })
      ).toThrow('Invalid CV data');
    });

    it('should_accept_valid_cv_object', () => {
      expect(() =>
        validateCandidateData({ ...validCandidate(), cv: { filePath: '/uploads/cv.pdf', fileType: 'pdf' } })
      ).not.toThrow();
    });
  });

  // ── skip validation por id ────────────────────────────────────────────────────
  it('should_skip_validation_when_candidate_has_id', () => {
    expect(() =>
      validateCandidateData({ id: 1 }) // Sin firstName ni email — edición
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 2 — Guardado en base de datos
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 2 — Guardado en base de datos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should_return_saved_candidate_when_all_required_fields_are_valid', async () => {
    const dbResponse = { id: 1, ...validCandidate() };
    _mocks.candidateCreate.mockResolvedValue(dbResponse);

    const result = await addCandidate(validCandidate());

    expect(_mocks.candidateCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(dbResponse);
  });

  it('should_save_candidate_without_optional_fields', async () => {
    const dbResponse = { id: 2, firstName: 'Ana', lastName: 'López', email: 'ana@example.com' };
    _mocks.candidateCreate.mockResolvedValue(dbResponse);

    const result = await addCandidate({ firstName: 'Ana', lastName: 'López', email: 'ana@example.com' });

    expect(_mocks.candidateCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual(dbResponse);
    expect(_mocks.educationCreate).not.toHaveBeenCalled();
    expect(_mocks.workExperienceCreate).not.toHaveBeenCalled();
    expect(_mocks.resumeCreate).not.toHaveBeenCalled();
  });

  it('should_save_candidate_with_educations', async () => {
    const candidateId = 3;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.educationCreate.mockResolvedValue({ id: 10, candidateId });

    await addCandidate({
      ...validCandidate(),
      educations: [{ institution: 'UPM', title: 'Grado', startDate: '2020-01-01' }],
    });

    expect(_mocks.educationCreate).toHaveBeenCalledTimes(1);
  });

  it('should_assign_candidateId_to_education_after_candidate_save', async () => {
    const candidateId = 42;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.educationCreate.mockResolvedValue({ id: 1, candidateId });

    await addCandidate({
      ...validCandidate(),
      educations: [{ institution: 'UNED', title: 'Master', startDate: '2019-09-01' }],
    });

    expect(_mocks.educationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidateId }) })
    );
  });

  it('should_save_candidate_with_workExperiences', async () => {
    const candidateId = 4;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.workExperienceCreate.mockResolvedValue({ id: 20, candidateId });

    await addCandidate({
      ...validCandidate(),
      workExperiences: [{ company: 'Acme', position: 'Dev', startDate: '2022-03-01' }],
    });

    expect(_mocks.workExperienceCreate).toHaveBeenCalledTimes(1);
    expect(_mocks.workExperienceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidateId }) })
    );
  });

  it('should_save_candidate_with_cv', async () => {
    const candidateId = 5;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.resumeCreate.mockResolvedValue({
      id: 30, candidateId, filePath: '/uploads/cv.pdf', fileType: 'pdf', uploadDate: new Date(),
    });

    await addCandidate({ ...validCandidate(), cv: { filePath: '/uploads/cv.pdf', fileType: 'pdf' } });

    expect(_mocks.resumeCreate).toHaveBeenCalledTimes(1);
    expect(_mocks.resumeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidateId }) })
    );
  });

  it('should_save_candidate_with_both_education_and_workExperience', async () => {
    const candidateId = 6;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.educationCreate.mockResolvedValue({ id: 11, candidateId });
    _mocks.workExperienceCreate.mockResolvedValue({ id: 21, candidateId });

    await addCandidate({
      ...validCandidate(),
      educations:       [{ institution: 'UCM', title: 'Licenciatura', startDate: '2015-09-01' }],
      workExperiences:  [{ company: 'BigCorp', position: 'Engineer', startDate: '2020-06-01' }],
    });

    expect(_mocks.educationCreate).toHaveBeenCalledTimes(1);
    expect(_mocks.workExperienceCreate).toHaveBeenCalledTimes(1);
  });

  it('should_save_multiple_educations_for_single_candidate', async () => {
    const candidateId = 7;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.educationCreate.mockResolvedValue({ id: 1, candidateId });

    await addCandidate({
      ...validCandidate(),
      educations: [
        { institution: 'UCM', title: 'Grado',  startDate: '2015-09-01', endDate: '2019-06-30' },
        { institution: 'UPM', title: 'Master', startDate: '2019-09-01' },
      ],
    });

    expect(_mocks.educationCreate).toHaveBeenCalledTimes(2);
  });

  it('should_save_multiple_workExperiences_for_single_candidate', async () => {
    const candidateId = 8;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.workExperienceCreate.mockResolvedValue({ id: 1, candidateId });

    await addCandidate({
      ...validCandidate(),
      workExperiences: [
        { company: 'Acme',    position: 'Junior Dev', startDate: '2020-01-01', endDate: '2021-12-31' },
        { company: 'BigCorp', position: 'Senior Dev', startDate: '2022-01-01' },
      ],
    });

    expect(_mocks.workExperienceCreate).toHaveBeenCalledTimes(2);
  });

  it('should_throw_error_when_email_already_exists_in_database', async () => {
    const duplicateError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    _mocks.candidateCreate.mockRejectedValue(duplicateError);

    await expect(addCandidate(validCandidate())).rejects.toThrow(
      'The email already exists in the database'
    );
  });

  it('should_call_prisma_create_with_correct_candidate_fields', async () => {
    const candidateData = {
      firstName: 'Pedro', lastName: 'Martínez',
      email: 'pedro@example.com', phone: '612345678', address: 'Calle Mayor 1',
    };
    _mocks.candidateCreate.mockResolvedValue({ id: 9, ...candidateData });

    await addCandidate(candidateData);

    expect(_mocks.candidateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Pedro', lastName: 'Martínez', email: 'pedro@example.com',
          phone: '612345678', address: 'Calle Mayor 1',
        }),
      })
    );
  });

  it('should_accept_education_with_null_endDate_when_saving', async () => {
    const candidateId = 10;
    _mocks.candidateCreate.mockResolvedValue({ id: candidateId, ...validCandidate() });
    _mocks.educationCreate.mockResolvedValue({ id: 1, candidateId });

    await expect(
      addCandidate({
        ...validCandidate(),
        educations: [{ institution: 'UPM', title: 'Grado', startDate: '2020-01-01', endDate: null }],
      })
    ).resolves.not.toThrow();

    expect(_mocks.educationCreate).toHaveBeenCalledTimes(1);
  });

  // Cubre candidateService.ts L52: error que no es P2002 se propaga tal cual
  it('should_propagate_non_P2002_error_from_candidate_create', async () => {
    const genericError = new Error('Unexpected database error');
    _mocks.candidateCreate.mockRejectedValue(genericError);

    await expect(addCandidate(validCandidate())).rejects.toThrow('Unexpected database error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 3 — Actualización de candidato (update path)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 3 — Actualización de candidato', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should_call_candidate_update_when_id_is_provided', async () => {
    const updatedData = { id: 1, firstName: 'Juan Actualizado', lastName: 'García', email: 'juan@example.com' };
    _mocks.candidateUpdate.mockResolvedValue(updatedData);

    const result = await addCandidate({ id: 1, firstName: 'Juan Actualizado' });

    expect(_mocks.candidateUpdate).toHaveBeenCalledTimes(1);
    expect(_mocks.candidateCreate).not.toHaveBeenCalled();
    expect(result).toEqual(updatedData);
  });

  it('should_call_update_with_correct_where_clause', async () => {
    _mocks.candidateUpdate.mockResolvedValue({ id: 5, firstName: 'Ana' });

    await addCandidate({ id: 5, firstName: 'Ana', email: 'ana@example.com' });

    expect(_mocks.candidateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } })
    );
  });

  it('should_skip_validation_when_updating_with_id', async () => {
    // Con id: cualquier payload (sin firstName ni email) pasa sin validar
    _mocks.candidateUpdate.mockResolvedValue({ id: 99 });

    await expect(addCandidate({ id: 99 })).resolves.not.toThrow();
    expect(_mocks.candidateUpdate).toHaveBeenCalledTimes(1);
  });

  it('should_throw_not_found_when_P2025_on_update', async () => {
    const notFoundError = new Error('No se pudo encontrar el registro del candidato con el ID proporcionado.');
    // Candidate.save() convierte P2025 en un error con ese mensaje
    _mocks.candidateUpdate.mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' })
    );

    await expect(addCandidate({ id: 999, firstName: 'Ghost' })).rejects.toThrow(
      'No se pudo encontrar el registro del candidato con el ID proporcionado.'
    );
  });

  it('should_save_educations_when_updating_candidate_with_id', async () => {
    const candidateId = 20;
    _mocks.candidateUpdate.mockResolvedValue({ id: candidateId });
    _mocks.educationCreate.mockResolvedValue({ id: 1, candidateId });

    await addCandidate({
      id: candidateId,
      educations: [{ institution: 'UPM', title: 'Grado', startDate: '2020-01-01' }],
    });

    expect(_mocks.candidateUpdate).toHaveBeenCalledTimes(1);
    expect(_mocks.educationCreate).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 4 — Búsqueda de candidato (Candidate.findOne)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 4 — Búsqueda de candidato', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should_return_candidate_instance_when_findOne_called_with_valid_id', async () => {
    const dbData = { id: 1, firstName: 'Juan', lastName: 'García', email: 'juan@example.com' };
    _mocks.candidateFindUnique.mockResolvedValue(dbData);

    const candidate = await Candidate.findOne(1);

    expect(_mocks.candidateFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(candidate).toBeInstanceOf(Candidate);
    expect(candidate?.firstName).toBe('Juan');
    expect(candidate?.email).toBe('juan@example.com');
  });

  it('should_return_null_when_candidate_not_found', async () => {
    _mocks.candidateFindUnique.mockResolvedValue(null);

    const candidate = await Candidate.findOne(9999);

    expect(_mocks.candidateFindUnique).toHaveBeenCalledWith({ where: { id: 9999 } });
    expect(candidate).toBeNull();
  });

  it('should_map_all_candidate_fields_from_database', async () => {
    const dbData = {
      id: 2, firstName: 'Ana', lastName: 'López',
      email: 'ana@example.com', phone: '698765432', address: 'Calle Luna 5',
    };
    _mocks.candidateFindUnique.mockResolvedValue(dbData);

    const candidate = await Candidate.findOne(2);

    expect(candidate?.id).toBe(2);
    expect(candidate?.phone).toBe('698765432');
    expect(candidate?.address).toBe('Calle Luna 5');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 5 — Manejo de errores y conexión a BD
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 5 — Manejo de errores y conexión a BD', () => {
  beforeEach(() => jest.clearAllMocks());

  // Nota: el check `instanceof Prisma.PrismaClientInitializationError` en Candidate.ts
  // requiere la clase real de Prisma. Con mocks la referencia de clase no es idéntica,
  // por lo que el error no es interceptado y se propaga con su mensaje original.
  // Estos tests documentan el comportamiento REAL con mocks y sirven como regresión.
  it('should_propagate_connection_error_from_candidate_create_when_instanceof_fails_with_mock', async () => {
    const connectionError = new MockPrisma.PrismaClientInitializationError('Cannot connect to DB');
    _mocks.candidateCreate.mockRejectedValue(connectionError);

    // Con el mock, instanceof devuelve false → el error original se propaga
    await expect(addCandidate(validCandidate())).rejects.toThrow('Cannot connect to DB');
  });

  it('should_propagate_connection_error_from_candidate_update_when_instanceof_fails_with_mock', async () => {
    const connectionError = new MockPrisma.PrismaClientInitializationError('Cannot connect to DB');
    _mocks.candidateUpdate.mockRejectedValue(connectionError);

    // Con el mock, instanceof devuelve false → el error original se propaga
    await expect(addCandidate({ id: 1 })).rejects.toThrow('Cannot connect to DB');
  });

  it('should_throw_not_found_message_when_P2025_and_no_code_property_on_rethrown_error', async () => {
    // P2025 es capturado dentro de Candidate.save() y relanzado como error estándar sin code
    _mocks.candidateUpdate.mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' })
    );

    await expect(addCandidate({ id: 1 })).rejects.toThrow(
      'No se pudo encontrar el registro del candidato con el ID proporcionado.'
    );
  });

  it('should_propagate_unknown_error_from_candidate_update', async () => {
    const unknownError = new Error('Disk full');
    _mocks.candidateUpdate.mockRejectedValue(unknownError);

    await expect(addCandidate({ id: 1 })).rejects.toThrow('Disk full');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAMILIA 6 — Tests de modelos directos (update paths y casos límite)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Familia 6 — Tests de modelos directos', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Education model ───────────────────────────────────────────────────────────
  describe('Education model', () => {
    // Cubre Education.ts L36: ruta de actualización (save con id)
    it('should_call_education_update_when_education_has_id', async () => {
      const updatedEdu = { id: 5, institution: 'UPM Actualizada', title: 'Master', startDate: new Date('2020-01-01'), candidateId: 1 };
      _mocks.educationUpdate.mockResolvedValue(updatedEdu);

      const edu = new Education({
        id: 5, institution: 'UPM Actualizada', title: 'Master',
        startDate: '2020-01-01', candidateId: 1,
      });
      const result = await edu.save();

      expect(_mocks.educationUpdate).toHaveBeenCalledTimes(1);
      expect(_mocks.educationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } })
      );
      expect(_mocks.educationCreate).not.toHaveBeenCalled();
      expect(result).toEqual(updatedEdu);
    });

    it('should_call_education_create_when_education_has_no_id', async () => {
      const newEdu = { id: 1, institution: 'UCM', title: 'Grado', startDate: new Date('2018-09-01'), candidateId: 3 };
      _mocks.educationCreate.mockResolvedValue(newEdu);

      const edu = new Education({ institution: 'UCM', title: 'Grado', startDate: '2018-09-01', candidateId: 3 });
      await edu.save();

      expect(_mocks.educationCreate).toHaveBeenCalledTimes(1);
      expect(_mocks.educationUpdate).not.toHaveBeenCalled();
    });
  });

  // ── WorkExperience model ──────────────────────────────────────────────────────
  describe('WorkExperience model', () => {
    // Cubre WorkExperience.ts L39: ruta de actualización (save con id)
    it('should_call_workExperience_update_when_workExperience_has_id', async () => {
      const updatedExp = { id: 10, company: 'NewCorp', position: 'CTO', startDate: new Date('2021-01-01'), candidateId: 2 };
      _mocks.workExperienceUpdate.mockResolvedValue(updatedExp);

      const exp = new WorkExperience({
        id: 10, company: 'NewCorp', position: 'CTO',
        startDate: '2021-01-01', candidateId: 2,
      });
      const result = await exp.save();

      expect(_mocks.workExperienceUpdate).toHaveBeenCalledTimes(1);
      expect(_mocks.workExperienceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } })
      );
      expect(_mocks.workExperienceCreate).not.toHaveBeenCalled();
      expect(result).toEqual(updatedExp);
    });

    it('should_call_workExperience_create_when_workExperience_has_no_id', async () => {
      const newExp = { id: 1, company: 'StartupX', position: 'Dev', startDate: new Date('2022-03-01'), candidateId: 5 };
      _mocks.workExperienceCreate.mockResolvedValue(newExp);

      const exp = new WorkExperience({ company: 'StartupX', position: 'Dev', startDate: '2022-03-01', candidateId: 5 });
      await exp.save();

      expect(_mocks.workExperienceCreate).toHaveBeenCalledTimes(1);
      expect(_mocks.workExperienceUpdate).not.toHaveBeenCalled();
    });
  });

  // ── Resume model ──────────────────────────────────────────────────────────────
  describe('Resume model', () => {
    // Cubre Resume.ts L24: actualización de resume no está permitida
    it('should_throw_when_attempting_to_update_existing_resume', async () => {
      const resume = new Resume({ id: 99, filePath: '/uploads/old.pdf', fileType: 'pdf', candidateId: 1 });

      await expect(resume.save()).rejects.toThrow(
        'No se permite la actualización de un currículum existente.'
      );
      expect(_mocks.resumeCreate).not.toHaveBeenCalled();
    });

    it('should_call_resume_create_when_resume_has_no_id', async () => {
      _mocks.resumeCreate.mockResolvedValue({
        id: 1, filePath: '/uploads/cv.pdf', fileType: 'pdf', candidateId: 3, uploadDate: new Date(),
      });

      const resume = new Resume({ filePath: '/uploads/cv.pdf', fileType: 'pdf', candidateId: 3 });
      await resume.save();

      expect(_mocks.resumeCreate).toHaveBeenCalledTimes(1);
    });
  });
});
