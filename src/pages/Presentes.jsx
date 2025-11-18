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
  const [funPresents, setFunPresents] = useState([]); // 🔹 NOVO BLOCO
  const [loadingId, setLoadingId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [copyCode, setCopyCode] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [sortOption, setSortOption] = useState("az");
  const transUnsubRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPresentes(lista);
    });
    return () => unsub();
  }, []);

  // 🔹 NOVA COLEÇÃO - LISTA DIVERTIDA
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "funPresents"), (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFunPresents(lista);
    });
    return () => unsub();
  }, []);

  // 🔹 Ordenação
  const ordenarPresentes = (lista) => {
    const sorted = [...lista];

    switch (sortOption) {
      case "menor":
        sorted.sort((a, b) => Number(a.preco) - Number(b.preco));
        break;
      case "maior":
        sorted.sort((a, b) => Number(b.preco) - Number(a.preco));
        break;
      case "za":
        sorted.sort((a, b) => b.nome.localeCompare(a.nome));
        break;
      default:
        sorted.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return sorted;
  };

  const reservar = async (p) => {
    const confirm = window.confirm(
      `Deseja presentear "${p.nome}" por R$ ${Number(p.preco).toFixed(2)}?`
    );
    if (!confirm) return;

    try {
      if (transUnsubRef.current) {
        try { transUnsubRef.current(); } catch (e) {}
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

      const paymentId = data.paymentId || data.id || null;
      if (!paymentId) {
        alert("Erro: paymentId ausente na resposta do servidor.");
        return;
      }

      if (data.qr_base64) setQrCode(`data:image/png;base64,${data.qr_base64}`);
      if (data.qr_code) setCopyCode(data.qr_code);

      try {
        const presentRef = doc(db, "presents", p.id);
        await updateDoc(presentRef, {
          "payment.lastMp": paymentId,
          "payment.lastCreatedAt": serverTimestamp(),
        });
      } catch (e) {
        console.warn("⚠️ Não foi possível atualizar present.lastMp", e);
      }

      const transRef = doc(db, "presents", p.id, "transactions", paymentId);
      const unsubTrans = onDocSnapshot(transRef, (snap) => {
        if (!snap.exists()) return;
        const tx = snap.data();

        if (tx.status === "paid" || tx.status === "approved") {
          setPaymentConfirmed(true);
          setQrCode(null);
          setCopyCode("");

          setTimeout(() => {
            setPaymentConfirmed(false);
            setSelectedGift(null);
          }, 8000);

          try { unsubTrans(); } catch (e) {}
          transUnsubRef.current = null;
        } else if (["cancelled", "rejected", "expired"].includes(tx.status)) {
          setQrCode(null);
          setSelectedGift(null);
          setCopyCode("");
          alert("Pagamento cancelado ou expirado. Tente novamente.");
          try { unsubTrans(); } catch (e) {}
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

      {/* 🔹 Banner topo */}
      <div
        style={{
          backgroundImage: "url('https://png.pngtree.com/png-vector/20241205/ourlarge/pngtree-purple-present-with-bow-a-unique-gift-for-the-holidays-png-image_14604272.png')",
          backgroundSize: "120px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 20px",
          padding: "150px 20px 40px 20px",
          textAlign: "center",
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ color: "#2e7d32", fontSize: 26 }}>
          Esta é a nossa lista de presentes e um de nossos grandes sonhos como casal.
        </h2>
        <p style={{ marginTop: 10, fontSize: 16, color: "#444" }}>
          Ficamos muito felizes em compartilhar com vocês esse momento tão especial cheio de amor ❤️
        </p>
      </div>

      {/* ============================
          🔹 BLOCO CASA COMPLETA
      ============================== */}
      <h2 style={{ color: "#2e7d32", marginBottom: 20, textAlign: "center" }}>
        🏡 CASA COMPLETA
      </h2>

      {/* 🔹 Filtros */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #2e7d32",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <option value="az">Ordenar: A → Z</option>
          <option value="za">Ordenar: Z → A</option>
          <option value="menor">Menor valor</option>
          <option value="maior">Maior valor</option>
        </select>
      </div>

      {/* 🎁 Lista CASA COMPLETA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginTop: "1rem",
        }}
      >
        {ordenarPresentes(presentes).map((p) => (
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

      {/* ============================
          🎉 BLOCO LISTA DIVERTIDA
      ============================== */}
      <h2
        style={{
          color: "#8e24aa",
          marginTop: "3rem",
          marginBottom: "1rem",
          textAlign: "center",
        }}
      >
        🎉 LISTA DIVERTIDA
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {funPresents.length === 0 ? (
          <p style={{ textAlign: "center", width: "100%" }}>
            Nenhum item divertido ainda 😄
          </p>
        ) : (
          ordenarPresentes(funPresents).map((p) => (
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

              <h3 style={{ color: "#8e24aa", marginBottom: "0.5rem" }}>
                {p.nome}
              </h3>
              <p>
                <strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}
              </p>

              <button
                onClick={() => reservar(p)}
                disabled={loadingId === p.id}
                style={{
                  backgroundColor: "#8e24aa",
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
          ))
        )}
      </div>

      {/* ============================
          🔹 Modal Pix
      ============================== */}
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
