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
app.use(cors());

// Resolve __dirname (necessário em ESModules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚙️ Configuração do Firebase (compatível com Render e local)
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Lê a credencial do Firebase via variável de ambiente (base64)
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8");
    serviceAccount = JSON.parse(decoded);
    console.log("🔥 Firebase service account carregado via variável de ambiente");
  } else {
    // Usa o arquivo local quando rodando em ambiente de desenvolvimento
    const serviceAccountPath = path.join(__dirname, "service-account.json");
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    console.log("🔥 Firebase service account carregado via arquivo local");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error("❌ Erro ao carregar credenciais do Firebase:", error);
}

// ⚙️ Configuração Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
const payment = new Payment(client);

// 📦 Rotas principais
app.get("/", (req, res) => {
  res.send("Servidor do casamento Diego & Yasmin está rodando 💍");
});

// 💰 Rota para gerar pagamento PIX
app.post("/create_preference", async (req, res) => {
  try {
    const { title, price } = req.body;
    const body = {
      transaction_amount: Number(price),
      description: title,
      payment_method_id: "pix",
      payer: { email: "teste@teste.com" },
    };

    const result = await payment.create({ body });
    res.status(200).json({
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
      id: result.id,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
  }
});

// 🔔 Webhook Mercado Pago
app.post("/webhook", async (req, res) => {
  console.log("📬 Webhook recebido:", req.body);
  try {
    const paymentId = req.body.data?.id;
    if (!paymentId) {
      console.error("❌ Webhook sem ID de pagamento");
      return res.sendStatus(400);
    }

    const response = await payment.get({ id: paymentId });
    const status = response.status;

    if (status === "approved") {
      console.log("✅ Pagamento aprovado!");
      // Atualize o Firestore ou envie notificação ao frontend se necessário
    } else {
      console.log("ℹ️ Pagamento ainda não aprovado:", status);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

// 🚀 Inicializa servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
