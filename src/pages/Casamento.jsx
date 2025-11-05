import React from "react";
import "./Casamento.css";

const Casamento = () => {
  const googleMapsLink =
    "https://www.google.com/maps/place/Espa%C3%A7o+Caplua+-+Piracicaba,+SP";
  const googleCalendarLink =
    "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Casamento+Nadine+e+Gabriel&dates=20251220T193000Z/20251220T223000Z&details=Casamento+de+Nadine+e+Gabriel&location=Espa%C3%A7o+Caplua,+Piracicaba,+SP,+Brasil";

  return (
    <div className="casamento-container">
      <h1>Nosso Casamento 💍</h1>

      <div className="mapa-container">
        <iframe
          title="Local do Casamento"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3678.4384783394485!2d-47.5846155!3d-22.786210999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c6256ed0a3e573%3A0xaab5a960bb7a8a29!2sTaquaral%20Caf%C3%A9!5e0!3m2!1spt-BR!2sbr!4v1762302338422!5m2!1spt-BR!2sbr"
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>

      <div className="info-container">
        <p>
          <strong>Data:</strong> 20 de dezembro de 2025 — 16h30
        </p>
        <p>
          <strong>Local:</strong> Rodovia do Açúcar SP - KM 154,5 - SN - Batistada, Piracicaba - SP, 13423-070
        </p>

        <div className="botoes-container">
          <button
            className="botao-maps"
            onClick={() => window.open(googleMapsLink, "_blank")}
          >
            📍 Abrir no Google Maps
          </button>
          <button
            className="botao-agenda"
            onClick={() => window.open(googleCalendarLink, "_blank")}
          >
            🗓️ Adicionar ao Google Agenda
          </button>
        </div>
      </div>
    </div>
  );
};

export default Casamento;
