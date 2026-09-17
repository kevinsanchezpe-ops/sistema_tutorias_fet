import { SubjectCourse } from '../../types';
import { FetSubjectItem } from './fet-software-engineering-subjects';

const code = (sem: number, n: number) => `SS-${sem}${String(n).padStart(2, '0')}`;

export const FET_SST_CURRICULUM: FetSubjectItem[] = [
  // 1 SEMESTRE
  { semester: 1, name: 'Matemática Fundamental', code: code(1, 1), credits: 2 },
  { semester: 1, name: 'Herramientas TIC', code: code(1, 2), credits: 2 },
  { semester: 1, name: 'Introducción a la Administración', code: code(1, 3), credits: 2 },
  { semester: 1, name: 'Introducción a la Economía', code: code(1, 4), credits: 2 },
  { semester: 1, name: 'Introducción a la Higiene y Seguridad Industrial', code: code(1, 5), credits: 2 },
  { semester: 1, name: 'Gestión de la Calidad', code: code(1, 6), credits: 2 },
  { semester: 1, name: 'Identidad FET', code: code(1, 7), credits: 2 },
  { semester: 1, name: 'Técnicas de la Comunicación', code: code(1, 8), credits: 2 },
  { semester: 1, name: 'Inglés I', code: code(1, 9), credits: 2 },

  // 2 SEMESTRE
  { semester: 2, name: 'Física', code: code(2, 1), credits: 2 },
  { semester: 2, name: 'Gestión Administrativa', code: code(2, 2), credits: 2 },
  { semester: 2, name: 'Legislación en Seguridad y Salud en el Trabajo', code: code(2, 3), credits: 3 },
  { semester: 2, name: 'Contabilidad General', code: code(2, 4), credits: 2 },
  { semester: 2, name: 'Higiene Industrial', code: code(2, 5), credits: 2 },
  { semester: 2, name: 'Seguridad Industrial', code: code(2, 6), credits: 2 },
  { semester: 2, name: 'Gestión Ambiental', code: code(2, 7), credits: 2 },
  { semester: 2, name: 'Optativa I', code: code(2, 8), credits: 2 },
  { semester: 2, name: 'Epistemología', code: code(2, 9), credits: 2 },

  // 3 SEMESTRE
  { semester: 3, name: 'Bioquímica', code: code(3, 1), credits: 2 },
  { semester: 3, name: 'Habilidades Gerenciales', code: code(3, 2), credits: 3 },
  { semester: 3, name: 'Anatomía y Fisiología', code: code(3, 3), credits: 2 },
  { semester: 3, name: 'Riesgos Químicos', code: code(3, 4), credits: 2 },
  { semester: 3, name: 'Gestión en Seguridad y Salud en el Trabajo', code: code(3, 5), credits: 2 },
  { semester: 3, name: 'Electiva I', code: code(3, 6), credits: 2 },
  { semester: 3, name: 'Emprendimiento I', code: code(3, 7), credits: 2 },

  // 4 SEMESTRE
  { semester: 4, name: 'Administración del Talento Humano', code: code(4, 1), credits: 2 },
  { semester: 4, name: 'Costos y Presupuestos', code: code(4, 2), credits: 3 },
  { semester: 4, name: 'Ergonomía', code: code(4, 3), credits: 3 },
  { semester: 4, name: 'Identificación y Valoración de Riesgos', code: code(4, 4), credits: 2 },
  { semester: 4, name: 'Sistemas Integrados de Gestión', code: code(4, 5), credits: 2 },
  { semester: 4, name: 'Control de Incendios y Manejo de Extintores', code: code(4, 6), credits: 2 },
  { semester: 4, name: 'Inglés II', code: code(4, 7), credits: 2 },

  // 5 SEMESTRE
  { semester: 5, name: 'Estadística y Probabilidad', code: code(5, 1), credits: 2 },
  { semester: 5, name: 'Análisis Financiero', code: code(5, 2), credits: 2 },
  { semester: 5, name: 'Fundamentos de Marketing', code: code(5, 3), credits: 2 },
  { semester: 5, name: 'Priorización de Riesgos Laborales', code: code(5, 4), credits: 2 },
  { semester: 5, name: 'Auditoría en Riesgos Laborales', code: code(5, 5), credits: 2 },
  { semester: 5, name: 'Epidemiología', code: code(5, 6), credits: 2 },
  { semester: 5, name: 'Metodología de Investigación', code: code(5, 7), credits: 2 },
  { semester: 5, name: 'Electiva II', code: code(5, 8), credits: 2 },
  { semester: 5, name: 'Emprendimiento II', code: code(5, 9), credits: 2 },
  { semester: 5, name: 'Inglés II', code: code(5, 10), credits: 2 },

  // 6 SEMESTRE
  { semester: 6, name: 'Sistemas Administrativos de Gestión', code: code(6, 1), credits: 3 },
  { semester: 6, name: 'Gestión de Riesgos', code: code(6, 2), credits: 2 },
  { semester: 6, name: 'Diseño y Estructura de Programas en Seguridad y Salud en el Trabajo', code: code(6, 3), credits: 3 },
  { semester: 6, name: 'Medicina Preventiva y del Trabajo', code: code(6, 4), credits: 3 },
  { semester: 6, name: 'Optativa II', code: code(6, 5), credits: 2 },
  { semester: 6, name: 'Opción de Grado', code: code(6, 6), credits: 3 },

  // 7 SEMESTRE
  { semester: 7, name: 'Álgebra Lineal', code: code(7, 1), credits: 2 },
  { semester: 7, name: 'Dibujo Técnico', code: code(7, 2), credits: 2 },
  { semester: 7, name: 'Control Total de Pérdidas', code: code(7, 3), credits: 3 },
  { semester: 7, name: 'Gestión de la Producción y los Servicios', code: code(7, 4), credits: 2 },
  { semester: 7, name: 'Riesgos de la Industria Minera y Petrolera', code: code(7, 5), credits: 2 },
  { semester: 7, name: 'Ética Profesional', code: code(7, 6), credits: 2 },
  { semester: 7, name: 'Formulación y Evaluación de Proyectos', code: code(7, 7), credits: 2 },
  { semester: 7, name: 'Inglés IV', code: code(7, 8), credits: 2 },

  // 8 SEMESTRE
  { semester: 8, name: 'Situación de Discapacidad en el Entorno Laboral', code: code(8, 1), credits: 2 },
  { semester: 8, name: 'Riesgos Psicosociales', code: code(8, 2), credits: 2 },
  { semester: 8, name: 'Gerencia del Talento Humano', code: code(8, 3), credits: 3 },
  { semester: 8, name: 'Optativa III', code: code(8, 4), credits: 2 },
  { semester: 8, name: 'Gestión Ambiental y Saneamiento Básico', code: code(8, 5), credits: 2 },
  { semester: 8, name: 'Planes y Brigadas de Emergencia', code: code(8, 6), credits: 2 },
  { semester: 8, name: 'Riesgos de la Agroindustria', code: code(8, 7), credits: 2 },
  { semester: 8, name: 'Emprendimiento III', code: code(8, 8), credits: 2 },

  // 9 SEMESTRE
  { semester: 9, name: 'Gerencia de la Seguridad y Salud en el Trabajo', code: code(9, 1), credits: 3 },
  { semester: 9, name: 'Gerencia de Mercadeo', code: code(9, 2), credits: 3 },
  { semester: 9, name: 'Optativa IV', code: code(9, 3), credits: 2 },
  { semester: 9, name: 'Riesgos Mecánicos y Eléctricos', code: code(9, 4), credits: 2 },
  { semester: 9, name: 'Riesgos de la Construcción', code: code(9, 5), credits: 2 },
  { semester: 9, name: 'Electiva III', code: code(9, 6), credits: 2 },

  // 10 SEMESTRE
  { semester: 10, name: 'Práctica Profesional', code: code(10, 1), credits: 12 },
  { semester: 10, name: 'Opción de Grado', code: code(10, 2), credits: 3 }
];

export const INITIAL_FET_SUBJECTS_SST: SubjectCourse[] = FET_SST_CURRICULUM.map((item, index) => ({
  id: `sub-fet-sst-${index + 1}`,
  name: item.name,
  code: item.code,
  credits: item.credits || 0,
  semester: item.semester,
  careerId: 'car-fet-sst',
  careerName: 'Administración de la Seguridad y Salud en el Trabajo',
  isActive: true
}));