require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mercadopago = require("mercadopago");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4000;

if (!process.env.MP_ACCESS_TOKEN) {
  console.error("❌ Missing MP_ACCESS_TOKEN in .env");
  process.exit(1);
}

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// initialize firebase-admin
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./service-account.json";
if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Missing Firebase service account JSON at:",
    serviceAccountPath
  );
  process.exit(1);
}
const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Util: expire pending payments older than 1 hour on server start
async function expireStalePayments() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const docs = await db
    .collection("presentes")
    .where("payment.status", "==", "pending")
    .get();
  const batch = db.batch();
  docs.forEach((d) => {
    const p = d.data();
    const created = p.payment?.createdAt?.toDate?.() || p.payment?.createdAt;
    if (!created) return;
    const createdDate = created.toDate ? created.toDate() : new Date(created);
    if (createdDate < oneHourAgo) {
      batch.update(d.ref, {
        "payment.status": "expired",
        "payment.expiredAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
  if (!batch._ops || batch._ops.length > 0) {
    await batch.commit().catch(console.error);
  }
}
expireStalePayments().catch(console.error);

// In-memory map to set timeouts while server runs (works for dev). Backend also uses DB-based expiry.
const timeouts = new Map();

// Endpoint create payment
app.post("/create_payment", async (req, res) => {
  /**
   * body: { presentId: string, amount: number, title?: string, reservedBy?: string }
   */
  try {
    const {
      presentId,
      amount,
      title = "Presente",
      reservedBy = null,
    } = req.body;
    if (!presentId || !amount)
      return res.status(400).json({ error: "presentId and amount required" });

    // Create payment via Mercado Pago (PIX)
    const paymentData = {
      transaction_amount: Number(amount),
      description: title,
      payment_method_id: "pix",
      payer: {
        email: "test_user_123@test.com", // sandbox payer
      },
    };

    const mpResponse = await mercadopago.payment.create(paymentData);
    // mpResponse.body.point_of_interaction.transaction_data contains qr info
    const body = mpResponse.body;
    const pix = body.point_of_interaction?.transaction_data || {};
    const qr_code = pix.qr_code || null;
    const qr_base64 = pix.qr_code_base64 || null;
    const paymentId = body.id;

    // Save to Firestore: update present doc with payment info (status pending)
    const presentRef = db.collection("presentes").doc(presentId);
    const presentSnap = await presentRef.get();
    if (!presentSnap.exists) {
      return res.status(404).json({ error: "present not found" });
    }

    const createdAt = admin.firestore.Timestamp.now();
    await presentRef.update({
      payment: {
        id: paymentId,
        status: "pending",
        createdAt: createdAt,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 60 * 60 * 1000)
        ), // +1h
        qr_code,
        qr_base64,
        reservedBy: reservedBy || null,
        amount: Number(amount),
      },
    });

    // set in-memory timeout to expire if server is up
    if (timeouts.has(paymentId)) clearTimeout(timeouts.get(paymentId));
    const to = setTimeout(async () => {
      // double-check in DB and expire if still pending
      const snap = await presentRef.get();
      const data = snap.data();
      if (data?.payment?.status === "pending") {
        await presentRef.update({
          "payment.status": "expired",
          "payment.expiredAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      timeouts.delete(paymentId);
    }, 60 * 60 * 1000);
    timeouts.set(paymentId, to);

    return res.json({
      paymentId,
      qr_code,
      qr_base64,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
  } catch (err) {
    console.error("create_payment error:", err);
    return res
      .status(500)
      .json({ error: "create_payment_failed", detail: err.toString() });
  }
});

// webhook endpoint (configure in Mercado Pago dev panel to call this url)
app.post("/webhook", async (req, res) => {
  // Mercado Pago sends different formats. We'll try to get payment id.
  // If you set notification_url, MP sends { id: 'xxx', topic: 'payment' } or similar
  try {
    const body = req.body;
    console.log("MP webhook body:", body);

    // If it's a webhook with id and topic:
    let paymentId = null;
    if (body?.id) paymentId = body.id;
    if (!paymentId && body?.data?.id) paymentId = body.data.id;
    if (!paymentId && body?.resource?.id) paymentId = body.resource.id;

    if (!paymentId) {
      // try query param (mp sometimes sends as query)
      paymentId = req.query.id || req.query["data.id"];
    }

    if (!paymentId) {
      console.warn("Webhook without payment id");
      return res.status(400).send("no id");
    }

    // Get payment from Mercado Pago to check status
    const mpResp = await mercadopago.payment.get(paymentId);
    const payment = mpResp.body;
    const status = payment.status; // "approved" when paid

    // Find the present that has this payment id
    const q = await db
      .collection("presentes")
      .where("payment.id", "==", Number(paymentId))
      .get();
    if (q.empty) {
      console.warn("No present found for payment id", paymentId);
      return res.sendStatus(200);
    }
    const doc = q.docs[0];
    const docRef = doc.ref;

    if (status === "approved" || status === "paid") {
      await docRef.update({
        "payment.status": "paid",
        "payment.approvedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (status === "cancelled" || status === "refused") {
      await docRef.update({
        "payment.status": "failed",
        "payment.failedAt": admin.firestore.FieldValue.serverTimestamp(),
        "payment.status_detail": status,
      });
    } else {
      // pending / in_process -> update status detail
      await docRef.update({
        "payment.status": status,
        "payment.status_detail": payment.status_detail || null,
      });
    }

    // clear timeout if present
    if (timeouts.has(paymentId)) {
      clearTimeout(timeouts.get(paymentId));
      timeouts.delete(paymentId);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("webhook error:", err);
    return res.status(500).send("err");
  }
});

// simple health
app.get("/", (req, res) => res.send("Wedding server running"));

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
