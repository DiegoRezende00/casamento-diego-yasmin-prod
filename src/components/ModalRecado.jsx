import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./ModalRecado.css";

export default function ModalRecado({ onClose }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleEnviar = async () => {
    if (!nome || !mensagem) {
      alert("Nome e mensagem são obrigatórios!");
      return;
    }
    await addDoc(collection(db, "recados"), {
      nome,
      email,
      mensagem,
      data: serverTimestamp(),
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Deixe seu recado 💌</h3>
        <input
          type="text"
          placeholder="Seu nome *"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          type="email"
          placeholder="Seu e-mail (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          placeholder="Escreva sua mensagem..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        ></textarea>
        <div className="modal-buttons">
          <button onClick={handleEnviar}>Enviar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
