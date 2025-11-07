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

const allowedOrigins = [
  "https://casamento-diego-yasmin.vercel.app",
  "https://casamento-diego-yasmin-prod.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else {
        console.warn(`🚫 Bloqueado por CORS: ${origin}`);
        callback(new Error("CORS não permitido"));
      }
    },
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 Firebase Init
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

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const payment = new Payment(client);

// 🏠 Health check
app.get("/", (req, res) => {
  res.send("💍 API do Casamento Diego & Yasmin funcionando!");
});

// 💸 Criar pagamento PIX
app.post("/create_payment", async (req, res) => {
  try {
    const { title, amount, presentId } = req.body;

    if (!title || !amount || !presentId) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    console.log("📦 Criando pagamento para presente:", { title, amount, presentId });

    const body = {
      transaction_amount: Number(amount),
      description: title,
      payment_method_id: "pix",
      payer: { email: "convidado@casamento.com" },
      metadata: { presentId },
    };

    const result = await payment.create({ body });
    const qrData = result.point_of_interaction?.transaction_data;

    if (!qrData) throw new Error("Dados de QRCode ausentes na resposta do Mercado Pago");

    const mp_id = String(result.id);

    // Salva o pagamento no Firestore com mp_id como chave de referência
    await db.collection("payments").doc(mp_id).set({
      presentId,
      title,
      amount,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Atualiza o presente com o mp_id
    const presentRef = db.collection("presents").doc(presentId);
    await presentRef.update({
      "payment.status": "pending",
      "payment.mp_id": mp_id,
    });

    res.status(200).json({
      mp_id,
      qr_code: qrData.qr_code,
      qr_base64: qrData.qr_code_base64,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// 🔔 Webhook Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    console.log("📬 Webhook recebido:", JSON.stringify(req.body));

    const paymentId = String(req.body?.data?.id);
    if (!paymentId) return res.sendStatus(400);

    const response = await payment.get({ id: paymentId });
    const { status, metadata } = response;

    let presentId = metadata?.presentId || null;

    // 🔍 Atualiza o documento do pagamento (centro da sincronização)
    const paymentRef = db.collection("payments").doc(paymentId);
    await paymentRef.set(
      {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 🔗 Atualiza o presente vinculado
    if (!presentId) {
      const snapshot = await db
        .collection("payments")
        .doc(paymentId)
        .get();
      presentId = snapshot.data()?.presentId || null;
    }

    if (presentId) {
      const presentRef = db.collection("presents").doc(presentId);
      await presentRef.update({
        "payment.status":
          status === "approved"
            ? "paid"
            : ["cancelled", "rejected", "expired"].includes(status)
            ? "cancelled"
            : status,
        "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`🪙 Pagamento ${paymentId} (${status}) vinculado ao presente ${presentId}`);
    } else {
      console.warn(`⚠️ Nenhum presente vinculado ao pagamento ${paymentId}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// 🚀 Start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
