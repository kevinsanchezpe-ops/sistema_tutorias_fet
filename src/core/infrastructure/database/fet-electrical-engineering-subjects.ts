import { SubjectCourse } from '../../types';
import { FetSubjectItem } from './fet-software-engineering-subjects';

const code = (sem: number, n: number) => `IE-${sem}${String(n).padStart(2, '0')}`;

export const FET_ELECTRICAL_ENGINEERING_CURRICULUM: FetSubjectItem[] = [
  // 1 SEMESTRE
  { semester: 1, name: 'Matemáticas I', code: code(1, 1), credits: 2 },
  { semester: 1, name: 'Introducción a la I. Eléctrica', code: code(1, 2), credits: 2 },
  { semester: 1, name: 'Herramientas TIC\'s', code: code(1, 3), credits: 2 },
  { semester: 1, name: 'Dibujo Técnico', code: code(1, 4), credits: 2 },
  { semester: 1, name: 'Legislación Eléctrica', code: code(1, 5), credits: 2 },
  { semester: 1, name: 'Identidad FET', code: code(1, 6), credits: 2 },
  { semester: 1, name: 'Técnicas de la Comunicación', code: code(1, 7), credits: 2 },
  { semester: 1, name: 'Inglés I', code: code(1, 8), credits: 2 },

  // 2 SEMESTRE
  { semester: 2, name: 'Álgebra Lineal', code: code(2, 1), credits: 2 },
  { semester: 2, name: 'Física I', code: code(2, 2), credits: 2 },
  { semester: 2, name: 'Circuitos Eléctricos I TP', code: code(2, 3), credits: 3 },
  { semester: 2, name: 'Dibujo para Ingeniería', code: code(2, 4), credits: 2 },
  { semester: 2, name: 'Optativa Técnica I', code: code(2, 5), credits: 2 },
  { semester: 2, name: 'Epistemología', code: code(2, 6), credits: 2 },
  { semester: 2, name: 'Inglés II', code: code(2, 7), credits: 2 },

  // 3 SEMESTRE
  { semester: 3, name: 'Física II', code: code(3, 1), credits: 2 },
  { semester: 3, name: 'Algoritmos y Programación', code: code(3, 2), credits: 2 },
  { semester: 3, name: 'Principios Básicos de Mantenimiento Eléctrico', code: code(3, 3), credits: 3 },
  { semester: 3, name: 'Instalaciones de Uso Final I TP', code: code(3, 4), credits: 4 },
  { semester: 3, name: 'Electiva I', code: code(3, 5), credits: 2 },
  { semester: 3, name: 'Metodología de la Investigación', code: code(3, 6), credits: 2 },

  // 4 SEMESTRE
  { semester: 4, name: 'Mecánica I (Propedéutica)', code: code(4, 1), credits: 2 },
  { semester: 4, name: 'Matemáticas II', code: code(4, 2), credits: 2 },
  { semester: 4, name: 'Introducción a las Redes de Distribución', code: code(4, 3), credits: 4 },
  { semester: 4, name: 'Instalaciones de Uso Final II TP', code: code(4, 4), credits: 4 },
  { semester: 4, name: 'Opción de Grado', code: code(4, 5), credits: 3 },
  { semester: 4, name: 'Alumbrado Público', code: code(4, 6), credits: 2 },
  { semester: 4, name: 'Optativa Técnica II', code: code(4, 7), credits: 2 },

  // 5 SEMESTRE
  { semester: 5, name: 'Liderazgo y Emprendimiento (Propedéutica)', code: code(5, 1), credits: 2 },
  { semester: 5, name: 'Matemáticas III', code: code(5, 2), credits: 2 },
  { semester: 5, name: 'Mecánica y Materiales', code: code(5, 3), credits: 2 },
  { semester: 5, name: 'Electromagnetismo I', code: code(5, 4), credits: 3 },
  { semester: 5, name: 'Resistencia de Materiales', code: code(5, 5), credits: 3 },
  { semester: 5, name: 'Circuitos Eléctricos II TP', code: code(5, 6), credits: 3 },
  { semester: 5, name: 'Optativa Tecnológica I', code: code(5, 7), credits: 2 },
  { semester: 5, name: 'Electiva II', code: code(5, 8), credits: 2 },
  { semester: 5, name: 'Inglés III', code: code(5, 9), credits: 2 },

  // 6 SEMESTRE
  { semester: 6, name: 'Inglés Técnico (Propedéutica)', code: code(6, 1), credits: 2 },
  { semester: 6, name: 'Matemáticas IV', code: code(6, 2), credits: 2 },
  { semester: 6, name: 'Electrónica I TP', code: code(6, 3), credits: 3 },
  { semester: 6, name: 'Energías Alternativas', code: code(6, 4), credits: 2 },
  { semester: 6, name: 'Gestión Eficiente y Calidad de la Energía Eléctrica', code: code(6, 5), credits: 2 },
  { semester: 6, name: 'Medidas e Instrumentación Eléctrica TP', code: code(6, 6), credits: 3 },
  { semester: 6, name: 'Opción de Grado', code: code(6, 7), credits: 2 },
  { semester: 6, name: 'Máquinas Eléctricas TP', code: code(6, 8), credits: 3 },
  { semester: 6, name: 'Optativa Tecnológica II', code: code(6, 9), credits: 2 },

  // 7 SEMESTRE
  { semester: 7, name: 'Ecuaciones Diferenciales', code: code(7, 1), credits: 2 },
  { semester: 7, name: 'Señales y Control', code: code(7, 2), credits: 2 },
  { semester: 7, name: 'Electrónica II TP', code: code(7, 3), credits: 3 },
  { semester: 7, name: 'Sistemas de Distribución de Energía', code: code(7, 4), credits: 2 },
  { semester: 7, name: 'Circuitos Eléctricos III', code: code(7, 5), credits: 2 },
  { semester: 7, name: 'Automatización', code: code(7, 6), credits: 2 },
  { semester: 7, name: 'Máquinas Eléctricas II TP', code: code(7, 7), credits: 3 },
  { semester: 7, name: 'Operaciones y Mantenimiento I', code: code(7, 8), credits: 2 },
  { semester: 7, name: 'Inglés IV', code: code(7, 9), credits: 2 },

  // 8 SEMESTRE
  { semester: 8, name: 'Matemáticas Discretas', code: code(8, 1), credits: 2 },
  { semester: 8, name: 'Simulación TP', code: code(8, 2), credits: 3 },
  { semester: 8, name: 'Estadística y Probabilidad', code: code(8, 3), credits: 2 },
  { semester: 8, name: 'Mecánica de Fluidos', code: code(8, 4), credits: 2 },
  { semester: 8, name: 'Sistemas de Transmisión de Energía', code: code(8, 5), credits: 2 },
  { semester: 8, name: 'Subestaciones Eléctricas', code: code(8, 6), credits: 2 },
  { semester: 8, name: 'Planeación Energética', code: code(8, 7), credits: 2 },
  { semester: 8, name: 'Optativa Profesional I', code: code(8, 8), credits: 2 },
  { semester: 8, name: 'Formulación y Evaluación de Proyectos', code: code(8, 9), credits: 2 },

  // 9 SEMESTRE
  { semester: 9, name: 'Métodos Numéricos', code: code(9, 1), credits: 2 },
  { semester: 9, name: 'Análisis de Sistemas de Potencia', code: code(9, 2), credits: 3 },
  { semester: 9, name: 'Operaciones y Mantenimiento II', code: code(9, 3), credits: 2 },
  { semester: 9, name: 'Generación Hidráulica', code: code(9, 4), credits: 2 },
  { semester: 9, name: 'Generación Térmica', code: code(9, 5), credits: 2 },
  { semester: 9, name: 'Optativa Profesional II', code: code(9, 6), credits: 2 },
  { semester: 9, name: 'Ética Profesional', code: code(9, 7), credits: 2 },
  { semester: 9, name: 'Electiva III', code: code(9, 8), credits: 2 },

  // 10 SEMESTRE
  { semester: 10, name: 'Opción de Grado', code: code(10, 1), credits: 3 },
  { semester: 10, name: 'Práctica Profesional', code: code(10, 2), credits: 12 }
];

export const INITIAL_FET_SUBJECTS_ELECTRICAL: SubjectCourse[] = FET_ELECTRICAL_ENGINEERING_CURRICULUM.map((item, index) => ({
  id: `sub-fet-electrical-${index + 1}`,
  name: item.name,
  code: item.code,
  credits: item.credits || 0,
  semester: item.semester,
  careerId: 'car-fet-electrical',
  careerName: 'Ingeniería Eléctrica',
  isActive: true
}));