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
    doc,         // 🌟 Novo Import: Para referenciar um documento específico
    updateDoc    // 🌟 Novo Import: Para atualizar um documento
} from "firebase/firestore"; 
import ModalConfirmacao from '../components/ModalConfirmacao';
import './Presenca.css'; 

function Presenca() {
    const [codigo, setCodigo] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [nomeConvidado, setNomeConvidado] = useState(""); 
    // 🌟 Novo Estado: Para armazenar o ID do documento encontrado na coleção 'invites'
    const [inviteDocId, setInviteDocId] = useState(null); 
    
    // NOTA: A transformação para minúsculas é feita AQUI, na busca, mantendo a liberdade de digitação do usuário.

    const handleComecar = async () => {
        if (!codigo.trim()) {
            setMensagem("Por favor, insira o nome ou o PIN do convite.");
            return;
        }
        setMensagem("Buscando convite...");

        const codigoLower = codigo.trim().toLowerCase(); // Para busca por nome
        const codigoTrimmed = codigo.trim(); // Para busca por PIN (se for case-sensitive)

        try {
            const invitesRef = collection(db, "invites");
            let q;
            let querySnapshot;

            // 1. Tenta buscar pelo PIN
            q = query(invitesRef, where("pin_convite", "==", codigoTrimmed));
            querySnapshot = await getDocs(q);

            // 2. Se não encontrou pelo PIN, tenta buscar pelo nome
            if (querySnapshot.empty) {
                q = query(invitesRef, where("nome_convite_lower", "==", codigoLower)); 
                querySnapshot = await getDocs(q);
            }
            
            // 3. Verifica o resultado
            if (!querySnapshot.empty) {
                const docFound = querySnapshot.docs[0];
                const conviteData = docFound.data();
                
                // 🌟 ESSENCIAL: Armazena o ID do documento para uso no updateDoc
                setInviteDocId(docFound.id);

                // --- Verificação de Status ---
                
                // A) JÁ CONFIRMADO (Requisito 1)
                if (conviteData.status === "CONFIRMADO") {
                    setMensagem(`⚠️ O código de ${conviteData.nome_convite || codigoTrimmed} já foi confirmado!`);
                    return; // Para o processo
                }

                // B) JÁ CANCELADO (Requisito 2)
                if (conviteData.status === "AUSENTE") {
                    setMensagem(`❌ Presença para ${conviteData.nome_convite || codigoTrimmed} já foi cancelada.`);
                    // Vamos parar o processo, pois o usuário já tem uma ação registrada
                    return; 
                }

                // Se PENDENTE, prossegue para o Modal
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
        // Garante que temos um ID para atualizar
        if (!inviteDocId) {
            setMensagem("Erro interno: ID do convite não encontrado para confirmação.");
            return;
        }

        setMensagem("Registrando sua confirmação...");

        try {
            // 🌟 Atualiza o documento em 'invites' com o novo status
            const inviteDocRef = doc(db, "invites", inviteDocId);
            
            await updateDoc(inviteDocRef, {
                status: "CONFIRMADO", 
                dataConfirmacao: new Date(),
            });
            
            setMensagem(`🎉 Presença de ${nomeConvidado} confirmada com sucesso!`);
            setCodigo("");
            setNomeConvidado("");
            setInviteDocId(null); // Limpa o ID após a conclusão
        } catch (error) {
            console.error("Erro ao confirmar presença:", error);
            setMensagem("❌ Erro ao confirmar presença. Tente novamente.");
        }
    };

    const naoComparecerei = async () => {
        setShowModal(false);
        // Garante que temos um ID para atualizar
        if (!inviteDocId) {
            setMensagem("Erro interno: ID do convite não encontrado para cancelamento.");
            return;
        }

        setMensagem("Registrando sua ausência...");
        
        try {
            // 🌟 Atualiza o documento em 'invites' com o novo status
            const inviteDocRef = doc(db, "invites", inviteDocId);

            await updateDoc(inviteDocRef, {
                status: "AUSENTE",
                dataCancelamento: new Date(), // Adiciona um campo de registro de cancelamento
            });
            
            setMensagem(`😢 Entendido! Presença de ${nomeConvidado} foi cancelada. Sentiremos sua falta.`);
            setCodigo("");
            setNomeConvidado("");
            setInviteDocId(null); // Limpa o ID após a conclusão
        } catch (error) {
            console.error("Erro ao registrar ausência:", error);
            setMensagem("❌ Erro ao registrar ausência. Tente novamente.");
        }
    };

    return (
        <div className="page-container">
            <div className="content-box">
                <h1 className="main-title">
                    Qual o nome que está no convite?
                </h1>
                <p className="subtitle">
                    Você pode informar o nome do convite <br /> ou o PIN enviado por Diego & Yasmin
                </p>

                <div className="form-area">
                    <input
                        className="input-convite" 
                        type="text"
                        value={codigo}
                        // O valor é armazenado com upper/lower case
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