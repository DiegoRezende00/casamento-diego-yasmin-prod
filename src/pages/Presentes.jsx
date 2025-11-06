import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPresentes(lista);
    });
    return () => unsub();
  }, []);

  const reservar = async (p) => {
    if (p.payment?.status === "pending") {
      alert("Este presente está aguardando pagamento. Tente novamente mais tarde.");
      return;
    }
    if (p.payment?.status === "paid") {
      alert("Este presente já foi pago. Obrigado!");
      return;
    }

    const confirm = window.confirm(`Deseja reservar "${p.nome}" por R$ ${p.preco}? Será gerado um QR Code para pagamento.`);
    if (!confirm) return;

    try {
      setLoadingPayment(true);
      // usa VITE_API_URL se estiver definido (build-time)
      // caso contrário, se a página foi carregada no mesmo host do backend, usa path relativo
      const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") 
      || (window.location.origin.includes("onrender.com") || window.location.origin.includes("vercel.app")
      ? "" // path relativo -> same-origin: POST to /create_payment
      : "https://casamento-diego-yasmin-prod-1.onrender.com"); // ou seu backend
      const resp = await axios.post(`${apiUrl}/create_payment`, {
        presentId: p.id,
        amount: p.preco,
        title: p.nome,
      }, { timeout: 15000 });

      const { paymentId, qr_code, qr_base64, expiresAt } = resp.data;
      // redireciona para rota /pagamento (crie se ainda não existe)
      navigate("/pagamento", { state: { presentId: p.id, paymentId, qr_code, qr_base64, expiresAt } });
    } catch (err) {
      console.error("Erro criando pagamento:", err);
      // Mostra mensagem mais informativa ao usuário
      if (err?.response?.data) {
        console.error("Resposta servidor:", err.response.data);
        alert("Erro ao criar pagamento: " + (err.response.data.detail || err.response.data.error || JSON.stringify(err.response.data)));
      } else if (err?.message) {
        alert("Erro ao criar pagamento: " + err.message);
      } else {
        alert("Erro ao criar pagamento. Tente novamente.");
      }
    } finally {
      setLoadingPayment(false);
    }
  };

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", color: "#2e7d32" }}>🎁 Lista de Presentes</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "1.5rem",
        marginTop: "2rem"
      }}>
        {presentes.map((p) => (
          <div key={p.id} style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            textAlign: "center"
          }}>
            {p.imagemUrl && <img src={p.imagemUrl} alt={p.nome} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }} />}
            <h3 style={{ color: "#2e7d32" }}>{p.nome}</h3>
            <p><strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}</p>

            {p.payment?.status === "paid" ? (
              <button disabled style={{ backgroundColor: "#ccc", color: "#666", padding: "10px 15px", borderRadius: 8 }}>Já reservado / Pago</button>
            ) : p.payment?.status === "pending" ? (
              <button disabled style={{ backgroundColor: "#f0ad4e", color: "#fff", padding: "10px 15px", borderRadius: 8 }}>Aguardando pagamento</button>
            ) : (
              <button onClick={() => reservar(p)} disabled={loadingPayment} style={{ backgroundColor: "#2e7d32", color: "#fff", padding: "10px 15px", borderRadius: 8 }}>
                {loadingPayment ? "Gerando..." : "Reservar 🎁"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
