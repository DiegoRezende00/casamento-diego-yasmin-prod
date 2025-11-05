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
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.667320787958!2d-47.66299732540165!3d-22.92504843968578!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c6316ee5c80b25%3A0x241f7e8e4a44a6e4!2sEspa%C3%A7o%20Caplua!5e0!3m2!1spt-BR!2sbr!4v1699884069119!5m2!1spt-BR!2sbr"
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>

      <div className="info-container">
        <p>
          <strong>Data:</strong> 20 de dezembro de 2025 — 16h30
        </p>
        <p>
          <strong>Local:</strong> Espaço Caplua — Piracicaba, SP, Brasil
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
