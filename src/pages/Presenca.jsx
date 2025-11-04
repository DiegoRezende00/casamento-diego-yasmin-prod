import { useState } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

function Presenca() {
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");

  const confirmarPresenca = async () => {
    if (!codigo) return alert("Por favor, insira o código do convite.");

    try {
      await addDoc(collection(db, "presencas"), {
        codigo,
        confirmadoEm: new Date(),
      });
      setMensagem("🎉 Presença confirmada com sucesso!");
      setCodigo("");
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro ao confirmar presença. Tente novamente.");
    }
  };

  return (
    <div>
      <h2>Confirmar Presença</h2>
      <p>Digite o código do seu convite abaixo:</p>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Ex: CONVITE123"
      />
      <button onClick={confirmarPresenca}>Confirmar</button>
      {mensagem && <p>{mensagem}</p>}
    </div>
  );
}

export default Presenca;
