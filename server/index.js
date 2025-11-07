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

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
    console.log("✅ Credenciais Firebase carregadas de FIREBASE_SERVICE_ACCOUNT_BASE64");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ Credenciais Firebase carregadas de FIREBASE_SERVICE_ACCOUNT (JSON)");
  } else {
    const serviceAccountPath = path.join(__dirname, "service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      console.log("✅ Credenciais Firebase carregadas do arquivo local");
    } else {
      throw new Error("❌ Nenhuma credencial Firebase encontrada!");
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error("❌ Erro ao inicializar Firebase:", err.message);
  process.exit(1);
}

const db = admin.firestore();

// ======================
// 💳 Mercado Pago
// ======================
const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ======================
// 🌐 CORS
// ======================
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "https://casamento-diego-yasmin-prod.vercel.app",
  "http://localhost:5173",
];
const vercelPattern = /^https:\/\/casamento-diego-yasmin-prod-[a-z0-9]+\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || vercelPattern.test(origin)) cb(null, true);
      else {
        console.log("❌ Bloqueado por CORS:", origin);
        cb(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ======================
// 🧠 Rotas
// ======================
app.get("/", (req, res) => res.send("Servidor do Casamento está rodando 🚀"));

app.post("/create_payment", async (req, res) => {
  try {
    const { presentId, amount, title } = req.body;
    if (!presentId || !amount || !title) return res.status(400).json({ error: "Dados incompletos" });

    const payment = await new Payment(mp).create({
      body: {
        transaction_amount: Number(amount),
        description: title,
        payment_method_id: "pix",
        payer: { email: "pagador@example.com" },
      },
    });

    const txData = payment.point_of_interaction?.transaction_data || {};
    const paymentDoc = {
      presentId,
      title,
      amount,
      paymentId: payment.id,
      qr_code: txData.qr_code || null,
      qr_base64: txData.qr_code_base64 || null,
      expiresAt: payment.date_of_expiration || null,
      status: payment.status || "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const newDoc = await db.collection("payments").add(paymentDoc);
    res.json({ ...paymentDoc, id: newDoc.id });
  } catch (err) {
    console.error("❌ Erro ao criar pagamento:", err);
    res.status(500).json({ error: "Erro ao criar pagamento", detail: err.message });
  }
});

// ======================
// 📡 Webhook Mercado Pago
// ======================
app.post("/webhook", async (req, res) => {
  try {
    const paymentData = req.body?.data?.id;
    if (!paymentData) return res.status(400).send("Sem ID de pagamento");

    const paymentInfo = await new Payment(mp).get({ id: paymentData });
    const status = paymentInfo.status;
    const paymentId = paymentInfo.id;

    const snapshot = await db.collection("payments").where("paymentId", "==", paymentId).get();

    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data();
      const docRef = snapshot.docs[0].ref;
      const presentId = docData.presentId;

      // Atualiza a coleção "payments"
      await docRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Atualiza o presente, se confirmado
      if (status === "approved" || status === "paid") {
        const presentRef = db.collection("presents").doc(presentId);
        await presentRef.update({
          reservado: true,
          "payment.status": status,
          "payment.lastConfirmedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`🎁 Presente ${presentId} marcado como reservado (pagamento ${status})`);
      }

      console.log(`✅ Pagamento ${paymentId} atualizado para ${status}`);
    } else {
      console.log(`⚠️ Nenhum documento encontrado para paymentId: ${paymentId}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    res.sendStatus(500);
  }
});

// ======================
// 🚀 Inicialização
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Domínios permitidos (CORS):`);
  allowedOrigins.forEach((o) => console.log("   -", o));
  console.log("   - (subdomínios temporários da Vercel habilitados)");
});
