import React, { useEffect, useState, useRef } from "react";
import presenteImg from "../assets/presente.jpg";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot as onDocSnapshot,
} from "firebase/firestore";
import axios from "axios";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [funPresents, setFunPresents] = useState([]);

  const [sortCasa, setSortCasa] = useState("az");
  const [sortFun, setSortFun] = useState("az");

  const [loadingId, setLoadingId] = useState(null);
  const [selectedGift, setSelectedGift] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [copyCode, setCopyCode] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nomePresenteador, setNomePresenteador] = useState("");
  const [giftToConfirm, setGiftToConfirm] = useState(null);

  const transUnsubRef = useRef(null);

  /* ================= FIREBASE ================= */

  useEffect(() => {
    return onSnapshot(collection(db, "presents"), (snap) => {
      setPresentes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "funPresents"), (snap) => {
      setFunPresents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  /* ================= UTIL ================= */

  const ordenar = (lista, sort) => {
    const arr = [...lista];
    switch (sort) {
      case "menor":
        arr.sort((a, b) => Number(a.preco) - Number(b.preco));
        break;
      case "maior":
        arr.sort((a, b) => Number(b.preco) - Number(a.preco));
        break;
      case "za":
        arr.sort((a, b) => b.nome.localeCompare(a.nome));
        break;
      default:
        arr.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return arr;
  };

  /* ================= MODAL ================= */

  const abrirModal = (p, collectionName) => {
    setGiftToConfirm({ ...p, collectionName });
    setNomePresenteador("");
    setShowConfirmModal(true);
  };

  const confirmarPresente = async () => {
    if (!nomePresenteador.trim()) {
      alert("Informe o nome de quem está presenteando.");
      return;
    }

    const p = giftToConfirm;
    setShowConfirmModal(false);

    try {
      setLoadingId(p.id);
      setSelectedGift(p);
      setQrCode(null);
      setCopyCode("");
      setPaymentConfirmed(false);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        { title: p.nome, amount: p.preco, presentId: p.id },
        { headers: { "Content-Type": "application/json" } }
      );

      const paymentId = data.paymentId || data.id;
      if (!paymentId) throw new Error("paymentId ausente");

      if (data.qr_base64)
        setQrCode(`data:image/png;base64,${data.qr_base64}`);
      if (data.qr_code) setCopyCode(data.qr_code);

      await setDoc(
        doc(db, p.collectionName, p.id, "transactions", paymentId),
        {
          nomePresenteador: nomePresenteador.trim(),
          presente: p.nome,
          valor: p.preco,
          status: "pending",
          createdAt: serverTimestamp(),
        }
      );

      const transRef = doc(
        db,
        p.collectionName,
        p.id,
        "transactions",
        paymentId
      );

      const unsub = onDocSnapshot(transRef, (snap) => {
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

          unsub();
        }
      });

      transUnsubRef.current = unsub;
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar pagamento.");
    } finally {
      setLoadingId(null);
    }
  };

  const copiarQRCode = () => {
    navigator.clipboard.writeText(copyCode);
    alert("Código Pix copiado!");
  };

  /* ================= UI ================= */

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* BANNER */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          background: "#f5f8f6",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <img
          src={presenteImg}
          alt="Presente"
          style={{ maxWidth: 260, borderRadius: 12 }}
        />
        <div>
          <h2 style={{ color: "#2e7d32" }}>Lista de Presentes</h2>
          <p>Ficamos muito felizes em compartilhar esse momento com você 💚</p>
        </div>
      </div>

      <h2 style={{ textAlign: "center", color: "#2e7d32" }}>🏡 CASA COMPLETA</h2>
      <Filtro value={sortCasa} onChange={setSortCasa} />

      <Grid
        lista={ordenar(presentes, sortCasa)}
        cor="#2e7d32"
        onPresentear={(p) => abrirModal(p, "presents")}
        loadingId={loadingId}
      />

      <h2 style={{ textAlign: "center", color: "#8e24aa", marginTop: 40 }}>
        🎉 LISTA DIVERTIDA
      </h2>
      <Filtro value={sortFun} onChange={setSortFun} />

      <Grid
        lista={ordenar(funPresents, sortFun)}
        cor="#8e24aa"
        onPresentear={(p) => abrirModal(p, "funPresents")}
        loadingId={loadingId}
      />

      {/* MODAL CONFIRMAÇÃO */}
      {showConfirmModal && (
        <Modal>
          <h3 style={{ textAlign: "center" }}>Quem está presenteando?</h3>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              value={nomePresenteador}
              onChange={(e) => setNomePresenteador(e.target.value)}
              placeholder="Seu nome"
              style={{
                width: "100%",
                maxWidth: 280,
                padding: 12,
                marginTop: 20,
                borderRadius: 8,
                border: "1px solid #ccc",
                textAlign: "center",
              }}
            />
          </div>

          <ModalActions
            onCancel={() => setShowConfirmModal(false)}
            onConfirm={confirmarPresente}
          />
        </Modal>
      )}

      {/* MODAL PAGAMENTO */}
      {(qrCode || paymentConfirmed) && selectedGift && (
        <Modal>
          {paymentConfirmed ? (
            <h2 style={{ color: "#2e7d32", textAlign: "center" }}>
              ✅ Pagamento confirmado!
            </h2>
          ) : (
            <>
              <img
                src={qrCode}
                alt="QR Code"
                style={{ display: "block", margin: "0 auto 20px" }}
                width={240}
              />
              <button
                onClick={copiarQRCode}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  background: "#2e7d32",
                  color: "#fff",
                  border: "none",
                }}
              >
                Copiar código Pix
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ================= COMPONENTES ================= */

const Filtro = ({ value, onChange }) => (
  <div style={{ textAlign: "center", margin: "15px 0" }}>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="az">A → Z</option>
      <option value="za">Z → A</option>
      <option value="menor">Menor valor</option>
      <option value="maior">Maior valor</option>
    </select>
  </div>
);

const Grid = ({ lista, cor, onPresentear, loadingId }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
      gap: 24,
    }}
  >
    {lista.map((p) => (
      <div
        key={p.id}
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          textAlign: "center",
          border: "1px solid #e0e0e0",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {p.imagemUrl && (
          <div
            style={{
              width: "100%",
              height: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
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

        <h3 style={{ color: cor, marginTop: 10 }}>{p.nome}</h3>
        <p>R$ {Number(p.preco).toFixed(2)}</p>

        <button
          onClick={() => onPresentear(p)}
          disabled={loadingId === p.id}
          style={{
            marginTop: "auto",
            background: cor,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Presentear 🎁
        </button>
      </div>
    ))}
  </div>
);

const Modal = ({ children }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 2000,
    }}
  >
    <div
      style={{
        background: "#fff",
        padding: 24,
        borderRadius: 14,
        maxWidth: 420,
        width: "100%",
      }}
    >
      {children}
    </div>
  </div>
);

const ModalActions = ({ onCancel, onConfirm }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 25 }}>
    <button onClick={onCancel} style={{ flex: 1, padding: 10 }}>
      Cancelar
    </button>
    <button
      onClick={onConfirm}
      style={{
        flex: 1,
        padding: 10,
        background: "#2e7d32",
        color: "#fff",
        border: "none",
        borderRadius: 6,
      }}
    >
      Gerar QR Code
    </button>
  </div>
);
