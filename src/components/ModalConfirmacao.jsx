// ModalConfirmacao.jsx

import React from 'react';

// Recebe props para mostrar/esconder, o nome da pessoa/convite,
// e as funções de ação.
function ModalConfirmacao({ show, codigo, onConfirmar, onNaoComparecer, onClose }) {
  if (!show) {
    return null;
  }

  // Você pode personalizar a mensagem do convite, assumindo que
  // o 'codigo' é o nome da pessoa/convite
  const nomeConvidado = codigo;

  return (
    // 1. O Overlay (Fundo escuro que cobre toda a tela)
    <div className="modal-overlay" onClick={onClose}>
      {/* 2. A Caixa do Modal (Onde o conteúdo fica) */}
      {/* O stopPropagation evita que clicar no modal feche ele através do onClick do overlay */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Confirmação de Presença</h3>
        <p className="modal-message">
          Olá {nomeConvidado}, você está confirmando sua presença no evento de Yasmin & Diego?
        </p>
        
        {/* Botões de Ação */}
        <div className="modal-actions">
          <button 
            className="btn-confirmar" 
            onClick={onConfirmar}
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