import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from "mercadopago";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

// 🌐 CORS — permite apenas o domínio de produção e localhost
const allowedOrigins = [
  "https://casamento-diego-yasmin.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requests sem origin (como em ferramentas internas ou backend)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 Bloqueado por CORS: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// 🧩 Caminhos utilitários
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Firebase config (Render + local)
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
    serviceAccount = JSON.parse(decoded);
    console.log("✅ Firebase service account carregado via variável de ambiente");
  } else {
    const serviceAccountPath = path.join(__dirname, "service-account.json");
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    console.log("✅ Firebase service account carregado via arquivo local");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
}

const db = admin.firestore();

// 💰 Mercado Pago config
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const payment = new Payment(client);

// 🏠 Health check
app.get("/", (req, res) => {
  res.send("💍 Servidor do Casamento Diego & Yasmin está rodando com sucesso!");
});

// 💸 Criar pagamento PIX
app.post("/create_payment", async (req, res) => {
  try {
    const { title, amount, presentId } = req.body;

    if (!title || !amount || !presentId) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const body = {
      transaction_amount: Number(amount),
      description: title,
      payment_method_id: "pix",
      payer: { email: "convidado@casamento.com" },
      metadata: { presentId },
    };

    const result = await payment.create({ body });

    // Atualiza Firestore: status "pending"
    const presentRef = db.collection("presents").doc(presentId);
    await presentRef.update({
      "payment.status": "pending",
      "payment.createdAt": admin.firestore.FieldValue.serverTimestamp(),
      "payment.mp_id": result.id,
    });

    res.status(200).json({
      id: result.id,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_base64: result.point_of_interaction.transaction_data.qr_code_base64,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// 🔔 Webhook Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    console.log("📬 Webhook recebido:", req.body);

    const paymentId = req.body?.data?.id;
    if (!paymentId) return res.sendStatus(400);

    // Consulta detalhada no Mercado Pago
    const response = await payment.get({ id: paymentId });
    const { status, metadata } = response;

    console.log(`🔎 Pagamento ${paymentId} status: ${status}`);

    // Busca o presentId
    let presentId = metadata?.presentId;
    if (!presentId) {
      const snapshot = await db
        .collection("presents")
        .where("payment.mp_id", "==", paymentId)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        presentId = snapshot.docs[0].id;
      }
    }

    if (!presentId) {
      console.warn(`⚠️ Nenhum presente vinculado ao pagamento ${paymentId}`);
      return res.sendStatus(200);
    }

    const presentRef = db.collection("presents").doc(presentId);

    // Atualiza Firestore conforme status do pagamento
    const updateData = {
      "payment.status":
        status === "approved"
          ? "paid"
          : ["cancelled", "rejected", "expired"].includes(status)
          ? "cancelled"
          : status,
      "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    };

    await presentRef.update(updateData);

    if (status === "approved") {
      console.log(`🎉 Presente ${presentId} marcado como pago ✅`);
    } else {
      console.log(`ℹ️ Pagamento ${paymentId} atualizado para ${status}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// 🚀 Inicia servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (modo produção)`);
});
