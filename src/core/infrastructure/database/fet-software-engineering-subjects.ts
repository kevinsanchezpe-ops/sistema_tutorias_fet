import { SubjectCourse } from '../../types';

export interface FetSubjectItem {
  semester: number;
  name: string;
  code: string;
}

export const FET_SOFTWARE_ENGINEERING_CURRICULUM: FetSubjectItem[] = [
  // 1 SEMESTRE
  { semester: 1, name: 'Matemática Fundamental', code: 'IS-101' },
  { semester: 1, name: 'Legislación Informática', code: 'IS-102' },
  { semester: 1, name: 'Lógica de Programación', code: 'IS-103' },
  { semester: 1, name: 'Introducción a la Ingeniería de Software', code: 'IS-104' },
  { semester: 1, name: 'Arquitectura de Computadores', code: 'IS-105' },
  { semester: 1, name: 'Identidad FET', code: 'IS-106' },
  { semester: 1, name: 'Técnicas de la Comunicación', code: 'IS-107' },
  { semester: 1, name: 'Inglés I', code: 'IS-108' },

  // 2 SEMESTRE
  { semester: 2, name: 'Física I', code: 'IS-201' },
  { semester: 2, name: 'Interfaces I', code: 'IS-202' },
  { semester: 2, name: 'Ensamble y Mantenimiento de Computadores I', code: 'IS-203' },
  { semester: 2, name: 'Programación Orientada a Objetos', code: 'IS-204' },
  { semester: 2, name: 'Sistemas Operativos I', code: 'IS-205' },
  { semester: 2, name: 'Electiva I', code: 'IS-206' },
  { semester: 2, name: 'Epistemología', code: 'IS-207' },

  // 3 SEMESTRE
  { semester: 3, name: 'Álgebra Lineal', code: 'IS-301' },
  { semester: 3, name: 'Física II', code: 'IS-302' },
  { semester: 3, name: 'Estadística y Probabilidad', code: 'IS-303' },
  { semester: 3, name: 'Electrónica Básica', code: 'IS-304' },
  { semester: 3, name: 'Lenguaje de Programación I', code: 'IS-305' },
  { semester: 3, name: 'Introducción a las Bases de Datos', code: 'IS-306' },
  { semester: 3, name: 'Estructura de Datos', code: 'IS-307' },
  { semester: 3, name: 'Sistemas Operativos II', code: 'IS-308' },
  { semester: 3, name: 'Metodologías para el Desarrollo de Software', code: 'IS-309' },
  { semester: 3, name: 'Emprendimiento I', code: 'IS-310' },

  // 4 SEMESTRE
  { semester: 4, name: 'Cálculo Diferencial', code: 'IS-401' },
  { semester: 4, name: 'Lenguaje de Programación II', code: 'IS-402' },
  { semester: 4, name: 'Redes y Comunicaciones I', code: 'IS-403' },
  { semester: 4, name: 'Modelado de Bases de Datos', code: 'IS-404' },
  { semester: 4, name: 'Opción de Grado I', code: 'IS-405' },
  { semester: 4, name: 'Optativa I', code: 'IS-406' },
  { semester: 4, name: 'Electiva de Formación Complementaria', code: 'IS-407' },
  { semester: 4, name: 'Metodología de la Investigación', code: 'IS-408' },
  { semester: 4, name: 'Inglés II', code: 'IS-409' },

  // 5 SEMESTRE
  { semester: 5, name: 'Cálculo Integral', code: 'IS-501' },
  { semester: 5, name: 'Lenguaje de Programación III', code: 'IS-502' },
  { semester: 5, name: 'Redes y Comunicaciones II', code: 'IS-503' },
  { semester: 5, name: 'Motores de Bases de Datos', code: 'IS-504' },
  { semester: 5, name: 'Administración de Información', code: 'IS-505' },
  { semester: 5, name: 'Análisis y Diseño de Sistemas de Información', code: 'IS-506' },
  { semester: 5, name: 'Electiva II', code: 'IS-507' },
  { semester: 5, name: 'Emprendimiento II', code: 'IS-508' },
  { semester: 5, name: 'Inglés III', code: 'IS-509' },

  // 6 SEMESTRE
  { semester: 6, name: 'Cálculo Multivariado', code: 'IS-601' },
  { semester: 6, name: 'Investigación de Operaciones', code: 'IS-602' },
  { semester: 6, name: 'Interfaces II', code: 'IS-603' },
  { semester: 6, name: 'Administración Avanzada en Redes', code: 'IS-604' },
  { semester: 6, name: 'Desarrollo de Apps', code: 'IS-605' },
  { semester: 6, name: 'Servidores y Servicios', code: 'IS-606' },
  { semester: 6, name: 'Opción de Grado II', code: 'IS-607' },
  { semester: 6, name: 'Optativa II', code: 'IS-608' },
  { semester: 6, name: 'Ingeniería de Software I', code: 'IS-609' },

  // 7 SEMESTRE
  { semester: 7, name: 'Ecuaciones Diferenciales', code: 'IS-701' },
  { semester: 7, name: 'Sistemas Distribuidos', code: 'IS-702' },
  { semester: 7, name: 'Seguridad Informática', code: 'IS-703' },
  { semester: 7, name: 'Telemática', code: 'IS-704' },
  { semester: 7, name: 'Optativa III', code: 'IS-705' },
  { semester: 7, name: 'Ingeniería de Software II', code: 'IS-706' },
  { semester: 7, name: 'Ética Profesional', code: 'IS-707' },
  { semester: 7, name: 'Formulación y Evaluación de Proyectos', code: 'IS-708' },
  { semester: 7, name: 'Inglés Técnico', code: 'IS-709' },

  // 8 SEMESTRE
  { semester: 8, name: 'Simulación', code: 'IS-801' },
  { semester: 8, name: 'Matemáticas Discretas', code: 'IS-802' },
  { semester: 8, name: 'Programación Avanzada', code: 'IS-803' },
  { semester: 8, name: 'Sistemas Expertos', code: 'IS-804' },
  { semester: 8, name: 'Arquitectura de Software', code: 'IS-805' },
  { semester: 8, name: 'Electiva III', code: 'IS-806' },
  { semester: 8, name: 'Emprendimiento III', code: 'IS-807' },

  // 9 SEMESTRE
  { semester: 9, name: 'Métodos Numéricos', code: 'IS-901' },
  { semester: 9, name: 'Matemáticas Especiales', code: 'IS-902' },
  { semester: 9, name: 'Telecomunicaciones', code: 'IS-903' },
  { semester: 9, name: 'Auditoría de Sistemas', code: 'IS-904' },
  { semester: 9, name: 'Inteligencia Artificial', code: 'IS-905' },
  { semester: 9, name: 'Gestión de Proyectos de Software', code: 'IS-906' },
  { semester: 9, name: 'Optativa IV', code: 'IS-907' },

  // 10 SEMESTRE
  { semester: 10, name: 'Práctica Profesional', code: 'IS-1001' },
  { semester: 10, name: 'Opción de Grado III', code: 'IS-1002' }
];

export const INITIAL_FET_SUBJECTS: SubjectCourse[] = FET_SOFTWARE_ENGINEERING_CURRICULUM.map((item, index) => ({
  id: `sub-fet-${index + 1}`,
  name: item.name,
  code: item.code,
  credits: 0,
  careerId: 'car-fet-software',
  careerName: 'Ingeniería de Software (FET)',
  isActive: true
}));
