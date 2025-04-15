
import cryptoJS from 'crypto-js';


let merchantId = 'MC150326';
let password = 'fy8d58bxg0';
let integritySalt = 'vw68g1t9xf';


export default async function instantPaymentNotification(req, res) {
    const payload = req.body;
    console.log("IPN Received:", payload);

    // ✅ Construct message for hash comparison (in exact field order!)
    const message = `${integritySalt}&${payload.pp_Amount}&${payload.pp_BillReference}&${payload.pp_CNIC}&${payload.pp_Description}&${payload.pp_Language}&${payload.pp_MerchantID}&${payload.pp_MobileNumber}&${payload.pp_Password}&${payload.pp_TxnCurrency}&${payload.pp_TxnDateTime}&${payload.pp_TxnExpiryDateTime}&${payload.pp_TxnRefNo}`;
    const calculatedHash = cryptoJS.HmacSHA256(message, integritySalt).toString(cryptoJS.enc.Hex).toUpperCase();

    console.log("Hash Calculation:", calculatedHash);

    console.log("Expected Hash:", payload.pp_SecureHash);
    console.log("Calculated Hash:", calculatedHash);

    if (calculatedHash !== payload.pp_SecureHash) {
        console.log("Hash mismatch. IPN might be tampered!");
        return res.status(400).json({
            pp_ResponseCode: "999",
            pp_ResponseMessage: "Invalid secure hash",
            pp_SecureHash: ""
        });
    }

    // ✅ Hash is valid
    if (payload.pp_ResponseCode === "121") {
        console.log("Payment success. Mark order as PAID.");
        // 👉 Save to DB, update order status etc.
    } else {
        console.log("Payment failed or cancelled.");
        // 👉 Log failure, retry or notify user
    }

    // ✅ Send IPN response back to JazzCash
    return res.json({
        pp_ResponseCode: "000",
        pp_ResponseMessage: "IPN received successfully",
        pp_SecureHash: ""
    });
};


// app.post("/jazzcash/ipn", (req, res) => {
//     const payload = req.body;
//     console.log("IPN Received:", payload);

//     // ✅ Construct message for hash comparison (in exact field order!)
//     const message = `${integritySalt}&${payload.pp_Amount}&${payload.pp_BillReference}&${payload.pp_CNIC}&${payload.pp_Description}&${payload.pp_Language}&${payload.pp_MerchantID}&${payload.pp_MobileNumber}&${payload.pp_Password}&${payload.pp_TxnCurrency}&${payload.pp_TxnDateTime}&${payload.pp_TxnExpiryDateTime}&${payload.pp_TxnRefNo}`;
//     const calculatedHash = cryptoJS.HmacSHA256(message, integritySalt).toString(cryptoJS.enc.Hex).toUpperCase();

//     console.log("Hash Calculation:", calculatedHash);

//     console.log("Expected Hash:", payload.pp_SecureHash);
//     console.log("Calculated Hash:", calculatedHash);

//     if (calculatedHash !== payload.pp_SecureHash) {
//         console.log("Hash mismatch. IPN might be tampered!");
//         return res.status(400).json({
//             pp_ResponseCode: "999",
//             pp_ResponseMessage: "Invalid secure hash",
//             pp_SecureHash: ""
//         });
//     }

//     // ✅ Hash is valid
//     if (payload.pp_ResponseCode === "121") {
//         console.log("Payment success. Mark order as PAID.");
//         // 👉 Save to DB, update order status etc.
//     } else {
//         console.log("Payment failed or cancelled.");
//         // 👉 Log failure, retry or notify user
//     }

//     // ✅ Send IPN response back to JazzCash
//     return res.json({
//         pp_ResponseCode: "000",
//         pp_ResponseMessage: "IPN received successfully",
//         pp_SecureHash: ""
//     });
// });
