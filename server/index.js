import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from "mercadopago";
import admin from "firebase-admin";
import fs from "fs";

// 🔹 Carrega variáveis do .env
dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// 🔹 Inicializa o Firebase Admin com a conta de serviço
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Arquivo service-account.json não encontrado em:",
    serviceAccountPath
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
console.log("✅ Conectado ao Firebase Firestore");

// 🔹 Configura o SDK do Mercado Pago (nova versão)
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// 🔹 Endpoint para criar pagamento PIX
app.post("/create_payment", async (req, res) => {
  try {
    const { amount, title, presentId, buyerEmail } = req.body;

    if (!amount || !title) {
      return res.status(400).json({ error: "amount e title são obrigatórios" });
    }

    const payment = new Payment(client);
    const response = await payment.create({
      body: {
        transaction_amount: Number(amount),
        description: title,
        payment_method_id: "pix",
        payer: {
          email: buyerEmail || "test_user_123456@testuser.com",
        },
      },
    });

    const transaction = response.point_of_interaction.transaction_data;

    // 🔹 Salva no Firestore
    await db.collection("payments").doc(String(response.id)).set({
      id: response.id,
      title,
      amount,
      presentId,
      status: response.status,
      createdAt: new Date(),
      qr_code: transaction.qr_code,
      qr_code_base64: transaction.qr_code_base64,
    });

    res.json({
      paymentId: response.id,
      qr_code: transaction.qr_code,
      qr_base64: transaction.qr_code_base64,
      expiresAt: response.date_of_expiration,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Webhook para receber atualizações de pagamento
app.post("/webhook", async (req, res) => {
  try {
    const payment = req.body;
    console.log("📩 Webhook recebido:", payment);

    if (payment && payment.data && payment.data.id) {
      const paymentId = String(payment.data.id);

      await db.collection("payments").doc(paymentId).update({
        status: payment.type,
        updatedAt: new Date(),
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// 🔹 Endpoint de teste (ping)
app.get("/", (req, res) => {
  res.send("✅ Wedding Server rodando com Mercado Pago Sandbox!");
});

// 🔹 Inicia o servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
