/**
 * Runner para `npm test`: ejecuta las pruebas de reglas de negocio
 * contra el camino REAL (PostgreSQL). Requiere la BD configurada en .env.
 */

import { runPostgresBusinessRulesTests } from './postgres-business-rules.test';

(async () => {
  console.log('Ejecutando pruebas de reglas de negocio sobre PostgreSQL...');
  const t0 = Date.now();
  try {
    const output = await runPostgresBusinessRulesTests();
    output.results.forEach((r) =>
      console.log(`${r.success ? '✅' : '❌'} ${r.name}${r.success ? '' : ` — ${r.message}`}`)
    );
    console.log(`\nResultado: ${output.passed}/${output.total} en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    process.exit(output.passed === output.total ? 0 : 1);
  } catch (err: any) {
    console.error('❌ No se pudieron ejecutar los tests (¿PostgreSQL activo?):', err?.message || err);
    process.exit(1);
  }
})();