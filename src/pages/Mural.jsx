import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, onSnapshot } from "firebase/firestore";

function Mural() {
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [recados, setRecados] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "recados"), (snapshot) => {
      const dados = snapshot.docs.map((doc) => doc.data());
      setRecados(dados);
    });
    return () => unsub();
  }, []);

  const enviarRecado = async () => {
    if (!nome || !mensagem) return alert("Preencha todos os campos!");
    await addDoc(collection(db, "recados"), {
      nome,
      mensagem,
      criadoEm: new Date(),
    });
    setNome("");
    setMensagem("");
  };

  return (
    <div>
      <h2>💌 Mural de Recados</h2>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome"
      />
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Deixe seu recado para os noivos"
      />
      <button onClick={enviarRecado}>Enviar</button>

      <div>
        {recados.map((r, i) => (
          <div key={i} className="card">
            <strong>{r.nome}</strong>
            <p>{r.mensagem}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Mural;
