import { getPgPool } from './pg-pool';
import { SubjectCourse } from '../../types';
import { INITIAL_FET_SUBJECTS } from './fet-software-engineering-subjects';
import { INITIAL_FET_SUBJECTS_ELECTRICAL } from './fet-electrical-engineering-subjects';
import { INITIAL_FET_SUBJECTS_ENVIRONMENTAL } from './fet-environmental-engineering-subjects';
import { INITIAL_FET_SUBJECTS_FOOD } from './fet-food-engineering-subjects';
import { INITIAL_FET_SUBJECTS_SST } from './fet-sst-subjects';

interface CurriculumSeeds {
  careerName: string;
  subjects: SubjectCourse[];
}

const CURRICULA: CurriculumSeeds[] = [
  { careerName: 'Ingeniería de Software', subjects: INITIAL_FET_SUBJECTS },
  { careerName: 'Ingeniería Eléctrica', subjects: INITIAL_FET_SUBJECTS_ELECTRICAL },
  { careerName: 'Ingeniería Ambiental', subjects: INITIAL_FET_SUBJECTS_ENVIRONMENTAL },
  { careerName: 'Ingeniería de Alimentos', subjects: INITIAL_FET_SUBJECTS_FOOD },
  { careerName: 'Administración de la Seguridad y Salud en el Trabajo', subjects: INITIAL_FET_SUBJECTS_SST }
];

export async function seedCurriculums(): Promise<void> {
  const pool = await getPgPool();

  const total = CURRICULA.reduce((acc, c) => acc + c.subjects.length, 0);
  console.log(`📚 [FET] Sincronizando pénsum oficial de las 5 carreras (${total} asignaturas)...`);

  for (const cur of CURRICULA) {
    for (const s of cur.subjects) {
      await pool.query(
        `INSERT INTO subjects (id, name, code, credits, semester, career_id, career_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (id) DO UPDATE 
         SET name = EXCLUDED.name, 
             code = EXCLUDED.code, 
             credits = EXCLUDED.credits,
             semester = EXCLUDED.semester,
             career_name = EXCLUDED.career_name,
             career_id = EXCLUDED.career_id,
             is_active = true;`,
        [s.id, s.name, s.code || '', s.credits || 0, s.semester || 0, s.careerId, s.careerName]
      );
    }
  }

  // Desactivar asignaturas demo antiguas que no pertenecen al pénsum oficial FET
  await pool.query(
    `UPDATE subjects SET is_active = false 
     WHERE id NOT LIKE 'sub-fet-%';`
  );

  console.log('✅ [FET] Pénsum oficial sincronizado con éxito.');
}