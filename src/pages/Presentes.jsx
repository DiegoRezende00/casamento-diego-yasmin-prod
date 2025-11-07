import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import axios from "axios";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "presents"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPresentes(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Verifica status de pagamento no Firestore em tempo real
  useEffect(() => {
    if (!selectedGift) return;
    const unsubscribe = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data.presentId === selectedGift.id && data.status === "approved") {
            setShowSuccess(true);
            setPaymentData(null);
            setSelectedGift(null);
            setTimeout(() => setShowSuccess(false), 3000);
          }
        });
      }
    );
    return () => unsubscribe();
  }, [selectedGift]);

  async function handleBuy(gift) {
    try {
      setSelectedGift(gift);
      setPaymentData(null);
      setTimeLeft(600);

      // Cria um novo registro de pagamento no Firestore
      const newPayment = await addDoc(collection(db, "payments"), {
        presentId: gift.id,
        presentName: gift.nome,
        status: "pending",
        createdAt: new Date(),
      });

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/create_preference`,
        {
          title: gift.nome,
          price: gift.preco,
          paymentId: newPayment.id,
        }
      );

      setPaymentData(response.data);
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      alert("Erro ao iniciar o pagamento. Tente novamente.");
    }
  }

  return (
    <div style={{ padding: "30px", textAlign: "center" }}>
      <h1 style={{ fontSize: "26px", marginBottom: "20px" }}>Lista de Presentes</h1>

      {/* Lista de presentes */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        {presentes.map((gift) => (
          <div
            key={gift.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              width: "240px",
              padding: "15px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={gift.imagemUrl}
              alt={gift.nome}
              style={{
                width: "100%",
                height: "160px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
            <h3 style={{ marginTop: "10px" }}>{gift.nome}</h3>
            <p style={{ color: "#666" }}>{gift.description}</p>
            <p style={{ fontWeight: "bold", marginTop: "10px" }}>
              R$ {gift.preco}
            </p>
            <button
              onClick={() => handleBuy(gift)}
              style={{
                marginTop: "10px",
                padding: "10px 20px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#007bff",
                color: "white",
                cursor: "pointer",
              }}
            >
              Presentear
            </button>
          </div>
        ))}
      </div>

      {/* Modal de pagamento */}
      {selectedGift && paymentData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              width: "90%",
              maxWidth: "420px",
            }}
          >
            <h2 style={{ marginBottom: "10px" }}>Pagamento</h2>
            <p style={{ color: "#555", marginBottom: "20px" }}>
              Escaneie o QR Code abaixo para realizar o pagamento do presente:
            </p>
            <img
              src={paymentData.qrCode}
              alt="QR Code"
              style={{
                width: "200px",
                height: "200px",
                margin: "auto",
                display: "block",
              }}
            />
            <p style={{ marginTop: "15px", fontWeight: "bold" }}>
              Tempo restante: {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")}
            </p>
            <button
              onClick={() => {
                setSelectedGift(null);
                setPaymentData(null);
              }}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Popup de sucesso */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#28a745",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
            zIndex: 10000,
            fontWeight: "bold",
          }}
        >
          🎉 Pagamento confirmado com sucesso!
        </div>
      )}
    </div>
  );
}
