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

        <div className="mapa-container" style={{ width: "100%" }}>
          <iframe
            title="Local do Casamento"
            style={{
              width: "100%",
              height: "350px",
              border: "0",
              borderRadius: "10px",
            }}
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3678.4384783394485!2d-47.5846155!3d-22.786210999999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c6256ed0a3e573%3A0xaab5a960bb7a8a29!2sTaquaral%20Café!5e0!3m2!1spt-BR!2sbr!4v1762302338422!5m2!1spt-BR!2sbr"
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>

        <div
          className="info-container"
          style={{
            marginTop: "20px",
            textAlign: "center",
            lineHeight: "1.6",
          }}
        >
          <p>
            <strong>Data:</strong> 11 de julho de 2026 — 15h30
          </p>

          <p>
            <strong>Local:</strong> Rodovia do Açúcar SP - KM 154,5 - SN -
            Batistada, Piracicaba - SP, 13423-070
          </p>

          <div
            className="botoes-container"
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
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
