import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function Presentes() {
  const [presentes, setPresentes] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [countdown, setCountdown] = useState(900); // 15 minutos
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "presents"), (snapshot) => {
      setPresentes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // 🔹 Timer de contagem regressiva (15 minutos)
  useEffect(() => {
    if (!paymentData) return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentData, countdown]);

  // 🔹 Listener para detectar pagamento confirmado (via Firestore)
  useEffect(() => {
    if (!paymentData?.id) return;
    const unsub = onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const doc = snapshot.docs.find((d) => d.id === paymentData.id);
        if (doc && doc.data().status === "approved") {
          setShowSuccess(true);
          setPaymentData(null);
          setSelectedGift(null);
        }
      }
    );
    return () => unsub();
  }, [paymentData]);

  const reservar = async (gift) => {
    setSelectedGift(gift);
  };

  const confirmarReserva = async () => {
    if (!selectedGift) return;
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create_payment`,
        {
          title: selectedGift.nome,
          amount: selectedGift.preco,
          presentId: selectedGift.id,
        }
      );
      setPaymentData(data);
      setCountdown(900);
    } catch (err) {
      console.error("Erro ao criar pagamento:", err);
      alert("Erro ao iniciar o pagamento. Verifique o console.");
    }
  };

  const copiarQRCode = () => {
    if (!paymentData?.qr_code) return;
    navigator.clipboard.writeText(paymentData.qr_code);
    alert("QR Code copiado para a área de transferência!");
  };

  const minutos = Math.floor(countdown / 60);
  const segundos = countdown % 60;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <h2 className="text-center text-3xl font-semibold text-green-700 mb-10">
        🎁 Lista de Presentes
      </h2>

      {/* Grade de presentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {presentes.map((p) => (
          <motion.div
            key={p.id}
            className="bg-white p-4 rounded-2xl shadow-md text-center hover:shadow-lg transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {p.imagemUrl && (
              <img
                src={p.imagemUrl}
                alt={p.nome}
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}
            <h3 className="text-green-700 text-lg font-semibold mb-1">
              {p.nome}
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>Valor:</strong> R$ {Number(p.preco).toFixed(2)}
            </p>
            <button
              onClick={() => reservar(p)}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              Presentear 🎁
            </button>
          </motion.div>
        ))}
      </div>

      {/* 🔹 Modal de confirmação */}
      <AnimatePresence>
        {selectedGift && !paymentData && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-xl font-semibold text-green-700 mb-3">
                Confirmar Presente
              </h3>
              <p className="text-gray-700 mb-6">
                Deseja reservar <strong>{selectedGift.nome}</strong> por{" "}
                <strong>R$ {Number(selectedGift.preco).toFixed(2)}</strong>?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={confirmarReserva}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Sim, gerar pagamento
                </button>
                <button
                  onClick={() => setSelectedGift(null)}
                  className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔹 Modal QR Code */}
      <AnimatePresence>
        {paymentData && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-2xl text-center shadow-lg max-w-sm w-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-green-700 font-semibold text-xl mb-2">
                Pagamento de {selectedGift.nome}
              </h3>
              <p className="text-gray-600 mb-3">
                Escaneie o QR Code abaixo. Expira em:
              </p>
              <p className="text-lg font-semibold text-red-600 mb-4">
                {minutos}:{segundos.toString().padStart(2, "0")}
              </p>
              {paymentData.qr_base64 && (
                <img
                  src={`data:image/png;base64,${paymentData.qr_base64}`}
                  alt="QR Code Pix"
                  className="mx-auto w-56 h-56 rounded-lg border mb-3"
                />
              )}
              <input
                type="text"
                value={paymentData.qr_code || ""}
                readOnly
                className="w-full border rounded-lg p-2 text-center text-sm text-gray-600 mb-2"
              />
              <button
                onClick={copiarQRCode}
                className="bg-green-600 text-white px-4 py-2 rounded-lg w-full hover:bg-green-700 transition"
              >
                Copiar QR Code
              </button>
              <button
                onClick={() => setPaymentData(null)}
                className="mt-4 text-gray-600 underline text-sm"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔹 Popup de sucesso */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSuccess(false)}
          >
            <motion.div
              className="bg-white p-8 rounded-2xl text-center shadow-lg max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h3 className="text-green-700 text-xl font-semibold mb-3">
                💚 Pagamento Confirmado!
              </h3>
              <p className="text-gray-700 mb-4">
                Seu presente foi recebido com sucesso. Muito obrigado! 🎉
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
