import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import axios from "axios";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);

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

      // 🔹 Exibe o QR Code retornado pela API
      if (data.point_of_interaction?.transaction_data?.qr_code_base64) {
        setQrCode(
          `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
        );
      } else if (data.init_point) {
        // Fallback: exibir link se não tiver QR
        window.open(data.init_point, "_blank");
      } else {
        alert("Erro: resposta inesperada do servidor.");
      }
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

      {/* Modal de QR Code */}
      {qrCode && selectedGift && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setQrCode(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              maxWidth: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#2e7d32" }}>
              Pagamento de {selectedGift.nome}
            </h3>
            <img
              src={qrCode}
              alt="QR Code Pagamento"
              style={{
                marginTop: "1rem",
                width: "250px",
                height: "250px",
                borderRadius: "10px",
              }}
            />
            <p style={{ marginTop: "1rem" }}>
              Escaneie com o app do Mercado Pago para concluir o pagamento.
            </p>
            <button
              onClick={() => setQrCode(null)}
              style={{
                marginTop: "1rem",
                backgroundColor: "#2e7d32",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
