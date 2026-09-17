import { SubjectCourse } from '../../types';
import { FetSubjectItem } from './fet-software-engineering-subjects';

const code = (sem: number, n: number) => `AL-${sem}${String(n).padStart(2, '0')}`;

export const FET_FOOD_ENGINEERING_CURRICULUM: FetSubjectItem[] = [
  // 1 SEMESTRE
  { semester: 1, name: 'Matemática Fundamental', code: code(1, 1), credits: 2 },
  { semester: 1, name: 'Biología', code: code(1, 2), credits: 2 },
  { semester: 1, name: 'Química General', code: code(1, 3), credits: 2 },
  { semester: 1, name: 'Introducción a la Ingeniería de Alimentos', code: code(1, 4), credits: 2 },
  { semester: 1, name: 'Sistema de Aseguramiento de la Calidad', code: code(1, 5), credits: 2 },
  { semester: 1, name: 'Identidad FET', code: code(1, 6), credits: 2 },
  { semester: 1, name: 'Técnicas de la Comunicación', code: code(1, 7), credits: 2 },
  { semester: 1, name: 'Inglés I', code: code(1, 8), credits: 2 },
  { semester: 1, name: 'Herramientas TIC', code: code(1, 9), credits: 2 },

  // 2 SEMESTRE
  { semester: 2, name: 'Física I', code: code(2, 1), credits: 2 },
  { semester: 2, name: 'Química Analítica', code: code(2, 2), credits: 3 },
  { semester: 2, name: 'Estadística y Probabilidad', code: code(2, 3), credits: 2 },
  { semester: 2, name: 'Dibujo Técnico', code: code(2, 4), credits: 2 },
  { semester: 2, name: 'Gestión de la Calidad de Alimentos', code: code(2, 5), credits: 3 },
  { semester: 2, name: 'Buenas Prácticas de Manufactura', code: code(2, 6), credits: 2 },
  { semester: 2, name: 'Electiva I', code: code(2, 7), credits: 2 },
  { semester: 2, name: 'Epistemología', code: code(2, 8), credits: 2 },

  // 3 SEMESTRE
  { semester: 3, name: 'Evaluación Sensorial', code: code(3, 1), credits: 2 },
  { semester: 3, name: 'Álgebra Lineal', code: code(3, 2), credits: 2 },
  { semester: 3, name: 'Física II', code: code(3, 3), credits: 2 },
  { semester: 3, name: 'Bioquímica', code: code(3, 4), credits: 2 },
  { semester: 3, name: 'Microbiología', code: code(3, 5), credits: 2 },
  { semester: 3, name: 'Materias Primas Agropecuarias', code: code(3, 6), credits: 2 },
  { semester: 3, name: 'Conservación y Vida Útil de Alimentos', code: code(3, 7), credits: 2 },
  { semester: 3, name: 'Metodología de la Investigación', code: code(3, 8), credits: 2 },
  { semester: 3, name: 'Emprendimiento I', code: code(3, 9), credits: 2 },

  // 4 SEMESTRE
  { semester: 4, name: 'Termodinámica', code: code(4, 1), credits: 2 },
  { semester: 4, name: 'Cálculo Diferencial', code: code(4, 2), credits: 2 },
  { semester: 4, name: 'Química Orgánica', code: code(4, 3), credits: 2 },
  { semester: 4, name: 'Análisis de Alimentos', code: code(4, 4), credits: 2 },
  { semester: 4, name: 'Maquinaria y Equipos', code: code(4, 5), credits: 1 },
  { semester: 4, name: 'Empaques y Embalajes', code: code(4, 6), credits: 2 },
  { semester: 4, name: 'Opción de Grado I', code: code(4, 7), credits: 3 },
  { semester: 4, name: 'Optativa I', code: code(4, 8), credits: 2 },
  { semester: 4, name: 'Inglés II', code: code(4, 9), credits: 2 },

  // 5 SEMESTRE
  { semester: 5, name: 'Cálculo Integral', code: code(5, 1), credits: 2 },
  { semester: 5, name: 'Fisicoquímica', code: code(5, 2), credits: 2 },
  { semester: 5, name: 'Balance de Materia y Energía', code: code(5, 3), credits: 2 },
  { semester: 5, name: 'Proceso de Frutas y Verduras', code: code(5, 4), credits: 3 },
  { semester: 5, name: 'Proceso de Cereales', code: code(5, 5), credits: 3 },
  { semester: 5, name: 'Electiva II', code: code(5, 6), credits: 2 },
  { semester: 5, name: 'Emprendimiento II', code: code(5, 7), credits: 2 },
  { semester: 5, name: 'Inglés III', code: code(5, 8), credits: 2 },

  // 6 SEMESTRE
  { semester: 6, name: 'Ingeniería de Bioprocesos', code: code(6, 1), credits: 2 },
  { semester: 6, name: 'Cálculo Multivariado', code: code(6, 2), credits: 2 },
  { semester: 6, name: 'Mecánica de Fluidos', code: code(6, 3), credits: 2 },
  { semester: 6, name: 'Procesos Cárnicos', code: code(6, 4), credits: 3 },
  { semester: 6, name: 'Legislación Alimentaria', code: code(6, 5), credits: 2 },
  { semester: 6, name: 'Procesos Lácteos', code: code(6, 6), credits: 3 },
  { semester: 6, name: 'Optativa II', code: code(6, 7), credits: 2 },
  { semester: 6, name: 'Opción de Grado II', code: code(6, 8), credits: 3 },

  // 7 SEMESTRE
  { semester: 7, name: 'Ecuaciones Diferenciales', code: code(7, 1), credits: 2 },
  { semester: 7, name: 'Química de Alimentos', code: code(7, 2), credits: 2 },
  { semester: 7, name: 'Operaciones Unitarias', code: code(7, 3), credits: 2 },
  { semester: 7, name: 'Transferencia de Calor', code: code(7, 4), credits: 3 },
  { semester: 7, name: 'Toxicología Alimentaria', code: code(7, 5), credits: 2 },
  { semester: 7, name: 'Ética Profesional', code: code(7, 6), credits: 2 },
  { semester: 7, name: 'Formulación y Evaluación de Proyectos', code: code(7, 7), credits: 2 },
  { semester: 7, name: 'Inglés Técnico I', code: code(7, 8), credits: 2 },

  // 8 SEMESTRE
  { semester: 8, name: 'Transferencia de Masa', code: code(8, 1), credits: 3 },
  { semester: 8, name: 'Diseño de Planta', code: code(8, 2), credits: 3 },
  { semester: 8, name: 'Nutrición', code: code(8, 3), credits: 3 },
  { semester: 8, name: 'Optativa IV', code: code(8, 4), credits: 2 },
  { semester: 8, name: 'Optativa III', code: code(8, 5), credits: 2 },
  { semester: 8, name: 'Electiva III', code: code(8, 6), credits: 2 },
  { semester: 8, name: 'Emprendimiento III', code: code(8, 7), credits: 2 },

  // 9 SEMESTRE
  { semester: 9, name: 'Práctica Profesional', code: code(9, 1), credits: 12 },
  { semester: 9, name: 'Opción de Grado III', code: code(9, 2), credits: 3 }
];

export const INITIAL_FET_SUBJECTS_FOOD: SubjectCourse[] = FET_FOOD_ENGINEERING_CURRICULUM.map((item, index) => ({
  id: `sub-fet-food-${index + 1}`,
  name: item.name,
  code: item.code,
  credits: item.credits || 0,
  semester: item.semester,
  careerId: 'car-fet-food',
  careerName: 'Ingeniería de Alimentos',
  isActive: true
}));