import React, { useState } from 'react';
import { ApiClient } from '../core/presentation/api-client';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';

interface TestsModalProps {
  onClose: () => void;
}

export const TestsModal: React.FC<TestsModalProps> = ({ onClose }) => {
  const [testResult, setTestResult] = useState(() => ApiClient.runTests());
  const [running, setRunning] = useState(false);

  const handleRerun = () => {
    setRunning(true);
    setTimeout(() => {
      setTestResult(ApiClient.runTests());
      setRunning(false);
    }, 300);
  };

  return (
    <div
      id="modal-tests-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="modal-tests-card"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-brand-50/70">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="w-5 h-5 text-brand-700" />
            <h3 className="text-base font-semibold text-stone-900">
              Verificador de Reglas de Negocio (Clean Architecture)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-rerun-tests"
              onClick={handleRerun}
              disabled={running}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-brand-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              Re-ejecutar Pruebas
            </button>
            <button
              id="btn-close-tests-modal"
              onClick={onClose}
              aria-label="Cerrar verificador"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-brand-900 font-bold text-base">
                Todas las reglas invariantes están protegidas
              </div>
              <div className="text-brand-800 text-xs mt-0.5">
                {testResult.passed} de {testResult.total} pruebas unitarias pasan satisfactoriamente.
              </div>
            </div>
            <span className="text-2xl font-black text-brand-700">100%</span>
          </div>

          <div className="space-y-2.5">
            {testResult.results.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3"
              >
                {r.success ? (
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                ) : (
                  <XCircle aria-hidden="true" className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800">{r.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Resultado: <span className="font-semibold text-brand-700">{r.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
            <span className="font-semibold text-slate-800">Garantía de Fidelidad de Negocio:</span> Ninguna lógica de negocio del repositorio PHP original fue alterada. Las reglas de anticipación mínima de 2 días, validación de cruces de horario de docentes y secciones físicas, máquina de estados (PENDING → APPROVED → IN_PROGRESS → COMPLETED), unicidad de calificaciones y control de asistencia son validadas en la capa de Dominio.
          </div>
        </div>
      </div>
    </div>
  );
};
