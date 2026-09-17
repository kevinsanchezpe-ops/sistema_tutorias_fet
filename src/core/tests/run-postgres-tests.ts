/**
 * Runner para `npm test`: ejecuta las pruebas de reglas de negocio
 * contra el camino REAL (PostgreSQL). Requiere la BD configurada en .env.
 */

import { initPostgres } from '../infrastructure/database/pg-init';
import { runPostgresBusinessRulesTests } from './postgres-business-rules.test';
import { runAuthzTests } from './authz.test';

(async () => {
  console.log('Ejecutando pruebas de reglas de negocio sobre PostgreSQL...');
  const t0 = Date.now();
  try {
    await initPostgres();
    const output = await runPostgresBusinessRulesTests();
    const results = [...output.results, ...runAuthzTests().results];
    results.forEach((r) =>
      console.log(`${r.success ? '✅' : '❌'} ${r.name}${r.success ? '' : ` — ${r.message}`}`)
    );
    const passed = results.filter((r) => r.success).length;
    console.log(`\nResultado: ${passed}/${results.length} en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    process.exit(passed === results.length ? 0 : 1);
  } catch (err: any) {
    console.error('❌ No se pudieron ejecutar los tests (¿PostgreSQL activo?):', err?.message || err);
    process.exit(1);
  }
})();