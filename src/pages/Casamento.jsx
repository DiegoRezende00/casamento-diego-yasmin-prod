import React from "react";
import "./Casamento.css";

const Casamento = () => {
  const googleMapsLink =
    "https://www.google.com/maps/place/Taquaral+Café/@-22.786206,-47.5894864,17z/data=!3m1!4b1!4m6!3m5!1s0x94c6256ed0a3e573:0xaab5a960bb7a8a29!8m2!3d-22.786211!4d-47.5846155!16s%2Fg%2F11kq6sqgt9";

  const googleCalendarLink =
    "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Casamento+Yasmin+e+Diego&dates=20260711T103000Z/20260711T2173000Z&details=Casamento+de+Yasmin+e+Diego&location=Espaço+Taquaral,+Piracicaba,+SP,+Brasil";

  return (
    <div
      className="page-wrapper"
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <div className="casamento-container">
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
          Nosso Casamento 💍
        </h1>

      <div className="info-container">
        <p>
          <strong>Data:</strong> 11 de Julho de 2026 — 12h00
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
            <button
              className="botao-maps"
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#4CAF50",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
              }}
              onClick={() => window.open(googleMapsLink, "_blank")}
            >
              📍 Abrir no Google Maps
            </button>

            <button
              className="botao-agenda"
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#2196F3",
                color: "white",
                fontSize: "16px",
                cursor: "pointer",
              }}
              onClick={() => window.open(googleCalendarLink, "_blank")}
            >
              🗓️ Adicionar ao Google Agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Casamento;
