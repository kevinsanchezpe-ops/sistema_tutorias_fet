/**
 * Pruebas unitarias de invariantes y reglas de negocio del Sistema GT.
 * Verifica que todas las reglas extraídas del sistema PHP original se cumplan fielmente.
 */

import { ApproveTutoringUseCase } from '../application/use-cases/approve-tutoring.use-case';
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
import { TutoringModality, TutoringStatus, UserRole } from '../types';

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
        phone: '123456',
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
      phone: '+504 9999-0000',
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
      phone: '+504 9999-0001',
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
          modality: TutoringModality.VIRTUAL
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
            modality: TutoringModality.VIRTUAL
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
    const subjectId = db.subjects[0].id;
    const slotId = db.scheduleSlots[0].id;

    const teacher = RegisterTeacherUseCase.execute({
      fullName: `Ing. Cupo Prueba ${rnd}`,
      email: `cupo.${rnd}@gt.edu`,
      phone: '+504 9999-0002',
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
          modality: TutoringModality.PRESENCIAL
        },
        student1
      );
      created.push(tut.id);

      ApproveTutoringUseCase.execute({ tutoringId: tut.id, space: section.name }, teacher);

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

  const passed = results.filter((r) => r.success).length;
  return { total: results.length, passed, results };
}
