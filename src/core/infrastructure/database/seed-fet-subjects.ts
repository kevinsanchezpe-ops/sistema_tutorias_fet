import { getPgPool } from './pg-pool';
import { INITIAL_FET_SUBJECTS } from './fet-software-engineering-subjects';

export async function seedFetCurriculum(): Promise<void> {
  const pool = await getPgPool();

  console.log(`📚 [FET] Sincronizando pénsum de Ingeniería de Software (${INITIAL_FET_SUBJECTS.length} asignaturas)...`);

  for (const s of INITIAL_FET_SUBJECTS) {
    await pool.query(
      `INSERT INTO subjects (id, name, code, credits, career_id, career_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE 
       SET name = EXCLUDED.name, 
           code = EXCLUDED.code, 
           career_name = EXCLUDED.career_name,
           career_id = EXCLUDED.career_id,
           is_active = true;`,
      [s.id, s.name, s.code || '', s.credits || 0, s.careerId, s.careerName, true]
    );
  }

  // Desactivar o limpiar asignaturas viejas demo que no son del pénsum oficial
  await pool.query(
    `UPDATE subjects SET is_active = false 
     WHERE id NOT LIKE 'sub-fet-%';`
  );

  console.log('✅ [FET] Pénsum de Ingeniería de Software sincronizado con éxito.');
}
