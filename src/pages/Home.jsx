import React, { useEffect, useState } from "react";
import "./Home.css";
import presenteImg from "../assets/presente.jpg"; // imagem da seção de presentes
import fundoSite from "../assets/fundo-site.jpg"; // imagem de fundo enviada

const Home = () => {
  const casamentoData = new Date("2026-07-12T16:30:00");
  const [diasRestantes, setDiasRestantes] = useState(0);

  useEffect(() => {
    const hoje = new Date();
    const diff = Math.ceil(
      (casamentoData.getTime() - hoje.getTime()) / (1000 * 3600 * 24)
    );
    setDiasRestantes(diff);
  }, []);

  const mapsLink =
    "https://maps.app.goo.gl/e1pp3P79VHKgYBdB9";
  const listaPresentesLink = "/presentes";

  return (
    <div
      className="home-background"
      style={{
        backgroundImage: `url(${fundoSite})`,
      }}
    >
      <div className="overlay">
        <section className="save-date-section">
          <h2 className="save-date-text">Save the Date</h2>
          <h1 className="nomes">Diego & Yasmin</h1>
          <p className="contador">
            12.07.2026 — Faltam {diasRestantes} dias
          </p>
        </section>

        <section className="evento-section">
          <h3 className="evento-subtitulo">Evento</h3>
          <h2 className="evento-titulo">Casamento</h2>

          <div className="evento-info">
            <p>
              <span className="emoji">📅</span> 12 de julho de 2026 — 11h00
            </p>
            <p>
              <span className="emoji">📍</span> Rodovia do Açúcar SP - KM 154,5 - SN - Batistada, Piracicaba - SP, 13423-070
            </p>
          </div>

          <button
            className="botao-ver-evento"
            onClick={() => window.open(mapsLink, "_blank")}
          >
            Ver evento principal
          </button>
        </section>

        <section className="presentes-section">
          <div className="presentes-conteudo">
            <div className="presentes-imagem">
              <img src={presenteImg} alt="Presente" />
            </div>
            <div className="presentes-texto">
              <h2>Lista de Presentes</h2>
              <p>
                Esta é a nossa lista de presentes e um de nossos grandes sonhos
                como casal. Ficamos muito felizes em compartilhar com vocês esse
                momento tão especial 💚
              </p>
              <button
                className="botao-presentear"
                onClick={() => (window.location.href = listaPresentesLink)}
              >
                Presentear
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
