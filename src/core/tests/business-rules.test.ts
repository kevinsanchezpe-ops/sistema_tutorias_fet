/**
 * Pruebas unitarias de invariantes y reglas de negocio del Sistema GT.
 * Verifica que todas las reglas extraídas del sistema PHP original se cumplan fielmente.
 */

import { ApproveTutoringUseCase } from '../application/use-cases/approve-tutoring.use-case';
import { CancelTutoringUseCase } from '../application/use-cases/cancel-tutoring.use-case';
import { CreateTutoringUseCase } from '../application/use-cases/create-tutoring.use-case';
import { FinishTutoringUseCase } from '../application/use-cases/finish-tutoring.use-case';
import { JoinTutoringUseCase } from '../application/use-cases/join-tutoring.use-case';
import { RateTutoringUseCase } from '../application/use-cases/rate-tutoring.use-case';
import { RegisterStudentUseCase } from '../application/use-cases/register-student.use-case';
import { RegisterTeacherUseCase } from '../application/use-cases/register-teacher.use-case';
import { StartTutoringUseCase } from '../application/use-cases/start-tutoring.use-case';
import { BusinessRuleException, ScheduleConflictService } from '../domain/services/schedule-conflict.service';
import { TutoringStateMachineService } from '../domain/services/state-machine.service';
import { db } from '../infrastructure/database/database';
import { TutoringModality, TutoringStatus, UserRole, TutoringType } from '../types';

export function runBusinessRulesTests(): { total: number; passed: number; results: { name: string; success: boolean; message: string }[] } {
  const results: { name: string; success: boolean; message: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, success: true, message: 'PASS' });
    } catch (err: any) {
      results.push({ name, success: false, message: err.message || String(err) });
    }
  }

  // 1. Regla de Anticipación (+2 Días)
  test('Regla +2 Días: Debe rechazar una reserva solicitada para hoy', () => {
    const today = new Date().toISOString().split('T')[0];
    let threw = false;
    try {
      ScheduleConflictService.validateReservationDate(today);
    } catch (e: any) {
      if (e instanceof BusinessRuleException && e.code === 'DATE_TOO_EARLY') {
        threw = true;
      }
    }
    if (!threw) throw new Error('Debería haber lanzado DATE_TOO_EARLY');
  });

  test('Regla +2 Días: Debe aceptar una reserva solicitada para 3 días en el futuro', () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const dateStr = future.toISOString().split('T')[0];
    ScheduleConflictService.validateReservationDate(dateStr);
  });

  // 2. Regla de Conflicto de Docente
  test('Conflicto Docente: No debe permitir dos tutorías para el mismo docente en la misma fecha y bloque horario', () => {
    const existing = db.tutorings[0];
    let threw = false;
    try {
      ScheduleConflictService.validateTeacherScheduleConflict(
        existing.teacherId,
        existing.reservDate,
        existing.scheduleSlotId,
        db.tutorings
      );
    } catch (e: any) {
      if (e.code === 'TEACHER_SLOT_OCCUPIED') threw = true;
    }
    if (!threw) throw new Error('Debería haber detectado conflicto de horario para el docente');
  });

  // 3. Regla de Conflicto de Aula Física (Sección)
  test('Conflicto Aula: No debe permitir dos tutorías presenciales en la misma aula física, fecha y franja', () => {
    const completedPresencial = db.tutorings.find(
      (t) => t.modality === TutoringModality.PRESENCIAL && t.status === TutoringStatus.COMPLETED
    );
    if (completedPresencial) {
      // Simular una tutoría aprobada en esa aula
      completedPresencial.status = TutoringStatus.APPROVED;
      let threw = false;
      try {
        ScheduleConflictService.validateSectionState(
          completedPresencial.space,
          completedPresencial.reservDate,
          completedPresencial.scheduleSlotId,
          TutoringModality.PRESENCIAL,
          db.tutorings,
          'tut-new-different'
        );
      } catch (e: any) {
        if (e.code === 'SECTION_NOT_AVAILABLE') threw = true;
      }
      completedPresencial.status = TutoringStatus.COMPLETED;
      if (!threw) throw new Error('Debería haber detectado ocupación de aula');
    }
  });

  // 4. Máquina de Estados
  test('Máquina de Estados: Debe impedir transiciones no válidas (COMPLETED -> IN_PROGRESS)', () => {
    let threw = false;
    try {
      TutoringStateMachineService.ensureValidTransition(TutoringStatus.COMPLETED, TutoringStatus.IN_PROGRESS);
    } catch (e: any) {
      if (e.code === 'IMMUTABLE_COMPLETED_STATE') threw = true;
    }
    if (!threw) throw new Error('Debería haber bloqueado la transición desde COMPLETED');
  });

  // 5. Unirse como invitado
  test('Participante Invitado: Creador no puede unirse como invitado a su propia solicitud', () => {
    const student1 = db.users.find((u) => u.id === 'usr-student-1')!;
    const tut1 = db.tutorings.find((t) => t.id === 'tut-1')!; // Creada por student1
    let threw = false;
    try {
      JoinTutoringUseCase.execute(tut1.id, student1);
    } catch (e: any) {
      if (e.code === 'ALREADY_OWNER') threw = true;
    }
    if (!threw) throw new Error('El creador no debería poder unirse como invitado');
  });

  // 6. Calificaciones
  test('Evaluación: No se puede calificar dos veces una misma tutoría', () => {
    const student1 = db.users.find((u) => u.id === 'usr-student-1')!;
    const tut3 = db.tutorings.find((t) => t.id === 'tut-3')!; // Ya calificada con 5 estrellas
    let threw = false;
    try {
      RateTutoringUseCase.execute({ tutoringId: tut3.id, score: 4, studentComment: 'Intento duplicado' }, student1);
    } catch (e: any) {
      if (e.code === 'ALREADY_RATED') threw = true;
    }
    if (!threw) throw new Error('No debe permitir doble calificación');
  });

  // 7. Registro de Estudiantes
  test('Registro de Estudiante: Valida que el nombre tenga al menos 10 caracteres', () => {
    let threw = false;
    try {
      RegisterStudentUseCase.execute({
        fullName: 'Juan Cor',
        email: 'juan@gt.edu',
        account: '12345678',
        username: 'juan_corto',
        birthDate: '2000-01-01',
        admissionDate: '2023-01-01',
        careerId: 'car-1',
        campusId: 'cmp-1'
      });
    } catch (e: any) {
      if (e.code === 'INVALID_NAME') threw = true;
    }
    if (!threw) throw new Error('Debería exigir mínimo 10 caracteres para el nombre completo');
  });

  // 8. Registro de Docentes y Generación de Disponibilidad
  test('Registro de Docente: Crea usuario docente e inicializa sus franjas de disponibilidad', () => {
    const rnd = Date.now();
    const newTeacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Docente Prueba ${rnd}`,
      email: `prof.${rnd}@gt.edu`,
      account: `DOC-${rnd}`,
      username: `docente_test_${rnd}`,
      subjectIds: [db.subjects[0].id],
      scheduleSlotIds: [db.scheduleSlots[0].id]
    });

    if (newTeacher.role !== UserRole.TEACHER) {
      throw new Error('El nuevo docente debe tener el rol UserRole.TEACHER');
    }

    const createdAvail = db.teacherAvailability.find(
      (a) => a.teacherId === newTeacher.id && a.subjectCourseId === db.subjects[0].id
    );
    if (!createdAvail) {
      throw new Error('El docente registrado debe tener su registro de disponibilidad creado');
    }
  });

  // 9. Regla de disponibilidad del docente (condicional)
  test('Disponibilidad Docente: Solo agenda dentro de la disponibilidad activa registrada', () => {
    const rnd = Date.now();
    const student = db.users.find((u) => u.role === UserRole.STUDENT)!;
    const subjectOk = db.subjects[0].id;
    const subjectOther = db.subjects.find((s) => s.id !== subjectOk)!.id;
    const slotOk = db.scheduleSlots[0].id;

    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Disponibilidad Prueba ${rnd}`,
      email: `disp.${rnd}@gt.edu`,
      account: `DIS-${rnd}`,
      username: `docente_disp_${rnd}`,
      subjectIds: [subjectOk],
      scheduleSlotIds: [slotOk]
    });

    const created: string[] = [];
    const dOk = new Date();
    dOk.setDate(dOk.getDate() + 3);
    const dNo = new Date();
    dNo.setDate(dNo.getDate() + 4);

    try {
      const ok = CreateTutoringUseCase.execute(
        {
          subject: 'Prueba disponibilidad válida',
          details: 'detalle de prueba de disponibilidad',
          reservDate: dOk.toISOString().split('T')[0],
          scheduleSlotId: slotOk,
          subjectCourseId: subjectOk,
          teacherId: teacher.id,
          modality: TutoringModality.VIRTUAL,
          type: TutoringType.INDIVIDUAL,
        },
        student
      );
      created.push(ok.id);

      let threw = false;
      try {
        CreateTutoringUseCase.execute(
          {
            subject: 'Prueba fuera de disponibilidad',
            details: 'detalle fuera de disponibilidad',
            reservDate: dNo.toISOString().split('T')[0],
            scheduleSlotId: slotOk,
            subjectCourseId: subjectOther,
            teacherId: teacher.id,
            modality: TutoringModality.VIRTUAL,
            type: TutoringType.INDIVIDUAL,
          },
          student
        );
      } catch (e: any) {
        if (e.code === 'TEACHER_UNAVAILABLE') threw = true;
      }
      if (!threw) throw new Error('Debería rechazar la solicitud fuera de la disponibilidad del docente');
    } finally {
      created.forEach((id) => {
        const i = db.tutorings.findIndex((t) => t.id === id);
        if (i >= 0) db.tutorings.splice(i, 1);
      });
    }
  });

  // 10. Regla de cupo máximo del aula (capacidad de la sección)
  test('Cupo de Aula: No permite superar la capacidad de la sección asignada', () => {
    const rnd = Date.now();
    const student1 = db.users.find((u) => u.role === UserRole.STUDENT)!;
    const student2 = db.users.find((u) => u.role === UserRole.STUDENT && u.id !== student1.id);
    if (!student2) return;

    const section = db.sections[0];
    const prevCapacity = section.capacity;
    // Materia del mismo semestre/carrera de student2 para no activar la regla grupal
    const subjectId = (db.subjects.find(
      (s) => Number(s.semester) === Number(student2.semester) && s.careerId === student2.careerId
    ) || db.subjects[0]).id;
    const slotId = db.scheduleSlots[0].id;

    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Cupo Prueba ${rnd}`,
      email: `cupo.${rnd}@gt.edu`,
      account: `CUP-${rnd}`,
      username: `docente_cupo_${rnd}`,
      subjectIds: [subjectId],
      scheduleSlotIds: [slotId]
    });

    const created: string[] = [];
    const d = new Date();
    d.setDate(d.getDate() + 6);

    try {
      section.capacity = 1;
      const tut = CreateTutoringUseCase.execute(
        {
          subject: 'Prueba cupo de aula',
          details: 'detalle de prueba de cupo',
          reservDate: d.toISOString().split('T')[0],
          scheduleSlotId: slotId,
          subjectCourseId: subjectId,
          teacherId: teacher.id,
          modality: TutoringModality.PRESENCIAL,
          type: TutoringType.GROUP,
        },
        student1
      );
      created.push(tut.id);

      ApproveTutoringUseCase.execute({ tutoringId: tut.id, space: section.name, block: 'B1', maxParticipants: 2 }, teacher);

      let threw = false;
      try {
        JoinTutoringUseCase.execute(tut.id, student2);
      } catch (e: any) {
        if (e.code === 'CAPACITY_FULL') threw = true;
      }
      if (!threw) throw new Error('Debería rechazar la inscripción por cupo completo');
    } finally {
      section.capacity = prevCapacity;
      created.forEach((id) => {
        const i = db.tutorings.findIndex((t) => t.id === id);
        if (i >= 0) db.tutorings.splice(i, 1);
      });
    }
  });

  // 11. Grupales misma carrera y semestre (Juan sem 2 / Kevin sem 3)
  test('Grupal: Rechaza unirse a tutoría de otro semestre', () => {
    const rnd = Date.now();
    const petitioner = db.users.find((u) => u.id === 'usr-student-1')!;
    const guest = db.users.find((u) => u.id === 'usr-student-2')!;
    // Materia de software de un semestre distinto al del invitado
    const subject = db.subjects.find(
      (s) => s.careerId === guest.careerId && Number(s.semester) !== Number(guest.semester)
    );
    if (!subject) return; // sin datos para el caso, se omite
    const slotId = db.scheduleSlots[1].id;
    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Semestre Prueba ${rnd}`,
      email: `semestre.${rnd}@gt.edu`,
      account: `SEM-${rnd}`,
      username: `docente_semestre_${rnd}`,
      subjectIds: [subject.id],
      scheduleSlotIds: [slotId]
    });
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const tut = CreateTutoringUseCase.execute(
      {
        subject: 'Prueba semestre distinto',
        details: 'detalle de prueba de semestre',
        reservDate: d.toISOString().split('T')[0],
        scheduleSlotId: slotId,
        subjectCourseId: subject.id,
        teacherId: teacher.id,
                modality: TutoringModality.VIRTUAL,
        type: TutoringType.GROUP,
      },
      petitioner
    );
    try {
      let threw = false;
      try {
        JoinTutoringUseCase.execute(tut.id, guest);
      } catch (e: any) {
        if (e.code === 'DIFFERENT_SEMESTER') threw = true;
      }
      if (!threw) throw new Error('Debería rechazar la inscripción por semestre distinto');
    } finally {
      const i = db.tutorings.findIndex((t) => t.id === tut.id);
      if (i >= 0) db.tutorings.splice(i, 1);
      const ti = db.users.findIndex((u) => u.id === teacher.id);
      if (ti >= 0) db.users.splice(ti, 1);
    }
  });

  // 12. Grupales misma carrera
  test('Grupal: Rechaza unirse a tutoría de otra carrera', () => {
    const rnd = Date.now() + 1;
    const petitioner = db.users.find((u) => u.id === 'usr-student-1')!;
    const guest = db.users.find((u) => u.id === 'usr-student-2')!;
    // Materia de otra carrera
    const subject = db.subjects.find((s) => s.careerId && s.careerId !== guest.careerId);
    if (!subject) return; // sin datos para el caso, se omite
    const slotId = db.scheduleSlots[2].id;
    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Carrera Prueba ${rnd}`,
      email: `carrera.${rnd}@gt.edu`,
      account: `CAR-${rnd}`,
      username: `docente_carrera_${rnd}`,
      subjectIds: [subject.id],
      scheduleSlotIds: [slotId]
    });
    const d = new Date();
    d.setDate(d.getDate() + 8);
    const tut = CreateTutoringUseCase.execute(
      {
        subject: 'Prueba otra carrera',
        details: 'detalle de prueba de carrera',
        reservDate: d.toISOString().split('T')[0],
        scheduleSlotId: slotId,
        subjectCourseId: subject.id,
        teacherId: teacher.id,
                modality: TutoringModality.VIRTUAL,
        type: TutoringType.GROUP,
      },
      petitioner
    );
    try {
      let threw = false;
      try {
        JoinTutoringUseCase.execute(tut.id, guest);
      } catch (e: any) {
        if (e.code === 'DIFFERENT_CAREER') threw = true;
      }
      if (!threw) throw new Error('Debería rechazar la inscripción por carrera distinta');
    } finally {
      const i = db.tutorings.findIndex((t) => t.id === tut.id);
      if (i >= 0) db.tutorings.splice(i, 1);
      const ti = db.users.findIndex((u) => u.id === teacher.id);
      if (ti >= 0) db.users.splice(ti, 1);
    }
  });

  // 13. Presencial exige salón y bloque manuales
  test('Presencial: Aprobar exige salón y bloque escritos manualmente', () => {
    const rnd = Date.now() + 2;
    const petitioner = db.users.find((u) => u.id === 'usr-student-1')!;
    const subjectId = db.subjects[0].id;
    const slotId = db.scheduleSlots[3].id;
    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Bloque Prueba ${rnd}`,
      email: `bloque.${rnd}@gt.edu`,
      account: `BLQ-${rnd}`,
      username: `docente_bloque_${rnd}`,
      subjectIds: [subjectId],
      scheduleSlotIds: [slotId]
    });
    const d = new Date();
    d.setDate(d.getDate() + 9);
    const tut = CreateTutoringUseCase.execute(
      {
        subject: 'Prueba bloque requerido',
        details: 'detalle de prueba de bloque',
        reservDate: d.toISOString().split('T')[0],
        scheduleSlotId: slotId,
        subjectCourseId: subjectId,
        teacherId: teacher.id,
        modality: TutoringModality.PRESENCIAL,
        type: TutoringType.INDIVIDUAL,
      },
      petitioner
    );
    try {
      let threw = false;
      try {
        ApproveTutoringUseCase.execute({ tutoringId: tut.id, space: 'Aula 99' }, teacher);
      } catch (e: any) {
        if (e.code === 'BLOCK_REQUIRED') threw = true;
      }
      if (!threw) throw new Error('Debería exigir el bloque en presenciales');
      const approved = ApproveTutoringUseCase.execute(
        { tutoringId: tut.id, space: 'Aula 99', block: 'B9' },
        teacher
      );
      if (approved.block !== 'B9') throw new Error('Debería guardar el bloque asignado');
    } finally {
      const i = db.tutorings.findIndex((t) => t.id === tut.id);
      if (i >= 0) db.tutorings.splice(i, 1);
      const ti = db.users.findIndex((u) => u.id === teacher.id);
      if (ti >= 0) db.users.splice(ti, 1);
    }
  });

  // 14. Cancelación conserva el espacio y guarda el motivo aparte
  test('Cancelación: conserva el espacio asignado y registra el motivo por separado', () => {
    const rnd = Date.now() + 3;
    const petitioner = db.users.find((u) => u.id === 'usr-student-1')!;
    const subjectId = db.subjects[0].id;
    const slotId = db.scheduleSlots[4].id;
    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Cancela Prueba ${rnd}`,
      email: `cancela.${rnd}@gt.edu`,
      account: `CNC-${rnd}`,
      username: `docente_cancela_${rnd}`,
      subjectIds: [subjectId],
      scheduleSlotIds: [slotId]
    });
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const tut = CreateTutoringUseCase.execute(
      {
        subject: 'Prueba conserva espacio',
        details: 'detalle de prueba de cancelación',
        reservDate: d.toISOString().split('T')[0],
        scheduleSlotId: slotId,
        subjectCourseId: subjectId,
        teacherId: teacher.id,
        modality: TutoringModality.PRESENCIAL,
        type: TutoringType.INDIVIDUAL,
      },
      petitioner
    );
    try {
      const approved = ApproveTutoringUseCase.execute(
        { tutoringId: tut.id, space: 'Aula 7', block: 'B7' },
        teacher
      );
      const cancelled = CancelTutoringUseCase.execute(
        { tutoringId: tut.id, reason: 'Motivo de prueba detallado' },
        petitioner
      );
      if (cancelled.space !== 'Aula 7') throw new Error('La cancelación no debe sobrescribir el espacio asignado');
      if (cancelled.block !== 'B7') throw new Error('La cancelación no debe borrar el bloque asignado');
      if (cancelled.cancelReason !== 'Motivo de prueba detallado') throw new Error('Debe guardar el motivo por separado');
      void approved;
      let threw = false;
      try {
        CancelTutoringUseCase.execute({ tutoringId: tut.id, reason: 'Segundo intento de prueba' }, petitioner);
      } catch (e: any) {
        threw = true;
      }
      if (!threw) throw new Error('No debe permitir cancelar dos veces');
    } finally {
      const i = db.tutorings.findIndex((t) => t.id === tut.id);
      if (i >= 0) db.tutorings.splice(i, 1);
      const ti = db.users.findIndex((u) => u.id === teacher.id);
      if (ti >= 0) db.users.splice(ti, 1);
    }
  });

  // 15. Calificación por participante con promedio
  test('Calificación: invitado y solicitante califican, se promedia; ajeno es rechazado', () => {
    const rnd = Date.now() + 4;
    const petitioner = db.users.find((u) => u.id === 'usr-student-1')!;
    const guest = db.users.find((u) => u.id === 'usr-student-2')!;
    const subject = db.subjects.find(
      (s) => Number(s.semester) === Number(guest.semester) && s.careerId === guest.careerId
    ) || db.subjects[0];
    const slotId = db.scheduleSlots[5].id;
    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Eval Prueba ${rnd}`,
      email: `eval.${rnd}@gt.edu`,
      account: `EVL-${rnd}`,
      username: `docente_eval_${rnd}`,
      subjectIds: [subject.id],
      scheduleSlotIds: [slotId]
    });
    const outsider = RegisterStudentUseCase.execute({
      fullName: 'Estudiante Ajeno de Prueba',
      email: `ajeno.${rnd}@gt.edu`,
      account: `AJN-${rnd}`,
      careerId: guest.careerId,
      semester: 9,
      username: `est_ajeno_${rnd}`,
      password: 'Clave1234'
    });
    const d = new Date();
    d.setDate(d.getDate() + 11);
    const tut = CreateTutoringUseCase.execute(
      {
        subject: 'Prueba calificación grupal',
        details: 'detalle de prueba de calificación',
        reservDate: d.toISOString().split('T')[0],
        scheduleSlotId: slotId,
        subjectCourseId: subject.id,
        teacherId: teacher.id,
        modality: TutoringModality.PRESENCIAL,
        type: TutoringType.GROUP,
      },
      petitioner
    );
    try {
      JoinTutoringUseCase.execute(tut.id, guest);
      ApproveTutoringUseCase.execute({ tutoringId: tut.id, space: 'Aula 77', block: 'B7', maxParticipants: 2 }, teacher);
      StartTutoringUseCase.execute(tut.id, teacher);
      FinishTutoringUseCase.execute(tut.id, teacher, 'buena sesión');

      const afterGuest = RateTutoringUseCase.execute(
        { tutoringId: tut.id, score: 4, studentComment: 'Me sirvió bastante la explicación' },
        guest
      );
      if (afterGuest.score !== 4) throw new Error('La primera calificación debería reflejarse');
      const afterBoth = RateTutoringUseCase.execute(
        { tutoringId: tut.id, score: 5, studentComment: 'Excelente tutoría grupal de repaso' },
        petitioner
      );
      if (afterBoth.score !== 4.5) throw new Error(`El promedio debería ser 4.5, se obtuvo ${afterBoth.score}`);
      if ((afterBoth.ratings || []).length !== 2) throw new Error('Debería haber 2 calificaciones registradas');

      let threwOutsider = false;
      try {
        RateTutoringUseCase.execute(
          { tutoringId: tut.id, score: 5, studentComment: 'Intento de un estudiante ajeno' },
          outsider
        );
      } catch (e: any) {
        if (e.code === 'FORBIDDEN') threwOutsider = true;
      }
      if (!threwOutsider) throw new Error('Un no participante no debería poder calificar');

      let threwDup = false;
      try {
        RateTutoringUseCase.execute(
          { tutoringId: tut.id, score: 3, studentComment: 'Segunda calificación del invitado' },
          guest
        );
      } catch (e: any) {
        if (e.code === 'ALREADY_RATED') threwDup = true;
      }
      if (!threwDup) throw new Error('No debe permitir calificar dos veces al mismo participante');
    } finally {
      const i = db.tutorings.findIndex((t) => t.id === tut.id);
      if (i >= 0) db.tutorings.splice(i, 1);
      const ti = db.users.findIndex((u) => u.id === teacher.id);
      if (ti >= 0) db.users.splice(ti, 1);
      const oi = db.users.findIndex((u) => u.id === outsider.id);
      if (oi >= 0) db.users.splice(oi, 1);
    }
  });

  const passed = results.filter((r) => r.success).length;
  return { total: results.length, passed, results };
}
