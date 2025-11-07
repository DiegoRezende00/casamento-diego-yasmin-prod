// Presentes.jsx (frontend)
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

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

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        { title: p.nome, amount: p.preco, presentId: p.id },
        { headers: { "Content-Type": "application/json" } }
      );

      const mp_id = data.mp_id || data.id || null;
      if (!mp_id) {
        alert("Erro: mp_id ausente na resposta do servidor.");
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
        console.warn("⚠️ Não foi possível atualizar present.lastMp (não crítico)", e);
      }

      const transRef = doc(db, "presents", p.id, "transactions", mp_id);
      const unsubTrans = onDocSnapshot(transRef, (snap) => {
        if (!snap.exists()) return;
        const tx = snap.data();
        if (tx.status === "paid" || tx.status === "approved") {
          setQrCode(null);
          setSelectedGift(null);
          setCopyCode("");
          setShowSuccess(true);
          setTimeout(() => setFadeOut(true), 2000);
          setTimeout(() => {
            setShowSuccess(false);
            setFadeOut(false);
            window.location.reload();
          }, 3000);
          try {
            unsubTrans();
          } catch (e) {}
          transUnsubRef.current = null;
        } else if (["cancelled", "rejected", "expired"].includes(tx.status)) {
          setQrCode(null);
          setSelectedGift(null);
          setCopyCode("");
          alert("Pagamento cancelado ou expirado. Tente novamente.");
          try {
            unsubTrans();
          } catch (e) {}
          transUnsubRef.current = null;
        }
      });

      transUnsubRef.current = unsubTrans;
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

      {/* 🔔 Banner de confirmação em tela cheia */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(255,255,255,0.95)",
            color: "#2e7d32",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            fontWeight: "bold",
            zIndex: 2000,
            opacity: fadeOut ? 0 : 1,
            transition: "opacity 1.5s ease",
          }}
        >
          ✅ PAGAMENTO CONFIRMADO COM SUCESSO!
        </div>
      )}

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
              transition: "transform 0.2s ease",
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
                    borderRadius: "6px",
                    transition: "transform 0.3s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                />
              </div>
            )}

            <h3 style={{ color: "#2e7d32", marginBottom: "0.5rem" }}>{p.nome}</h3>
            <p>
              <strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}
            </p>

            {p.reservado || p?.payment?.status === "approved" || p?.payment?.status === "paid" ? (
              <div
                style={{
                  backgroundColor: "#d4edda",
                  color: "#155724",
                  padding: "10px 15px",
                  borderRadius: 8,
                  marginTop: "10px",
                  fontWeight: "bold",
                }}
              >
                ✅ Presente já confirmado!
              </div>
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
                {loadingId === p.id ? "Gerando..." : "Presentear 🎁"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 🔹 Modal Pix */}
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
