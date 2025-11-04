import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);

  // ✅ Atualiza em tempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "presents"), (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPresentes(lista);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Função para reservar um presente
  const reservar = async (id) => {
    try {
      const presenteRef = doc(db, "presents", id);
      await updateDoc(presenteRef, { reservado: true });
      alert("🎁 Presente reservado com sucesso!");
    } catch (error) {
        console.error("Erro ao reservar presente:", error.code, error.message);
        alert("Erro ao reservar presente. Código: " + error.code);
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
          <div
            key={p.id}
            style={{
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              textAlign: "center"
            }}
          >
            <img
              src={p.imagemUrl}
              alt={p.nome}
              style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px" }}
            />
            <h3 style={{ color: "#2e7d32" }}>{p.nome}</h3>
            <p><strong>Valor:</strong> R$ {p.preco}</p>
            {p.reservado ? (
              <button
                disabled
                style={{
                  backgroundColor: "#ccc",
                  color: "#666",
                  padding: "10px 15px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "not-allowed"
                }}
              >
                Já reservado 💝
              </button>
            ) : (
              <button
                onClick={() => reservar(p.id)}
                style={{
                  backgroundColor: "#2e7d32",
                  color: "white",
                  padding: "10px 15px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                Reservar 🎁
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
