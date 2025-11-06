import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from "mercadopago";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

// ======================
// 🔐 Inicialização Firebase
// ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ Credenciais Firebase carregadas das variáveis de ambiente");
  } catch (err) {
    console.error("❌ Erro ao fazer parse do FIREBASE_SERVICE_ACCOUNT:", err);
    process.exit(1);
  }
} else {
  const serviceAccountPath = path.join(__dirname, "service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    console.log("✅ Credenciais Firebase carregadas do arquivo local");
  } else {
    console.error("❌ Nenhuma credencial Firebase encontrada!");
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ======================
// 💳 Mercado Pago
// ======================
const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ======================
// 🌐 Configuração CORS
// ======================
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "https://site-casamento-diego-yasmin.vercel.app";

app.use(
  cors({
    origin: [FRONTEND_ORIGIN, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ======================
// 🧠 Rotas
// ======================

// Healthcheck simples
app.get("/", (req, res) => {
  res.send("Servidor do Casamento está rodando 🚀");
});

// Criação de pagamento
app.post("/create_payment", async (req, res) => {
  try {
    const { presentId, amount, title } = req.body;

    if (!presentId || !amount || !title) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const payment = await new Payment(mp).create({
      body: {
        transaction_amount: Number(amount),
        description: title,
        payment_method_id: "pix",
        payer: { email: "pagador@example.com" },
      },
    });

    const txData = payment.point_of_interaction?.transaction_data || {};

    const paymentInfo = {
      paymentId: payment.id,
      qr_code: txData.qr_code || null,
      qr_base64: txData.qr_code_base64 || null,
      expiresAt: payment.date_of_expiration || null,
      status: payment.status || "pending",
    };

    await db.collection("presents").doc(presentId).update({
      payment: paymentInfo,
    });

    res.json(paymentInfo);
  } catch (err) {
    console.error("❌ Erro ao criar pagamento:", err);
    res.status(500).json({
      error: "Erro ao criar pagamento",
      detail: err.message,
    });
  }
});

// ======================
// 🚀 Inicialização
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Frontend permitido: ${FRONTEND_ORIGIN}`);
});
