import Logger from "@reactioncommerce/logger";
import { formatPhoneNumber } from "./formatPhoneNumber.js";

export async function getFormattedPhoneNumber(context, userId) {
    const { collections } = context;
    const { Accounts } = collections;

    // Fetch the account details based on the userId
    let accountDetails = await Accounts.findOne({ userId: userId });

    // Check if account details are present and then prioritize contactNumber, followed by profile.phone
    if (accountDetails) {
        if (accountDetails.contactNumber && accountDetails.contactNumber.trim() !== "") {
            return formatPhoneNumber(accountDetails.contactNumber);
        } else if (accountDetails.profile && accountDetails.profile.phone) {
            return formatPhoneNumber(accountDetails.profile.phone);
        } else {
            Logger.info("No valid phone number found for the given userId.");
            return null;
        }
    } else {
        Logger.info("No account details found for the given userId.");
        return null;
    }
}