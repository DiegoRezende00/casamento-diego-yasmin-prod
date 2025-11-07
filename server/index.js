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
app.use(cors({ origin: "*" }));

// 🔥 Inicializa Firebase Admin
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(__dirname, "service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath))),
  });
}

const db = admin.firestore();
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// 🧾 Cria pagamento PIX
app.post("/pagamento", async (req, res) => {
  try {
    const { presentId, nome } = req.body;

    const body = {
      transaction_amount: 1, // valor fixo de teste, depois substitua por presente.valor
      description: `Presente: ${nome}`,
      payment_method_id: "pix",
      payer: {
        email: "pagador-teste@example.com",
        first_name: "Convidado",
        last_name: "Casamento",
        identification: {
          type: "CPF",
          number: "12345678909",
        },
      },
      metadata: { presentId },
    };

    const payment = await new Payment(client).create({ body });

    res.json({
      qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64,
      qr_code: payment.point_of_interaction.transaction_data.qr_code,
    });
  } catch (error) {
    console.error("Erro criando pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// 📬 Webhook Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.body?.data?.id;
    if (!paymentId || paymentId === "123456") {
      console.log("🧪 Webhook de teste recebido - ignorando.");
      return res.sendStatus(200);
    }

    const payment = await new Payment(client).get({ id: paymentId });
    if (payment.status === "approved") {
      console.log("💰 Pagamento aprovado:", payment.id);

      const presentId = payment.metadata.presentId;
      if (presentId) {
        await db.collection("presentes").doc(presentId).update({
          status: "pago",
          lastPayment: new Date().toISOString(),
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// 🧠 Rota raiz
app.get("/", (req, res) => res.send("Servidor online 🚀"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
