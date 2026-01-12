// Presenca.jsx
import { useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import ModalConfirmacao from "../components/ModalConfirmacao";
import "./Presenca.css";

function Presenca() {
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [nomeConvidado, setNomeConvidado] = useState("");
  const [inviteDocId, setInviteDocId] = useState(null);
  const [maxPessoas, setMaxPessoas] = useState(1);

  const handleComecar = async () => {
    if (!codigo.trim()) {
      setMensagem("Por favor, insira o nome ou o PIN do convite.");
      return;
    }

    setMensagem("Buscando convite...");

    const codigoLower = codigo.trim().toLowerCase();
    const codigoTrimmed = codigo.trim();

    try {
      const invitesRef = collection(db, "invites");
      let q = query(invitesRef, where("pin_convite", "==", codigoTrimmed));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(
          invitesRef,
          where("nome_convite_lower", "==", codigoLower)
        );
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        setMensagem("❌ Esse código/nome não existe em nossa lista de convidados.");
        return;
      }

      const docFound = querySnapshot.docs[0];
      const conviteData = docFound.data();

      setInviteDocId(docFound.id);

      if (conviteData.status === "CONFIRMADO") {
        setMensagem(`⚠️ O convite de ${conviteData.nome_convite} já foi confirmado.`);
        return;
      }

      if (conviteData.status === "AUSENTE") {
        setMensagem(`❌ A presença de ${conviteData.nome_convite} foi cancelada.`);
        return;
      }

      setNomeConvidado(conviteData.nome_convite);
      setMaxPessoas(conviteData.qtd_maxima_permitida || 1);
      setMensagem("");
      setShowModal(true);
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro de conexão. Tente novamente.");
    }
  };

  const confirmarPresenca = async (quantidade) => {
    setShowModal(false);

    if (!inviteDocId) {
      setMensagem("Erro interno ao confirmar.");
      return;
    }

    setMensagem("Registrando sua confirmação...");

    try {
      const inviteDocRef = doc(db, "invites", inviteDocId);

      await updateDoc(inviteDocRef, {
        status: "CONFIRMADO",
        qtd_pessoas_confirmadas: quantidade,
        dataConfirmacao: new Date(),
      });

      setMensagem(
        `🎉 Presença confirmada! ${quantidade} pessoa(s) confirmadas para ${nomeConvidado}.`
      );

      setCodigo("");
      setNomeConvidado("");
      setInviteDocId(null);
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro ao confirmar presença.");
    }
  };

  const naoComparecerei = async () => {
    setShowModal(false);

    if (!inviteDocId) {
      setMensagem("Erro interno ao cancelar.");
      return;
    }

    setMensagem("Registrando sua ausência...");

    try {
      const inviteDocRef = doc(db, "invites", inviteDocId);

      await updateDoc(inviteDocRef, {
        status: "AUSENTE",
        dataCancelamento: new Date(),
      });

      setMensagem(
        `😢 Presença de ${nomeConvidado} foi cancelada.`
      );

      setCodigo("");
      setNomeConvidado("");
      setInviteDocId(null);
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro ao registrar ausência.");
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="content-box">
          <h1 className="main-title">
            Qual o nome que está no convite?
          </h1>

          <p className="subtitle">
            Você pode informar o nome do convite <br />
            ou o PIN enviado por Diego & Yasmin
          </p>

          <div className="form-area">
            <input
              className="input-convite"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Identificação do convite"
            />
            <button className="btn-comecar" onClick={handleComecar}>
              Começar
            </button>
          </div>

          {mensagem && <p className="status-message">{mensagem}</p>}
        </div>
      </div>

      <ModalConfirmacao
        show={showModal}
        codigo={nomeConvidado}
        maxPessoas={maxPessoas}
        onClose={() => setShowModal(false)}
        onConfirmar={confirmarPresenca}
        onNaoComparecer={naoComparecerei}
      />
    </div>
  );
}

export default Presenca;
