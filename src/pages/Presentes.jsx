import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot as onDocSnapshot,
} from "firebase/firestore";
import axios from "axios";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [copyCode, setCopyCode] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const transUnsubRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPresentes(lista);
    });
    return () => unsub();
  }, []);

  const reservar = async (p) => {
    const confirm = window.confirm(
      `Deseja presentear "${p.nome}" por R$ ${Number(p.preco).toFixed(2)}?`
    );
    if (!confirm) return;

    try {
      if (transUnsubRef.current) {
        try {
          transUnsubRef.current();
        } catch (e) {}
        transUnsubRef.current = null;
      }

      setLoadingId(p.id);
      setQrCode(null);
      setCopyCode("");
      setSelectedGift(p);
      setPaymentConfirmed(false);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        { title: p.nome, amount: p.preco, presentId: p.id },
        { headers: { "Content-Type": "application/json" } }
      );

      const mp_id = data.paymentId || data.id || null;
      if (!mp_id) {
        alert("Erro: paymentId ausente na resposta do servidor.");
        return;
      }

      if (data.qr_base64) setQrCode(`data:image/png;base64,${data.qr_base64}`);
      if (data.qr_code) setCopyCode(data.qr_code);

      try {
        const presentRef = doc(db, "presents", p.id);
        await updateDoc(presentRef, {
          "payment.lastMp": mp_id,
          "payment.lastCreatedAt": serverTimestamp(),
        });
      } catch (e) {
        console.warn("⚠️ Não foi possível atualizar present.lastMp", e);
      }

      // 🔹 Agora escutamos o próprio presente e não transactions
      const presentRef = doc(db, "presents", p.id);
      const unsubPresent = onDocSnapshot(presentRef, (snap) => {
        if (!snap.exists()) return;
        const presData = snap.data();

        const status = presData?.payment?.status;
        if (status === "paid" || status === "approved") {
          setPaymentConfirmed(true);
          setQrCode(null);
          setCopyCode("");

          // Fecha o modal depois de 5s
          setTimeout(() => {
            setPaymentConfirmed(false);
            setSelectedGift(null);
          }, 5000);

          try {
            unsubPresent();
          } catch (e) {}
          transUnsubRef.current = null;
        }
      });

      transUnsubRef.current = unsubPresent;
    } catch (err) {
      console.error("❌ Erro ao criar pagamento:", err.response || err);
      alert("Erro ao iniciar o pagamento. Verifique o console.");
    } finally {
      setLoadingId(null);
    }
  };

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
              <div
                style={{
                  width: "100%",
                  height: "220px",
                  backgroundColor: "#fafafa",
                  borderRadius: "8px",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <img
                  src={p.imagemUrl}
                  alt={p.nome}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            <h3 style={{ color: "#2e7d32", marginBottom: "0.5rem" }}>{p.nome}</h3>
            <p>
              <strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}
            </p>

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

      {/* 🔹 Modal Pix / Pagamento */}
      {(qrCode || paymentConfirmed) && selectedGift && (
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
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              maxWidth: "400px",
              width: "90%",
              transition: "all 0.3s ease",
              animation: "fadeIn 0.5s ease",
            }}
          >
            {paymentConfirmed ? (
              <div
                style={{
                  color: "#2e7d32",
                  fontSize: "1.8rem",
                  fontWeight: "bold",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "250px",
                }}
              >
                ✅ Pagamento confirmado com sucesso!  
                <p style={{ fontSize: "1rem", marginTop: "1rem", color: "#4caf50" }}>
                  Obrigado por presentear! ❤️
                </p>
              </div>
            ) : (
              <>
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
                  Escaneie com o app do banco ou copie o código abaixo 👇
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
