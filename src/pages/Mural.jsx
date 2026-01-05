import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import ModalRecado from "../components/ModalRecado";
import "./Mural.css";

export default function Mural() {
  const [recados, setRecados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "recados"), (snapshot) => {
      setRecados(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, []);

  return (
    <div className="mural-container">
      <h2>Mural de Recados 💌</h2>

      {recados.length === 0 ? (
        <p>Seja o primeiro a deixar um recado para Yasmin & Diego!</p>
      ) : (
        <div className="recados-lista">
          {recados.map((r, i) => (
            <div className="recado" key={i}>
              <h4>{r.nome}</h4>
              <p>{r.mensagem}</p>
              {r.email && <span>{r.email}</span>}
            </div>
          ))}
        </div>
      )}

      <button className="btn-adicionar" onClick={() => setModalOpen(true)}>
        + Adicione seu recado
      </button>

      {modalOpen && <ModalRecado onClose={() => setModalOpen(false)} />}
    </div>
  );
}
