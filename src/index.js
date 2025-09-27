import pkg from "../package.json";
import i18n from "./i18n/index.js";
import cors from "cors";
import bodyParser from "body-parser";
import morgan from "morgan";
import mutations from "./mutations/index.js";
import policies from "./policies.json";
import preStartup from "./preStartup.js";
import queries from "./queries/index.js";
import resolvers from "./resolvers/index.js";
import schemas from "./schemas/index.js";
import { Order, OrderFulfillmentGroup, OrderItem } from "./simpleSchemas.js";
import startup from "./startup.js";
import getDataForOrderEmail from "./util/getDataForOrderEmail.js";
import cryptoJS from "crypto-js";
import moment from "moment";

/**
 * @summary Import and call this function to add this plugin to your API.
 * @param {ReactionAPI} app The ReactionAPI instance
 * @returns {undefined}
 */

// Card Payment Data Generator from Amount (No Order Required)
async function generateCardPaymentDataFromAmount(paymentData, context) {
  try {
    const { collections } = context;
    const { TransactionDetails } = collections;

    // JazzCash Card Payment Configuration
    const merchantId = "MC150326";
    const password = "fy8d58bxg0";
    const integritySalt = "vw68g1t9xf";
    const paymentUrl =
      "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

    // Generate unique transaction reference
    const txnRefNo = `CARD_${moment().format("YYYYMMDDHHmmss")}`;

    // Use provided amount and convert to PKR if needed
    const exchangeRate = paymentData.currency === "USD" ? 280 : 1;
    const amountInPKR = paymentData.amount * exchangeRate;
    const amount = Math.round(amountInPKR * 100); // Convert to paisa

    const txnCurrency = "PKR";
    const txnDateTime = moment().format("YYYYMMDDHHmmss");
    const billReference = `PAYMENT_${txnRefNo}`;
    const description = paymentData.description || "Payment";
    const txnExpiryDateTime = moment()
      .add(30, "minutes")
      .format("YYYYMMDDHHmmss");
    const language = "EN";
    const returnUrl =
      paymentData.returnUrl || `https://bizb.store/payment/callback`;

    console.log("Payment Details:", {
      originalAmount: paymentData.amount,
      originalCurrency: paymentData.currency,
      exchangeRate: exchangeRate,
      amountInPKR: amountInPKR,
      amountInPaisa: amount,
    });

    // Card Payment specific parameters
    const pp_Version = "1.1";
    const pp_TxnType = "MIGS"; // Card payment type

    // Prepare fields for hash generation
    const fields = {
      pp_Version: pp_Version,
      pp_TxnType: pp_TxnType,
      pp_Language: language,
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: txnCurrency,
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: billReference,
      pp_Description: description,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: returnUrl,
    };

    // Generate secure hash
    const message = `${integritySalt}&${fields.pp_Version}&${fields.pp_TxnType}&${fields.pp_Language}&${fields.pp_MerchantID}&${fields.pp_Password}&${fields.pp_TxnRefNo}&${fields.pp_Amount}&${fields.pp_TxnCurrency}&${fields.pp_TxnDateTime}&${fields.pp_BillReference}&${fields.pp_Description}&${fields.pp_TxnExpiryDateTime}&${fields.pp_ReturnURL}`;

    const createdHash = cryptoJS
      .HmacSHA256(message, integritySalt)
      .toString(cryptoJS.enc.Hex)
      .toUpperCase();

    // Prepare form data for JazzCash
    const formData = {
      pp_Version: pp_Version,
      pp_TxnType: pp_TxnType,
      pp_Language: language,
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: txnCurrency,
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: billReference,
      pp_Description: description,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: returnUrl,
      pp_SecureHash: createdHash,
    };

    // Save transaction details to database (without orderId)
    const transactionDocument = {
      orderId: null, // No order yet
      transactionType: "CARD",
      amount: amount,
      currency: txnCurrency,
      transactionDateTime: txnDateTime,
      transactionRefNo: txnRefNo,
      responseCode: "000",
      responseMessage: "Payment initiated successfully",
      paymentMethod: "CARD",
      paymentUrl: paymentUrl,
      formData: formData,
      orderData: paymentData.orderData, // Store order data for later
      createdAt: new Date(),
    };

    await TransactionDetails.insertOne(transactionDocument);

    return {
      success: true,
      formData: formData,
      paymentUrl: paymentUrl,
      txnRefNo: txnRefNo,
      amount: amount,
      currency: txnCurrency,
    };
  } catch (error) {
    console.error("Card Payment Data Generation Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Card Payment Data Generator (Old function for order-based payments)
async function generateCardPaymentData(order, context) {
  try {
    const { collections } = context;
    const { TransactionDetails } = collections;

    // JazzCash Card Payment Configuration
    const merchantId = "MC150326";
    const password = "fy8d58bxg0";
    const integritySalt = "vw68g1t9xf";
    const paymentUrl =
      "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

    // Generate unique transaction reference
    const txnRefNo = `CARD_${moment().format("YYYYMMDDHHmmss")}`;

    // Calculate total amount from shipping groups
    let totalAmount = 0;
    if (order.shipping && order.shipping.length > 0) {
      totalAmount = order.shipping.reduce((sum, group) => {
        return sum + (group.invoice ? group.invoice.total : 0);
      }, 0);
    }

    console.log("Order Details:", {
      orderId: order._id,
      currencyCode: order.currencyCode,
      totalAmount: totalAmount,
      shippingGroups: order.shipping ? order.shipping.length : 0,
    });

    // Convert to PKR if needed (assuming 1 USD = 280 PKR for testing)
    const exchangeRate = order.currencyCode === "USD" ? 280 : 1;
    const amountInPKR = totalAmount * exchangeRate;
    const amount = Math.round(amountInPKR * 100); // Convert to paisa

    console.log("Payment Calculation:", {
      totalAmount: totalAmount,
      exchangeRate: exchangeRate,
      amountInPKR: amountInPKR,
      amountInPaisa: amount,
    });
    const txnCurrency = "PKR";
    const txnDateTime = moment().format("YYYYMMDDHHmmss");
    const billReference = `ORDER_${order._id}`;
    const description = `Payment for Order ${order.referenceId}`;
    const txnExpiryDateTime = moment()
      .add(30, "minutes")
      .format("YYYYMMDDHHmmss");
    const language = "EN";
    const returnUrl = `https://bizb.store/payment/callback?orderId=${order._id}`;

    // Card Payment specific parameters
    const pp_Version = "1.1";
    const pp_TxnType = "MPAY"; // Card payment type

    // Prepare fields for hash generation
    const fields = {
      pp_Version: pp_Version,
      pp_TxnType: pp_TxnType,
      pp_Language: language,
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: txnCurrency,
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: billReference,
      pp_Description: description,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: returnUrl,
    };

    // Generate secure hash
    const message = `${integritySalt}&${fields.pp_Version}&${fields.pp_TxnType}&${fields.pp_Language}&${fields.pp_MerchantID}&${fields.pp_Password}&${fields.pp_TxnRefNo}&${fields.pp_Amount}&${fields.pp_TxnCurrency}&${fields.pp_TxnDateTime}&${fields.pp_BillReference}&${fields.pp_Description}&${fields.pp_TxnExpiryDateTime}&${fields.pp_ReturnURL}`;

    const createdHash = cryptoJS
      .HmacSHA256(message, integritySalt)
      .toString(cryptoJS.enc.Hex)
      .toUpperCase();

    // Prepare form data for JazzCash
    const formData = {
      pp_Version: pp_Version,
      pp_TxnType: pp_TxnType,
      pp_Language: language,
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: txnCurrency,
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: billReference,
      pp_Description: description,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: returnUrl,
      pp_SecureHash: createdHash,
    };

    // Save transaction details to database
    const transactionDocument = {
      orderId: order._id,
      transactionType: "CARD",
      amount: amount,
      currency: txnCurrency,
      transactionDateTime: txnDateTime,
      transactionRefNo: txnRefNo,
      responseCode: "000",
      responseMessage: "Payment initiated successfully",
      paymentMethod: "CARD",
      paymentUrl: paymentUrl,
      formData: formData,
      createdAt: new Date(),
    };

    await TransactionDetails.insertOne(transactionDocument);

    return {
      success: true,
      formData: formData,
      paymentUrl: paymentUrl,
      txnRefNo: txnRefNo,
      amount: amount,
      currency: txnCurrency,
    };
  } catch (error) {
    console.error("Card Payment Data Generation Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// JazzCash Card Payment HTML Form Generator
function generateJazzCashCardPaymentForm(formData, paymentUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirecting to JazzCash Payment Gateway...</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
            }
            .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 2s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .message {
                color: #333;
                margin-bottom: 1rem;
            }
            .fallback {
                margin-top: 1rem;
                padding: 1rem;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            .btn {
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }
            .btn:hover {
                background-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="spinner"></div>
            <div class="message">Redirecting to JazzCash Payment Gateway...</div>
            <div class="message">Please do not close this window.</div>
            
            <form id="paymentForm" action="${paymentUrl}" method="POST" style="display: none;">
                ${Object.entries(formData)
                  .map(
                    ([key, value]) =>
                      `<input type="hidden" name="${key}" value="${value}">`
                  )
                  .join("")}
            </form>
            
            <div class="fallback">
                <p>If you are not redirected automatically, click the button below:</p>
                <button class="btn" onclick="document.getElementById('paymentForm').submit()">
                    Proceed to Payment
                </button>
            </div>
        </div>
        
        <script>
            // Auto-submit form after 2 seconds
            setTimeout(function() {
                document.getElementById('paymentForm').submit();
            }, 2000);
        </script>
    </body>
    </html>
  `;
}

function IPNPayment(context) {
  const { app } = context;

  if (app.expressApp) {
    app.expressApp.use(cors());
    app.expressApp.use(bodyParser.json());
    app.expressApp.use(bodyParser.urlencoded({ extended: true }));
    app.expressApp.use(morgan("dev"));

    // JazzCash Mobile Wallet IPN Handler
    app.expressApp.post("/jazzcash/ipn", async (req, res) => {
      try {
        console.log("Collections available:", Object.keys(context.collections));

        const { collections } = context;
        const { TransactionDetails } = collections;
        const payload = req.body;

        let transactionDetails = await TransactionDetails.findOne({
          transactionRefNo: payload.pp_TxnRefNo,
        });

        console.log("Transaction Details:", transactionDetails);

        console.log("Payload received from JazzCash:", payload);
        console.log("IPN Received: SECURE HASH ", payload.pp_SecureHash);

        if (payload.pp_ResponseCode === "121") {
          console.log("Payment success. Mark order as PAID.");
          await TransactionDetails.updateOne(
            { transactionRefNo: payload.pp_TxnRefNo },
            {
              $set: {
                responseCode: payload.pp_ResponseCode,
                responseMessage: payload.pp_ResponseMessage,
              },
            }
          );
          console.log("Transaction record updated with JazzCash response.");
        } else {
          console.log("Payment failed or cancelled.");
        }

        // Send IPN response back to JazzCash
        return res.status(200).json({
          transactionDetails,
          pp_ResponseCode: payload.pp_ResponseCode,
          pp_ResponseMessage: payload.pp_ResponseMessage,
        });
      } catch (error) {
        console.error("Error processing JazzCash IPN:", error);
        return res.status(500).json({
          transactionDetails,
          pp_ResponseCode: payload.pp_ResponseCode,
          pp_ResponseMessage: payload.pp_ResponseMessage,
        });
      }
    });

    // Card Payment API - No orderId required, payment first approach
    app.expressApp.post("/api/card-payment", async (req, res) => {
      try {
        const { amount, currency, description, returnUrl, orderData } =
          req.body;
        const { collections } = context;
        const { TransactionDetails } = collections;

        console.log("Card Payment API called with data:", {
          amount,
          currency,
          description,
          orderData,
        });

        // Validate required fields
        if (!amount || !currency || !description) {
          return res.status(400).send(`
            <html>
              <body>
                <h1>Missing Required Fields</h1>
                <p>Amount, currency, and description are required.</p>
              </body>
            </html>
          `);
        }

        // Generate card payment data
        const cardPaymentData = await generateCardPaymentDataFromAmount(
          {
            amount,
            currency,
            description,
            returnUrl,
            orderData,
          },
          context
        );

        if (!cardPaymentData.success) {
          return res.status(500).send(`
            <html>
              <body>
                <h1>Payment Error</h1>
                <p>Failed to generate payment data: ${cardPaymentData.error}</p>
              </body>
            </html>
          `);
        }

        // Generate HTML form for JazzCash card payment
        const htmlForm = generateJazzCashCardPaymentForm(
          cardPaymentData.formData,
          cardPaymentData.paymentUrl
        );

        res.setHeader("Content-Type", "text/html");
        res.send(htmlForm);
      } catch (error) {
        console.error("Card Payment API Error:", error);
        res.status(500).send(`
          <html>
            <body>
              <h1>Server Error</h1>
              <p>An error occurred while processing your request.</p>
            </body>
          </html>
        `);
      }
    });

    // Card Payment Callback Handler
    app.expressApp.post("/api/card-payment/callback", async (req, res) => {
      try {
        const payload = req.body;
        console.log("Card Payment Callback Payload:", payload);

        const { collections } = context;
        const { TransactionDetails, Orders } = collections;

        // Verify the secure hash
        const integritySalt = "vw68g1t9xf";
        const message = `${integritySalt}&${payload.pp_Version}&${payload.pp_TxnType}&${payload.pp_Language}&${payload.pp_MerchantID}&${payload.pp_Password}&${payload.pp_TxnRefNo}&${payload.pp_Amount}&${payload.pp_TxnCurrency}&${payload.pp_TxnDateTime}&${payload.pp_BillReference}&${payload.pp_Description}&${payload.pp_TxnExpiryDateTime}&${payload.pp_ReturnURL}`;
        const calculatedHash = cryptoJS
          .HmacSHA256(message, integritySalt)
          .toString(cryptoJS.enc.Hex)
          .toUpperCase();

        if (calculatedHash !== payload.pp_SecureHash) {
          console.log("Hash mismatch. Callback might be tampered!");
          return res.status(400).send(`
            <html>
              <body>
                <h1>Payment Verification Failed</h1>
                <p>Invalid secure hash. Please contact support.</p>
              </body>
            </html>
          `);
        }

        // Find the transaction record
        const transactionDetails = await TransactionDetails.findOne({
          transactionRefNo: payload.pp_TxnRefNo,
        });

        if (!transactionDetails) {
          console.log("Transaction not found:", payload.pp_TxnRefNo);
          return res.status(404).send(`
            <html>
              <body>
                <h1>Transaction Not Found</h1>
                <p>Transaction reference not found. Please contact support.</p>
              </body>
            </html>
          `);
        }

        // Update transaction details
        await TransactionDetails.updateOne(
          { transactionRefNo: payload.pp_TxnRefNo },
          {
            $set: {
              responseCode: payload.pp_ResponseCode,
              responseMessage: payload.pp_ResponseMessage,
              updatedAt: new Date(),
            },
          }
        );

        // Handle payment success/failure
        if (payload.pp_ResponseCode === "000") {
          console.log("Card payment successful.");

          // If orderId exists, update order status
          if (transactionDetails.orderId) {
            await Orders.updateOne(
              { _id: transactionDetails.orderId },
              {
                $set: {
                  "workflow.status": "Confirmed",
                  "workflow.workflow": ["new", "Confirmed"],
                  updatedAt: new Date(),
                },
              }
            );
          }

          // Redirect to success page with transaction details
          return res.redirect(
            `https://bizb.store/checkout/success?txnRefNo=${transactionDetails.transactionRefNo}&status=success&amount=${transactionDetails.amount}`
          );
        } else {
          console.log("Card payment failed or cancelled.");

          // If orderId exists, update order status to cancelled
          if (transactionDetails.orderId) {
            await Orders.updateOne(
              { _id: transactionDetails.orderId },
              {
                $set: {
                  "workflow.status": "Cancelled",
                  "workflow.workflow": ["new", "Cancelled"],
                  updatedAt: new Date(),
                },
              }
            );
          }

          // Redirect to failure page
          return res.redirect(
            `https://bizb.store/checkout/failure?txnRefNo=${
              transactionDetails.transactionRefNo
            }&status=failed&reason=${encodeURIComponent(
              payload.pp_ResponseMessage
            )}`
          );
        }
      } catch (error) {
        console.error("Card Payment Callback Error:", error);
        return res.status(500).send(`
          <html>
            <body>
              <h1>Payment Processing Error</h1>
              <p>An error occurred while processing your payment. Please contact support.</p>
            </body>
          </html>
        `);
      }
    });
  }
}

export default async function register(app) {
  console.log("Registering Orders Plugin");
  await app.registerPlugin({
    label: "Orders",
    name: "orders",
    version: pkg.version,
    i18n,
    collections: {
      Orders: {
        name: "Orders",
        indexes: [
          // Create indexes. We set specific names for backwards compatibility
          // with indexes created by the aldeed:schema-index Meteor package.
          [{ accountId: 1, shopId: 1 }],
          [{ createdAt: -1 }, { name: "c2_createdAt" }],
          [{ email: 1 }, { name: "c2_email" }],
          [{ referenceId: 1 }, { unique: true }],
          [{ shopId: 1 }, { name: "c2_shopId" }],
          [{ "shipping.items.productId": 1 }],
          [{ "shipping.items.variantId": 1 }],
          [{ "payments.address.fullName": 1 }],
          [{ "shipping.address.fullName": 1 }],
          [{ "payments.address.phone": 1 }],
          [{ "workflow.status": 1 }, { name: "c2_workflow.status" }],
        ],
      },
      TransactionDetails: {
        name: "TransactionDetails",
        updatedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    },
    functionsByType: {
      getDataForOrderEmail: [getDataForOrderEmail],
      preStartup: [preStartup, IPNPayment],
      startup: [startup],
    },
    graphQL: {
      resolvers,
      schemas,
    },
    mutations,
    queries,
    policies,
    simpleSchemas: {
      Order,
      OrderFulfillmentGroup,
      OrderItem,
    },
  });
}
