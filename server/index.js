// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from "mercadopago";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(express.json());

// CORS: aceita a origem do frontend definida em env (ou qualquer localhost enquanto dev)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// ----- Firebase Admin init -----
// Prioriza variável de ambiente FIREBASE_SERVICE_ACCOUNT (JSON completo)
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountEnv) {
  console.error(
    "❌ Nenhuma credencial Firebase encontrada. Configure FIREBASE_SERVICE_ACCOUNT"
  );
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountEnv);
  console.log(
    "🔒 Usando service account vindo de env (FIREBASE_SERVICE_ACCOUNT)."
  );
} catch (err) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT inválido (JSON):", err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
console.log("✅ Conectado ao Firebase Firestore");

// ----- Mercado Pago init -----
const MODE = (process.env.MODE || "sandbox").toLowerCase(); // "sandbox" | "live"
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
if (!MP_ACCESS_TOKEN) {
  console.error(
    "❌ MP_ACCESS_TOKEN não definido no .env ou variável de ambiente"
  );
  process.exit(1);
}
const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
console.log(`🔌 Mercado Pago configurado (MODE=${MODE})`);

// Utility: cria payment e retorna objeto padronizado
app.post("/create_payment", async (req, res) => {
  try {
    const { amount, title, presentId, buyerEmail } = req.body;
    if (!amount || !title)
      return res.status(400).json({ error: "amount e title são obrigatórios" });

    const payment = new Payment(client);
    const response = await payment.create({
      body: {
        transaction_amount: Number(amount),
        description: title,
        payment_method_id: "pix",
        payer: { email: buyerEmail || "test_user_123456@testuser.com" },
      },
      requestOptions: {
        idempotencyKey: `p-${presentId || "unknown"}-${Date.now()}`,
      },
    });

    const transaction = response.point_of_interaction?.transaction_data || {};

    if (presentId) {
      const presentRef = db.collection("presents").doc(presentId);
      await presentRef.set(
        {
          payment: {
            id: String(response.id),
            status: response.status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: response.date_of_expiration || null,
            qr_code: transaction.qr_code || null,
            qr_code_base64: transaction.qr_code_base64 || null,
            amount: Number(amount),
          },
        },
        { merge: true }
      );
    }

    await db
      .collection("payments")
      .doc(String(response.id))
      .set({
        id: String(response.id),
        presentId: presentId || null,
        title,
        amount: Number(amount),
        status: response.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        qr_code: transaction.qr_code || null,
        qr_code_base64: transaction.qr_code_base64 || null,
      });

    res.json({
      paymentId: String(response.id),
      qr_code: transaction.qr_code || null,
      qr_base64: transaction.qr_code_base64 || null,
      expiresAt: response.date_of_expiration || null,
    });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento:", err?.message || err);
    return res.status(500).json({
      error: "create_payment_failed",
      detail: err?.message || err,
    });
  }
});

// Webhook do Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Webhook MP recebido:", body);

    let paymentId = body?.data?.id || body?.id || body?.resource?.id;
    if (!paymentId) {
      console.warn("Webhook sem payment id.");
      return res.sendStatus(200);
    }

    try {
      const mpPayment = await new Payment(client).get(paymentId);
      const mpBody = mpPayment;
      const status =
        mpBody.status || (mpBody.body && mpBody.body.status) || null;

      await db.collection("payments").doc(paymentId).set(
        {
          status: status,
          raw: mpBody,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const presentsQuery = await db
        .collection("presents")
        .where("payment.id", "==", paymentId)
        .get();
      if (!presentsQuery.empty) {
        const docRef = presentsQuery.docs[0].ref;
        await docRef.update({
          "payment.status": status,
          "payment.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (mpErr) {
      console.error(
        "❌ Erro ao buscar payment no MP dentro do webhook:",
        mpErr?.message || mpErr
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    res.sendStatus(500);
  }
});

// health check
app.get("/", (req, res) => res.send("✅ Wedding Server rodando"));

// start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));
