import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [copyCode, setCopyCode] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // 🧩 Escuta o Firestore em tempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPresentes(lista);

      // 🔹 Se o presente selecionado foi pago → fecha o QR e mostra mensagem
      if (selectedGift) {
        const updatedGift = lista.find((p) => p.id === selectedGift.id);

        if (
          updatedGift?.payment?.status === "paid" ||
          updatedGift?.payment?.status === "approved"
        ) {
          setQrCode(null);
          setSelectedGift(null);
          setCopyCode("");
          setShowSuccess(true);

          // Mostra mensagem de sucesso por 3 segundos e recarrega
          setTimeout(() => {
            setShowSuccess(false);
            window.location.reload();
          }, 3000);
        }
      }
    });

    return () => unsub();
  }, [selectedGift]);

  // 💰 Função de reserva e criação do pagamento
  const reservar = async (p) => {
    const confirm = window.confirm(
      `Deseja reservar "${p.nome}" por R$ ${Number(p.preco).toFixed(2)}?`
    );
    if (!confirm) return;

    try {
      setLoadingId(p.id);
      setQrCode(null);
      setSelectedGift(p);

      // Cria pagamento via backend
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        { title: p.nome, amount: p.preco, presentId: p.id }
      );

      // Exibe QRCode retornado
      if (data.qr_base64) setQrCode(`data:image/png;base64,${data.qr_base64}`);
      if (data.qr_code) setCopyCode(data.qr_code);

      // 🔹 O backend já marca como "pending" — só registramos o bloqueio local
      const presentRef = doc(db, "presents", p.id);
      await updateDoc(presentRef, {
        "payment.blockedAt": serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao criar pagamento:", err);
      alert("Erro ao iniciar o pagamento. Veja o console.");
    } finally {
      setLoadingId(null);
    }
  };

  // 📋 Copiar código Pix
  const copiarQRCode = () => {
    if (!copyCode) return;
    navigator.clipboard
      .writeText(copyCode)
      .then(() => alert("Código Pix copiado!"))
      .catch(() => alert("Erro ao copiar o código Pix."));
  };

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", color: "#2e7d32", fontSize: 28 }}>
        🎁 Lista de Presentes
      </h2>

      {/* ✅ Mensagem de sucesso */}
      {showSuccess && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "1rem",
            borderRadius: "8px",
            margin: "20px auto",
            textAlign: "center",
            maxWidth: "500px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          ✅ Pagamento confirmado com sucesso!
        </div>
      )}

      {/* Lista de presentes */}
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
            <p><strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}</p>

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
              {loadingId === p.id ? "Gerando..." : "Presentear 🎁"}
            </button>
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
            <h3 style={{ color: "#2e7d32" }}>Pagamento de {selectedGift.nome}</h3>

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
              Escaneie com o app do Mercado Pago ou copie o código abaixo 👇
            </p>

            {copyCode && (
              <div style={{ marginTop: "1rem" }}>
                <input
                  type="text"
                  readOnly
                  value={copyCode}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                />
                <button
                  onClick={copiarQRCode}
                  style={{
                    marginTop: 8,
                    backgroundColor: "#2e7d32",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Copiar código Pix
                </button>
              </div>
            )}

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
