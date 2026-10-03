import React from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface AttachmentViewerModalProps {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  fileName,
  fileUrl,
  onClose
}) => {
  // SVG excluido del preview: un SVG data-URL renderizado puede ejecutar JS (XSS)
  const isSvg = /\.svg$/i.test(fileName) || fileUrl.startsWith('data:image/svg');
  const isImage = !isSvg && (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName) || fileUrl.startsWith('data:image/'));
  const isPdf = /\.pdf$/i.test(fileName) || fileUrl.startsWith('data:application/pdf');

  return (
    <div
      id="modal-attachment-backdrop"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="modal-attachment-card"
        className="bg-white border border-stone-300 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95"
      >
        {/* Header de la ventana */}
        <div className="px-5 py-3.5 bg-brand-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-700 flex items-center justify-center shrink-0">
              {isImage ? <ImageIcon aria-hidden="true" className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {fileName || 'Documento Adjunto'}
              </h3>
              <p className="text-[10px] text-stone-500">
                Visualizador de Archivos Adjuntos FET
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              title="Descargar archivo original"
              aria-label={`Descargar ${fileName}`}
            >
              <Download aria-hidden="true" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Cerrar visor"
              aria-label="Cerrar visor"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido Visualizador */}
        <div className="p-4 bg-stone-100 flex-1 overflow-auto flex items-center justify-center min-h-[350px]">
          {isImage ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md border border-stone-200 bg-white"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName}
              sandbox=""
              className="w-full h-[70vh] rounded-lg border border-stone-200 bg-white shadow-xs"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl border border-stone-200 shadow-xs max-w-md space-y-3">
              <FileText aria-hidden="true" className="w-12 h-12 text-brand-700 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-800">{fileName}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este tipo de documento (Word/Docx/Texto) no puede renderizarse directamente dentro del navegador web, pero puedes descargarlo o abrirlo en tu computadora.
              </p>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download aria-hidden="true" className="w-4 h-4" />
                <span>Descargar Archivo</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-white border-t border-stone-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>Vista previa segura en segundo plano</span>
          <span>Fundación Escuela Tecnológica de Neiva - FET</span>
        </div>
      </div>
    </div>
  );
};
