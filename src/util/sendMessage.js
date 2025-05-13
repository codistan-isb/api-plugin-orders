import Logger from "@reactioncommerce/logger";
import fetch from "node-fetch"
import { formatPhoneNumber } from "./formatPhoneNumber.js";
import { getFormattedPhoneNumber } from "./getFormattedPhoneNumber.js";

export async function sendMessage(context, userId, message, phoneNumber) {
    try {
        let phone;

        if (phoneNumber) {
            phone = await formatPhoneNumber(phoneNumber);

            console.log("PHONE", phone);
        } else {
            phone = await getFormattedPhoneNumber(context, userId);

            console.log("PHONE ELSE", phone);
        }

        if (!phone) {
            Logger.info("No formatted phone number available. No message sent.");
            return;
        }
        // console.log("BEFORE API URL")

        const apiUrl = `https://wa.sabtech.org/api/send.php?api_key=923338205480-e5114918-49ed-473f-86da-78388e512d91&mobile=${phone}&priority=0&message=${encodeURIComponent(message)}`;

        // console.log("AFTER API URL")

        const response = await fetch(apiUrl, { timeout: 15000 });

        // console.log("RESPONSE URL", response)
        const data = await response.json();


        // console.log("DATA RESPONSE", data)

        if (data && data.success === "true") {
            Logger.info(`Message sent successfully to ${phone}`);
        } else {
            Logger.info(`Failed to send message to ${phone}`);
        }
    } catch (error) {
        Logger.error('Error sending message:', error);
    }
}
