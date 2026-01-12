// ModalConfirmacao.jsx
import React, { useState, useEffect } from "react";

function ModalConfirmacao({
  show,
  codigo,
  maxPessoas,
  onConfirmar,
  onNaoComparecer,
  onClose,
}) {
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    setQuantidade(1);
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Confirmação de Presença</h3>

        <p className="modal-message">
          Olá <strong>{codigo}</strong>, quantas pessoas irão comparecer?
        </p>

        <select
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "1rem",
          }}
        >
          {Array.from({ length: maxPessoas }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num} pessoa{num > 1 ? "s" : ""}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button
            className="btn-confirmar"
            onClick={() => onConfirmar(quantidade)}
          >
            ✅ CONFIRMAR PRESENÇA
          </button>

          <button
            className="btn-nao-comparecerei"
            onClick={onNaoComparecer}
          >
            ❌ NÃO COMPARECEREI
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacao;
