import { useEffect, useState } from "react";

function Home() {
  const weddingDate = new Date("2026-07-12T00:00:00");
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = weddingDate - now;
      setDaysLeft(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 86400000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <h1>SAVE THE DATE</h1>
      <h2>DIEGO & YASMIN</h2>
      <p>💍 12 de Julho de 2026</p>
      <p className="countdown">💚 Faltam {daysLeft} dias para o casamento!</p>

      <div className="card">
        <h3>📍 Local da cerimônia</h3>
        <p>Esperamos por você para celebrar conosco esse dia tão especial!</p>
        <button
          onClick={() =>
            window.open("https://maps.app.goo.gl/e1pp3P79VHKgYBdB9", "_blank")
          }
        >
          Ver no Google Maps
        </button>
      </div>
    </div>
  );
}

export default Home;
