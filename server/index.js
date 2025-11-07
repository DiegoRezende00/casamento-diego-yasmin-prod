// server/index.js
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
app.use(cors({
  origin: [
    "https://casamento-diego-yasmin-prod.vercel.app",
    "http://localhost:5173",
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));

// Caminho seguro da chave Firebase
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const firebasePath = path.join(__dirname, "firebase-key.json");

// 🔹 Inicializa o Firebase
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(firebasePath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// 🔹 Mercado Pago
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(mpClient);

// ==========================
// 🔹 Endpoint: criar pagamento
// ==========================
app.post("/create_payment", async (req, res) => {
  try {
    const { title, amount, presentId } = req.body;

    const body = {
      transaction_amount: Number(amount),
      description: title,
      payment_method_id: "pix",
      payer: { email: "pagador@example.com" },
      notification_url: `${process.env.API_URL}/webhook`,
    };

    const result = await payment.create({ body });

    // 🔹 Atualiza o Firestore com o paymentId e status "pending"
    await db.collection("presents").doc(presentId).update({
      "payment.paymentId": result.id,
      "payment.status": "pending",
      "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      id: result.id,
      qr_base64: result.point_of_interaction.transaction_data.qr_code_base64,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
    });
  } catch (err) {
    console.error("Erro ao criar pagamento:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 🔹 Endpoint: webhook Mercado Pago
// ==========================
app.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.body.data?.id;
    if (!paymentId) return res.status(400).json({ error: "Sem ID do pagamento" });

    const result = await payment.get({ id: paymentId });

    const status = result.status; // "approved", "pending", "rejected", etc.
    const snapshot = await db
      .collection("presents")
      .where("payment.paymentId", "==", paymentId)
      .get();

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        "payment.status": status,
        "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Pagamento ${paymentId} atualizado para ${status}`);
    } else {
      console.warn(`⚠️ Nenhum presente encontrado para paymentId ${paymentId}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.sendStatus(500);
  }
});

app.listen(10000, () => console.log("Servidor rodando na porta 10000"));
