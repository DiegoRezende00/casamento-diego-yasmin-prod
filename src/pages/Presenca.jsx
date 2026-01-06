// Presenca.jsx

import { useState } from "react";
import { 
    db 
} from "../firebase";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc,
    updateDoc
} from "firebase/firestore"; 
import ModalConfirmacao from '../components/ModalConfirmacao';
import './Presenca.css'; 

function Presenca() {
    const [codigo, setCodigo] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [nomeConvidado, setNomeConvidado] = useState("");
    const [inviteDocId, setInviteDocId] = useState(null); 

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
            let q;
            let querySnapshot;

            q = query(invitesRef, where("pin_convite", "==", codigoTrimmed));
            querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                q = query(invitesRef, where("nome_convite_lower", "==", codigoLower));
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                const docFound = querySnapshot.docs[0];
                const conviteData = docFound.data();
                
                setInviteDocId(docFound.id);

                if (conviteData.status === "CONFIRMADO") {
                    setMensagem(`⚠️ O código de ${conviteData.nome_convite || codigoTrimmed} já foi confirmado!`);
                    return;
                }

                if (conviteData.status === "AUSENTE") {
                    setMensagem(`❌ Presença para ${conviteData.nome_convite || codigoTrimmed} já foi cancelada.`);
                    return; 
                }

                setNomeConvidado(conviteData.nome_convite || codigoTrimmed);
                setMensagem(""); 
                setShowModal(true);
            } else {
                setMensagem("❌ Esse código/nome não existe em nossa lista de convidados.");
            }
        } catch (error) {
            console.error("Erro ao buscar convite:", error);
            setMensagem("❌ Erro de conexão. Tente novamente mais tarde.");
        }
    };

    const confirmarPresenca = async () => {
        setShowModal(false);
        
        if (!inviteDocId) {
            setMensagem("Erro interno: ID do convite não encontrado para confirmação.");
            return;
        }

        setMensagem("Registrando sua confirmação...");

        try {
            const inviteDocRef = doc(db, "invites", inviteDocId);
            
            await updateDoc(inviteDocRef, {
                status: "CONFIRMADO", 
                dataConfirmacao: new Date(),
            });
            
            setMensagem(`🎉 Presença de ${nomeConvidado} confirmada com sucesso!`);
            setCodigo("");
            setNomeConvidado("");
            setInviteDocId(null);
        } catch (error) {
            console.error("Erro ao confirmar presença:", error);
            setMensagem("❌ Erro ao confirmar presença. Tente novamente.");
        }
    };

    const naoComparecerei = async () => {
        setShowModal(false);
        
        if (!inviteDocId) {
            setMensagem("Erro interno: ID do convite não encontrado para cancelamento.");
            return;
        }

        setMensagem("Registrando sua ausência...");
        
        try {
            const inviteDocRef = doc(db, "invites", inviteDocId);

            await updateDoc(inviteDocRef, {
                status: "AUSENTE",
                dataCancelamento: new Date(),
            });
            
            setMensagem(`😢 Entendido! Presença de ${nomeConvidado} foi cancelada. Sentiremos sua falta.`);
            setCodigo("");
            setNomeConvidado("");
            setInviteDocId(null);
        } catch (error) {
            console.error("Erro ao registrar ausência:", error);
            setMensagem("❌ Erro ao registrar ausência. Tente novamente.");
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
                        Você pode informar o nome do convite <br /> ou o PIN enviado por Yasmin & Diego
                    </p>

                    <div className="form-area">
                        <input
                            className="input-convite" 
                            type="text"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value.toLowerCase())}
                            placeholder="Identificação do convite"
                        />
                        <button 
                            className="btn-comecar" 
                            onClick={handleComecar}
                        >
                            Começar
                        </button>
                    </div>

                    {mensagem && <p className="status-message">{mensagem}</p>}
                </div>
            </div>

            <ModalConfirmacao
                show={showModal}
                codigo={nomeConvidado || codigo} 
                onClose={() => setShowModal(false)} 
                onConfirmar={confirmarPresenca} 
                onNaoComparecer={naoComparecerei} 
            />
        </div>
    );
}

export default Presenca;
