import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPresentes(lista);
    });
    return () => unsub();
  }, []);

  const reservar = async (p) => {
    if (p.reservado) {
      alert("Este presente já foi reservado ❤️");
      return;
    }

    const confirm = window.confirm(
      `Deseja reservar "${p.nome}" por R$ ${Number(p.preco).toFixed(2)}?`
    );
    if (!confirm) return;

    try {
      setLoadingId(p.id);
      setQrCode(null);
      setSelectedGift(p);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        {
          title: p.nome,
          amount: p.preco,
          presentId: p.id,
        }
      );

      // Bloqueio do botão: reserva temporária por 1 hora
      await axios.patch(`${import.meta.env.VITE_API_URL}/reserve_temp/${p.id}`, {
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      // Redireciona para a página de pagamento
      navigate("/pagamento", {
        state: {
          presentId: p.id,
          paymentId: data.id,
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          expiresAt: data.expiresAt || Date.now() + 60 * 60 * 1000,
        },
      });
    } catch (err) {
      console.error("Erro criando pagamento:", err);
      alert("Erro ao iniciar o pagamento. Tente novamente.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", color: "#2e7d32", fontSize: 28 }}>
        🎁 Lista de Presentes
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginTop: "2rem",
        }}
      >
        {presentes.map((p) => (
          <div
            key={p.id}
            style={{
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            {p.imagemUrl && (
              <img
                src={p.imagemUrl}
                alt={p.nome}
                style={{
                  width: "100%",
                  height: "180px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              />
            )}

            <h3 style={{ color: "#2e7d32", marginBottom: "0.5rem" }}>{p.nome}</h3>
            <p>
              <strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}
            </p>

            {p.reservado ? (
              <button
                disabled
                style={{
                  backgroundColor: "#ccc",
                  color: "#666",
                  padding: "10px 15px",
                  borderRadius: 8,
                  marginTop: "10px",
                  cursor: "not-allowed",
                }}
              >
                Reservado 💝
              </button>
            ) : (
              <button
                onClick={() => reservar(p)}
                disabled={loadingId === p.id}
                style={{
                  backgroundColor: "#2e7d32",
                  color: "#fff",
                  padding: "10px 15px",
                  borderRadius: 8,
                  marginTop: "10px",
                  cursor: "pointer",
                  opacity: loadingId === p.id ? 0.7 : 1,
                }}
              >
                {loadingId === p.id ? "Gerando..." : "Reservar 🎁"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
