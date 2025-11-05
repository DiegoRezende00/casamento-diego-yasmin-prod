import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Pagamento() {
  const location = useLocation();
  const navigate = useNavigate();
  const { presentId, paymentId, qr_code, qr_base64, expiresAt } = location.state || {};
  const [status, setStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!presentId) {
      navigate("/presents");
      return;
    }
    // Listen Firestore present doc to update status in real time
    const unsubscribe = onSnapshot(doc(db, "presents", presentId), (snap) => {
      const data = snap.data();
      const st = data?.payment?.status;
      setStatus(st);
      const exp = data?.payment?.expiresAt;
      if (exp) {
        const expiresMs = exp.toDate ? exp.toDate().getTime() : new Date(exp).getTime();
        setTimeLeft(expiresMs - Date.now());
      } else if (expiresAt) {
        setTimeLeft(expiresAt - Date.now());
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [presentId]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setTimeLeft(0);
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (!s || s <= 1000) {
          clearInterval(t);
          return 0;
        }
        return s - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "00:00:00";
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>Pagamento — QR Code</h2>

      {status === "paid" ? (
        <div>
          <p style={{ color: "green", fontWeight: "bold" }}>Pagamento confirmado! Obrigado 🎉</p>
          <button onClick={() => navigate("/presents")}>Voltar à lista</button>
        </div>
      ) : status === "expired" ? (
        <div>
          <p style={{ color: "red", fontWeight: "bold" }}>O tempo expirou. O presente está disponível novamente.</p>
          <button onClick={() => navigate("/presents")}>Voltar</button>
        </div>
      ) : (
        <div>
          {qr_base64 ? (
            <img src={`data:image/png;base64,${qr_base64}`} alt="QR Code" style={{ maxWidth: 300 }} />
          ) : qr_code ? (
            <div style={{ maxWidth: 300, wordBreak: "break-all", margin: "0 auto", background: "#fff", padding: 12, borderRadius: 8 }}>
              <p style={{ fontSize: 12 }}>{qr_code}</p>
            </div>
          ) : (
            <p>Gerando QR Code...</p>
          )}

          <p style={{ marginTop: 16 }}>Tempo restante para pagamento: <strong>{formatTime(timeLeft)}</strong></p>
          <p style={{ fontSize: 14, color: "#666" }}>Aguarde a confirmação — atualizaremos automaticamente.</p>
          <button onClick={() => navigate("/presents")} style={{ marginTop: 12 }}>Cancelar / Voltar</button>
        </div>
      )}
    </div>
  );
}
