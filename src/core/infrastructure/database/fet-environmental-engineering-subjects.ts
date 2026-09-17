import { SubjectCourse } from '../../types';
import { FetSubjectItem } from './fet-software-engineering-subjects';

const code = (sem: number, n: number) => `IA-${sem}${String(n).padStart(2, '0')}`;

export const FET_ENVIRONMENTAL_ENGINEERING_CURRICULUM: FetSubjectItem[] = [
  // 1 SEMESTRE
  { semester: 1, name: 'Matemática Fundamental', code: code(1, 1), credits: 2 },
  { semester: 1, name: 'Biología', code: code(1, 2), credits: 2 },
  { semester: 1, name: 'Ecología y Biodiversidad', code: code(1, 3), credits: 3 },
  { semester: 1, name: 'Introducción a la Ingeniería Ambiental', code: code(1, 4), credits: 2 },
  { semester: 1, name: 'Identidad FET', code: code(1, 5), credits: 2 },
  { semester: 1, name: 'Técnicas de la Comunicación', code: code(1, 6), credits: 2 },
  { semester: 1, name: 'Inglés I', code: code(1, 7), credits: 2 },
  { semester: 1, name: 'Herramientas TIC', code: code(1, 8), credits: 2 },

  // 2 SEMESTRE
  { semester: 2, name: 'Física I', code: code(2, 1), credits: 2 },
  { semester: 2, name: 'Química Inorgánica', code: code(2, 2), credits: 2 },
  { semester: 2, name: 'Estadística y Probabilidad', code: code(2, 3), credits: 2 },
  { semester: 2, name: 'Ambientes Acuáticos', code: code(2, 4), credits: 3 },
  { semester: 2, name: 'Microbiología', code: code(2, 5), credits: 2 },
  { semester: 2, name: 'Dibujo Técnico', code: code(2, 6), credits: 2 },
  { semester: 2, name: 'Legislación Ambiental', code: code(2, 7), credits: 2 },
  { semester: 2, name: 'Electiva I', code: code(2, 8), credits: 2 },
  { semester: 2, name: 'Epistemología', code: code(2, 9), credits: 2 },

  // 3 SEMESTRE
  { semester: 3, name: 'Diagnóstico Ambiental', code: code(3, 1), credits: 2 },
  { semester: 3, name: 'Álgebra Lineal', code: code(3, 2), credits: 2 },
  { semester: 3, name: 'Física II', code: code(3, 3), credits: 2 },
  { semester: 3, name: 'Química Orgánica', code: code(3, 4), credits: 2 },
  { semester: 3, name: 'Hidrología', code: code(3, 5), credits: 2 },
  { semester: 3, name: 'Monitoreo del Suelo', code: code(3, 6), credits: 2 },
  { semester: 3, name: 'Climatología', code: code(3, 7), credits: 2 },
  { semester: 3, name: 'Monitoreo del Aire', code: code(3, 8), credits: 2 },
  { semester: 3, name: 'Metodología de la Investigación', code: code(3, 9), credits: 2 },
  { semester: 3, name: 'Emprendimiento I', code: code(3, 10), credits: 2 },

  // 4 SEMESTRE
  { semester: 4, name: 'Topografía y Levantamiento Cartográfico', code: code(4, 1), credits: 3 },
  { semester: 4, name: 'Cálculo Diferencial', code: code(4, 2), credits: 2 },
  { semester: 4, name: 'Residuos Sólidos', code: code(4, 3), credits: 2 },
  { semester: 4, name: 'Monitoreo del Agua', code: code(4, 4), credits: 2 },
  { semester: 4, name: 'Monitoreo de Flora y Fauna', code: code(4, 5), credits: 2 },
  { semester: 4, name: 'Opción de Grado I', code: code(4, 6), credits: 3 },
  { semester: 4, name: 'Optativa I', code: code(4, 7), credits: 2 },
  { semester: 4, name: 'Inglés II', code: code(4, 8), credits: 2 },

  // 5 SEMESTRE
  { semester: 5, name: 'Cálculo Integral', code: code(5, 1), credits: 2 },
  { semester: 5, name: 'Química Ambiental', code: code(5, 2), credits: 2 },
  { semester: 5, name: 'Evaluación de Impacto Ambiental', code: code(5, 3), credits: 3 },
  { semester: 5, name: 'Geología', code: code(5, 4), credits: 3 },
  { semester: 5, name: 'Optativa II', code: code(5, 5), credits: 2 },
  { semester: 5, name: 'Electiva II', code: code(5, 6), credits: 2 },
  { semester: 5, name: 'Emprendimiento II', code: code(5, 7), credits: 2 },
  { semester: 5, name: 'Inglés III', code: code(5, 8), credits: 2 },

  // 6 SEMESTRE
  { semester: 6, name: 'Comunidades', code: code(6, 1), credits: 2 },
  { semester: 6, name: 'Cálculo Multivariado', code: code(6, 2), credits: 2 },
  { semester: 6, name: 'Mecánica de Fluidos', code: code(6, 3), credits: 2 },
  { semester: 6, name: 'Ordenamiento Territorial', code: code(6, 4), credits: 2 },
  { semester: 6, name: 'Control de Contaminación Ambiental', code: code(6, 5), credits: 2 },
  { semester: 6, name: 'Educación Ambiental', code: code(6, 6), credits: 2 },
  { semester: 6, name: 'Gestión del Riesgo', code: code(6, 7), credits: 2 },
  { semester: 6, name: 'Opción de Grado II', code: code(6, 8), credits: 3 },

  // 7 SEMESTRE
  { semester: 7, name: 'Ecuaciones Diferenciales', code: code(7, 1), credits: 2 },
  { semester: 7, name: 'Balance de Materia y Energía', code: code(7, 2), credits: 2 },
  { semester: 7, name: 'Termodinámica', code: code(7, 3), credits: 2 },
  { semester: 7, name: 'Biorremediación', code: code(7, 4), credits: 2 },
  { semester: 7, name: 'Ecosistemas Estratégicos', code: code(7, 5), credits: 2 },
  { semester: 7, name: 'Ética Profesional', code: code(7, 6), credits: 2 },
  { semester: 7, name: 'Formulación y Evaluación de Proyectos', code: code(7, 7), credits: 2 },
  { semester: 7, name: 'Inglés Técnico I', code: code(7, 8), credits: 2 },

  // 8 SEMESTRE
  { semester: 8, name: 'Operaciones Unitarias', code: code(8, 1), credits: 2 },
  { semester: 8, name: 'Sistema de Disposición Final de Residuos', code: code(8, 2), credits: 2 },
  { semester: 8, name: 'Sistema de Información Geográfica', code: code(8, 3), credits: 3 },
  { semester: 8, name: 'Optativa III', code: code(8, 4), credits: 2 },
  { semester: 8, name: 'Gerencia Ambiental', code: code(8, 5), credits: 2 },
  { semester: 8, name: 'Electiva III', code: code(8, 6), credits: 2 },
  { semester: 8, name: 'Emprendimiento III', code: code(8, 7), credits: 2 },

  // 9 SEMESTRE
  { semester: 9, name: 'Hidráulica', code: code(9, 1), credits: 3 },
  { semester: 9, name: 'Plantas de Tratamiento de Aguas', code: code(9, 2), credits: 3 },
  { semester: 9, name: 'Sistemas de Gestión Ambiental', code: code(9, 3), credits: 3 },
  { semester: 9, name: 'Modelamiento', code: code(9, 4), credits: 3 },
  { semester: 9, name: 'Desarrollo Ambiental Sostenible', code: code(9, 5), credits: 2 },
  { semester: 9, name: 'Optativa IV', code: code(9, 6), credits: 2 },

  // 10 SEMESTRE
  { semester: 10, name: 'Práctica Profesional', code: code(10, 1), credits: 12 },
  { semester: 10, name: 'Opción de Grado III', code: code(10, 2), credits: 3 }
];

export const INITIAL_FET_SUBJECTS_ENVIRONMENTAL: SubjectCourse[] = FET_ENVIRONMENTAL_ENGINEERING_CURRICULUM.map((item, index) => ({
  id: `sub-fet-environmental-${index + 1}`,
  name: item.name,
  code: item.code,
  credits: item.credits || 0,
  semester: item.semester,
  careerId: 'car-fet-environmental',
  careerName: 'Ingeniería Ambiental',
  isActive: true
}));