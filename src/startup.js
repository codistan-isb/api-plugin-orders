import sendOrderEmail from "./util/sendOrderEmail.js";
import createNotification from "./util/createNotification.js";
import getProductbyId from "./util/getProductbyId.js";
import { encodeShopOpaqueId, encodeProductOpaqueId, decodeProductOpaqueId, decodeShopOpaqueId } from "./xforms/id.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default function ordersStartup(context) {
  const { appEvents, collections } = context;


  appEvents.on("afterOrderCreate", ({ order }) => sendOrderEmail(context, order));
  appEvents.on("afterOrderCreate", async ({ order, createdBy }) => {
    console.log("order", order);
    console.log("createdBy", createdBy);
    let productPurchased = await getProductbyId(context, { productId: order?.shipping[0]?.items[0]?.variantId })
    
    
    let message = `Your Item Has Been Purchased!
    Dear ${productPurchased?.uploadedBy?.name},
    
    We're excited to inform you that one of your listed items on BizB has been purchased by a buyer! Congratulations on your sale!
    Please ensure that the item ${order?.shipping[0]?.items[0]?.variantId} is ready for pickup by our logistics partner. Our rider will be arriving soon to collect the article from your specified location. Kindly have the item packaged securely and ready for handover.
    Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need assistance, feel free to reach out to our seller support team.
    
    Best regards, 
    BizB Seller Support
    `
    await sendMessage(context, productPurchased?.uploadedBy?.userId, message , null)
    
    let buyerMessage = 
    `Hi ${order?.shipping[0]?.address?.fullName},

    Thank you for your purchase! Your order is placed successfully. Please note that the order delivery process may take 7-10 working days.
    
    View your order: 
    Visit our store: https://bizb.store/en?
    
    Order Summary:
    ${generateOrderSummary(order?.shipping[0]?.items)}
    
    If you have any questions or need further assistance, feel free to contact our customer support/ add email.
    
    Best regards,
    BizB
    `
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone )


    createNotification(context, {
      details: null,
      from: createdBy,
      hasDetails: false,
      message: `You have a new order of ${productPurchased.title}`,
      status: "unread",
      to: productPurchased?.uploadedBy?.userId,
      type: "newOrder",
      url: `/en/profile/address?activeProfile=seller`
    })

  });
  appEvents.on("afterOrderUpdate", async ({ order, updatedBy }) => {
    let { Products } = collections
    console.log("in start up fuction");
    console.log("updatedBy", updatedBy);
    let productPurchased = await getProductbyId(context, { productId: order?.shipping[0]?.items[0]?.variantId })
    console.log("productPurchased", productPurchased);

    if (order.workflow.status === 'Cancelled') {
      console.log("order", order.workflow.status);
      // await context.mutation.updateSimpleInventory
      let input = {
        canBackorder: false,
        inventoryInStock: 1,
        isEnabled: true,
        lowInventoryWarningThreshold: 0,
        productConfiguration: {
          productId: encodeProductOpaqueId(productPurchased.ancestors[0]),
          productVariantId: encodeProductOpaqueId(productPurchased._id),
        },
        shopId: encodeShopOpaqueId(productPurchased.shopId),
      }
      // console.log("input one", input);
      // const { clientMutationId = null, productConfiguration, shopId: opaqueShopId, ...passThroughInput } = input;
      // const productId = decodeProductOpaqueId(productConfiguration.productId);
      // const productVariantId = decodeProductOpaqueId(productConfiguration.productVariantId);
      // const shopId = decodeShopOpaqueId(opaqueShopId);
      const inventoryInfo = await context.mutations.updateSimpleInventory(context, {
        canBackorder: false,
        inventoryInStock: 1,
        isEnabled: true,
        lowInventoryWarningThreshold: 0,
        productConfiguration: {
          productId: productPurchased.ancestors[0],
          productVariantId: productPurchased._id,
        },
        shopId: productPurchased.shopId,
      });
      // let inventory = await context.mutations.updateSimpleInventory(context, input);
      console.log("inventory", inventoryInfo);
      let message = `
      Order Cancellation Notification
      Dear ${productPurchased?.uploadedBy?.name},
      We regret to inform you that the order placed for your item ${order?.shipping[0]?.items[0]?.variantId} on BizB has been cancelled by the buyer. We understand that this may be disappointing, but rest assured, your item will be relisted on our platform for potential buyers.
      Thank you for your understanding. If you have any questions or concerns, please feel free to reach out to us.
      
      Best regards, 
      BizB Seller Support
      `
      await sendMessage(context, productPurchased?.uploadedBy?.userId, message, null)
      
      let buyerMessage = 
      `Dear ${order?.shipping[0]?.address?.fullName},
  
      We are sorry to inform you that your order with BizB, Order ID E1164693, has been cancelled as per your request. We understand that circumstances can change, and we respect your decision      
    
      Order Details:

      ${generateOrderSummary(order?.shipping[0]?.items)}
      
      If you have any further questions or concerns, please feel free to reach out to our customer support team at [Customer Support Email] or [Customer Support Phone Number]. We are here to assist you.

      Thank you for considering BizB, and we hope to have the opportunity to serve you in the future.   
         
      Best regards,
      BizB
      `
      await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone )
  

    }
    if (order.workflow.status === 'Quality_Issue') {
      //  await context.mutations.publishProducts(context, internalProductIds)
      console.log("productPurchased", productPurchased?.ancestors[0]);
      let { modifiedCount } = await Products.findOneAndUpdate({ _id: productPurchased?.ancestors[0] }, {
        $set: {
          isVisible: false,
          updatedAt: new Date()
        }
      }, { returnOriginal: false })
      // const productIds = [productPurchased.ancestors[0]];
      // const internalProductIds = productIds.map(decodeProductOpaqueId);
      let message = `
      Quality Check Update for Your Item
      Dear ${productPurchased?.uploadedBy?.name},
      We regret to inform you that your item did not pass our quality check stage due to [reason for rejection]. We understand that this may be disappointing, but we need to maintain our quality standards.
      The item will be returned to you shortly. If you have any questions or concerns, please feel free to reach out to us.
      Thank you for your understanding.
      Best regards, 
      BizB Seller Support
      `
      await sendMessage(context, productPurchased?.uploadedBy?.userId, message, null)

      await context.mutations.publishProducts(context, [productPurchased.ancestors[0]])


    }
    if (order.workflow.status === 'Out_Of_Stock') {
      const inventoryInfo = await context.mutations.updateSimpleInventory(context, {
        canBackorder: false,
        inventoryInStock: 0,
        isEnabled: true,
        lowInventoryWarningThreshold: 0,
        productConfiguration: {
          productId: productPurchased.ancestors[0],
          productVariantId: productPurchased._id,
        },
        shopId: productPurchased.shopId,
      });
      // let inventory = await context.mutations.updateSimpleInventory(context, input);
      console.log("inventory", inventoryInfo);
    }
    createNotification(context, {
      details: null,
      from: updatedBy,
      hasDetails: false,
      message: `You have a new order status of ${productPurchased.title}`,
      status: "unread",
      to: productPurchased?.uploadedBy?.userId,
      // type: "orderUpdate",
      // url: `/en/profile/address?activeProfile=seller`
    })
    let action = order.workflow.workflow[0]
    console.log("action", action);
    console.log("order in emails", order);
    const emailSent = await sendOrderEmail(context, order, action)
    console.log("emailSent", emailSent);

  });
}

async function sendMessage(context, userId, message, phoneNumber) {
  try {
    let phone;

    if (phoneNumber) {
      phone = formatPhoneNumber(phoneNumber);
    } else {
      phone = await getFormattedPhoneNumber(context, userId);
    }

    if (!phone) {
      Logger.info("No formatted phone number available. No message sent.");
      return;
    }

      const apiUrl = `https://wa.sabtech.org/api/send.php?api_key=923338205480-e5114918-49ed-473f-86da-78388e512d91&mobile=${phone}&priority=0&message=${encodeURIComponent(message)}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data && data.success === "true") {
      Logger.info(`Message sent successfully to ${phone}`);
    } else {
      Logger.info(`Failed to send message to ${phone}`);
    }
  } catch (error) {
    Logger.error('Error sending message:', error);
  }
}



async function getFormattedPhoneNumber(context, userId ) {
  const { collections } = context
  const { Accounts } = collections;

  // Fetch the account details based on the userId
  let accoundtDetails = await Accounts.findOne({ userId: userId });

  // Check if account details and billing information are present
  if (accoundtDetails && accoundtDetails.billing && accoundtDetails.billing.phone) {
    return formatPhoneNumber(accoundtDetails.billing.phone);
  } else {
    Logger.info("No billing phone number found for the given userId.");
    return null;
  }
}

async function formatPhoneNumber(phone) {
  // Format the phone number
  // Remove any non-digit characters
  phone = phone.replace(/\D/g, '');

  if (phone.startsWith('92')) {
  } else if (phone.startsWith('0092')) {
    phone = phone.slice(2);
  } else if (phone.startsWith('092')) {
    phone = phone.slice(1);
  } else if (phone.startsWith('0')) {
    phone = '92' + phone.slice(1);
  } else {
    phone = '92' + phone;
  }
  return phone;
}

async function generateOrderSummary(items) {
  return items.map((item, index) => {
    return `- Item ${index + 1}: ${item.title}
      - Quantity: ${item.quantity}
      - Price: ${item.subtotal}`;
  }).join('\n');
}