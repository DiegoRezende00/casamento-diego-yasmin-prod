// index.js (backend) - pronto para deploy (Render / Vercel server)
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

// ==== CORS: permitir seu domínio de produção e localhost + preview Vercel ====
const allowedOrigins = [
  "https://casamento-diego-yasmin.vercel.app",
  "https://casamento-diego-yasmin-prod.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // tools / server-to-server
      // permitir previews do vercel com prefixo
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("https://casamento-diego-yasmin-prod-")
      ) {
        return callback(null, true);
      }
      console.warn("🚫 Bloqueado por CORS:", origin);
      return callback(new Error("CORS não permitido"));
    },
    credentials: true,
  })
);

// ==== __dirname utilitário (ESM) ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==== Firebase init (env FIREBASE_SERVICE_ACCOUNT base64 OR local file) ====
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // variável deve ser o JSON codificado em base64
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
    serviceAccount = JSON.parse(decoded);
    console.log("✅ Firebase service account carregado via variável de ambiente");
  } else {
    // fallback (apenas para dev)
    const serviceAccountPath = path.join(__dirname, "service-account.json");
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("service-account.json não encontrado e FIREBASE_SERVICE_ACCOUNT não setada");
    }
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    console.log("✅ Firebase service account carregado via arquivo local");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (err) {
  console.error("❌ Erro ao inicializar Firebase:", err);
  // não exit here for safety in some hosts, but requests using DB will fail
}

const db = admin.firestore();

// ==== Mercado Pago client ====
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const mpPayment = new Payment(mpClient);

// ==== Healthcheck ====
app.get("/", (req, res) => {
  res.send("💍 API do Casamento Diego & Yasmin funcionando!");
});

// ==== Cria pagamento (PIX) ====
// Recebe { title, amount, presentId } e cria:
// - payments/{mp_id}
// - presents/{presentId}/transactions/{mp_id}
app.post("/create_payment", async (req, res) => {
  try {
    const { title, amount, presentId } = req.body || {};
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

    const result = await mpPayment.create({ body });
    const qrData = result.point_of_interaction?.transaction_data;

    if (!qrData) {
      console.error("❌ Resposta do MP sem transaction_data:", result);
      return res.status(500).json({ error: "Resposta inválida do Mercado Pago" });
    }

    const mp_id = String(result.id);

    // 1) registra em payments/{mp_id}
    await db.collection("payments").doc(mp_id).set({
      presentId,
      title,
      amount: Number(amount),
      status: "pending",
      mp_id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      qr_code: qrData.qr_code || null,
    });

    // 2) registra na subcoleção do produto: presents/{presentId}/transactions/{mp_id}
    await db
      .collection("presents")
      .doc(presentId)
      .collection("transactions")
      .doc(mp_id)
      .set({
        presentId,
        title,
        amount: Number(amount),
        status: "pending",
        mp_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        qr_code: qrData.qr_code || null,
      });

    // Retorna para o frontend as infos necessárias
    return res.status(200).json({
      mp_id,
      qr_code: qrData.qr_code,
      qr_base64: qrData.qr_code_base64,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    return res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// ==== Webhook Mercado Pago ====
// Atualiza payments/{mp_id} e presents/{presentId}/transactions/{mp_id}
app.post("/webhook", async (req, res) => {
  try {
    console.log("📬 Webhook recebido:", JSON.stringify(req.body));

    const paymentId = String(req.body?.data?.id || req.body?.data?.id?.toString?.());
    if (!paymentId) {
      console.warn("Webhook sem payment id");
      return res.sendStatus(400);
    }

    // Buscar detalhado no Mercado Pago para pegar status e metadata
    const response = await mpPayment.get({ id: paymentId });
    const { status, metadata } = response;
    console.log(`🔎 Pagamento ${paymentId} status: ${status}`);

    // Atualiza payments/{mp_id}
    const paymentRef = db.collection("payments").doc(paymentId);
    await paymentRef.set(
      {
        status,
        rawResponse: response,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Discover presentId: tenta metadata, senão busca payments doc
    let presentId = metadata?.presentId;
    if (!presentId) {
      const paySnap = await paymentRef.get();
      presentId = paySnap.exists ? paySnap.data()?.presentId : null;
    }

    if (!presentId) {
      console.warn(`⚠️ Nenhum presentId vinculado ao pagamento ${paymentId}`);
      return res.sendStatus(200);
    }

    // Atualiza presents/{presentId}/transactions/{mp_id}
    const transRef = db
      .collection("presents")
      .doc(presentId)
      .collection("transactions")
      .doc(paymentId);

    await transRef.set(
      {
        status:
          status === "approved"
            ? "paid"
            : ["cancelled", "rejected", "expired"].includes(status)
            ? "cancelled"
            : status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        mp_status: status,
      },
      { merge: true }
    );

    console.log(`✅ Pagamento ${paymentId} (${status}) vinculado ao presente ${presentId}`);

    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return res.sendStatus(500);
  }
});

// ==== Start server ====
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} (modo produção)`);
});
