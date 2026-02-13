"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RippleButton } from "./RippleButton";
import { useToast } from "./Toast";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardapioUrl: string;
  logo?: string | null;
}

export function QRCodeModal({
  isOpen,
  onClose,
  cardapioUrl,
  logo,
}: QRCodeModalProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const handleDownloadQR = useCallback(() => {
    const svgElement = qrCodeRef.current?.querySelector("svg");
    if (!svgElement) return;

    const canvas = document.createElement("canvas");
    const size = 1024; // Alta resolução
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    img.onload = () => {
      // Fundo branco
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const link = document.createElement("a");
      link.download = "qrcode-cardapio-freitas.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR Code baixado!");
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, [toast]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">🔗 QR Code</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Fechar"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <div
                ref={qrCodeRef}
                className="bg-white p-4 rounded-xl shadow-md border border-blue-200"
              >
                {cardapioUrl && (
                  <QRCodeSVG
                    value={cardapioUrl}
                    size={256}
                    level="H"
                    bgColor="#FFFFFF"
                    fgColor="#7c4e42"
                    imageSettings={
                      logo
                        ? {
                            src: logo,
                            x: undefined,
                            y: undefined,
                            height: 48,
                            width: 48,
                            excavate: true,
                          }
                        : undefined
                    }
                  />
                )}
              </div>

              <p className="text-sm text-gray-600 text-center">
                Escaneie o código com seu celular para acessar o cardápio
              </p>
            </div>

            {/* Link do cardápio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Link do Cardápio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cardapioUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs text-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cardapioUrl);
                    toast.success("Link copiado!");
                  }}
                  className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-700">
                💡 <strong>Dica:</strong> Imprima este QR Code e coloque no balcão para os clientes acessarem o cardápio facilmente!
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <RippleButton
                onClick={handleDownloadQR}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>⬇️</span>
                <span>Baixar PNG</span>
              </RippleButton>
              <RippleButton
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                Fechar
              </RippleButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
