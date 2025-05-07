
import { sendMessage } from "./sendMessage.js"
import createNotification from "./createNotification.js";
import getProductbyId from "./getProductbyId.js";
import { generateOrderSummary } from "./generateOrderSummary.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";
import { decodeProductOpaqueId, decodeShopOpaqueId, encodeProductOpaqueId, encodeShopOpaqueId } from "../xforms/id.js";

/**

 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 */

export async function onCreateOrder(order, context, createdBy) {
    let productPurchased = await getProductbyId(context, { productId: order?.shipping[0]?.items[0]?.variantId });

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const orderLink = `https://bizb.storeen/checkout/order?orderId=${orderId}`;
    const storeLink = `https://bizb.store`;
    const orderSummary = await generateOrderSummary(order?.shipping[0]?.items);

    let buyerMessage =
        `Subject: Your Order ${orderId} is Placed\n\n` +
        `Hi ${customerName},\n\n` +
        `Thank you for your purchase! Your order is placed successfully. Please note that the order delivery process may take 7-10 working days.\n\n` +
        `View your order: ${orderLink}\n` +
        `Visit our store: ${storeLink}\n\n` +
        `Order Summary:\n${orderSummary}\n\n` +
        `Please respond to this message for confirmation by typing "confirmed". If you have any questions or need further assistance, feel free to contact our customer support at hello@bizb.store.\n\n` +
        `Best regards,\nBizB Team`;

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);

    createNotification(context, {
        details: null,
        from: createdBy,
        hasDetails: false,
        message: `You have a new order of ${productPurchased.title}`,
        status: "unread",
        to: productPurchased?.uploadedBy?.userId,
        type: "newOrder",
        url: `/en/profile/address?activeProfile=seller`
    });
}

export async function onUpdateOrder(order, context, updatedBy) {

    let shippingArray = order.shipping[0];
    let result = shippingArray.items;
    let productIds = result.map(item => item.productId);
    let purchasedProducts = [];

    for (let productId of productIds) {
        console.log("PRODUCT ID IN THE ON UPDATE STATUS", productId);
        const product = await getProductbyId(context, { productId });
        purchasedProducts.push(product);
    }

    if (order.workflow && order.workflow.status === "Cancelled") {
        await orerCancelNotification(order, context, purchasedProducts,)
    } else if (order.workflow && order.workflow.status === "Confirmed") {
        await onConfirmNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Out_Of_Stock") {
        await onOutofStockNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Dispatched") {
        await onMainOrderDispatched(order, context)
    } else if (order.workflow && order.workflow.status === "On_Hold") {
        await OnHoldNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Delivered") {
        await onDeliveredNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Refunded") {
        await OnRefundedNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Refund_In_Process") {
        await OnRefundInProcessNotification(order, context)
    } else if (order.workflow && order.workflow.status === "Completed") {
        await onCompleteNotification(order, context)
    } else {
        console.log("Unhandled order status:", order.workflow.status);
    }

}
async function orerCancelNotification(order, context) {
    let { collections } = context;
    let { SimpleInventory } = collections;

    let shippingArray = order.shipping[0];
    let result = shippingArray.items;
    let productIds = result.map(item => item.productId);

    await SimpleInventory.updateOne(
        {
            'productConfiguration.productId': { $in: productIds },
        },
        {
            $set: {
                'inventoryReserved': 0
            }
        }
    );

    await context.mutations.publishProducts(context, productIds);

    let orderId = order?.referenceId || "N/A";
    let orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    let homeLink = `https://bizb.store/en`;

    for (let item of result) {
        let productLink = `https://bizb.store/en/product/${item.productSlug}`;
        let sellerMessage =
            `Subject: Order Cancellation Notification\n\n` +
            `Dear ${item.productVendor},\n\n` +
            `We regret to inform you that the order ${orderId} placed for your item "${item.title}" (${productLink}) on BizB has been cancelled by the buyer. We understand that this may be disappointing, but rest assured, your item will be restocked on our platform for potential buyers.\n\n` +
            `Thank you for your understanding. If you have any questions or concerns, please feel free to reach out to us.\n\n` +
            `Best regards,\n` +
            `BizB Team`;

        await sendMessage(context, item.sellerId, sellerMessage, null);

    }
    // Updated buyer message
    let buyerMessage =
        `Subject: Order ${orderId} Cancellation Confirmation\n\n` +
        `Dear ${order?.shipping[0]?.address?.fullName || 'Customer'},\n\n` +
        `We are sorry to inform you that your order ${orderId} with BizB, has been cancelled as per your request. We understand that circumstances can change, and we respect your decision.\n\n` +
        `View your order: ${orderLink}\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any further questions or concerns, please feel free to reach out to our customer support team. We are here to assist you.\n\n` +
        `Thank you for considering BizB, and we hope to have the opportunity to serve you in the future.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onConfirmNotification(order, context) {

    let shippingArray = order.shipping[0];
    let result = shippingArray.items;

    let orderId = order?.referenceId || "N/A";

    for (let item of result) {
        let productLink = `https://bizb.store/en/product/${item.productSlug}`;
        let sellerMessage =
            "Subject: Your Item Has Been Purchased!\n\n" +
            `Dear ${item.productVendor},\n\n` +
            "We're excited to inform you that one of your listed items on BizB has been purchased by a buyer! Congratulations on your sale!\n" +
            `Please ensure that the item ${productLink} in the order ${orderId} is neat and clean and ready for pickup by our logistics partner. ` +
            "The rider will visit to collect the article from your specified location. Kindly have the item packed securely and ready for handover.\n\n" +
            "Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need assistance, feel free to reach out to our seller support team.\n\n" +
            "Best regards,\n" +
            "BizB Team";

        // console.log("SELLER MESSAGE: ", sellerMessage);

        await sendMessage(context, item.sellerId, sellerMessage, null);
    }

}

async function onOutofStockNotification(order, context) {
    let { collections } = context;
    let { SimpleInventory } = collections;

    let shippingArray = order.shipping[0];
    let result = shippingArray.items;
    let productIds = result.map(item => item.productId);

    await SimpleInventory.updateOne(
        {
            'productConfiguration.productId': { $in: productIds },
        },
        {
            $set: {
                'inventoryInStock': 0
            }
        }
    );

    await context.mutations.publishProducts(context, productIds);

    const customerName = order?.shipping?.[0]?.address?.fullName || "Customer";
    let orderId = order?.referenceId || "N/A";
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const homeLink = `https://bizb.store`;

    let buyerMessage =
        `Subject: Your Order ${orderId} is Out of Stock\n\n` +
        `Hi ${customerName},\n\n` +
        `We regret to inform you that your order ${orderId} is currently out of stock. We sincerely apologize for any inconvenience this may have caused.\n` +
        `View your order: ${orderLink}\n\n` +
        `Our inventory is regularly updated, and we encourage you to visit our store to explore a wide range of other exciting products that might interest you.\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any questions or need further assistance, please don’t hesitate to reach out to our customer support team—we’re here to help!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("buyer Message: ", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping?.[0]?.address?.phone);
}

async function onMainOrderDispatched(order, context) {

    let shippingArray = order.shipping[0];
    let result = shippingArray.items;
    const orderId = order?.referenceId || "N/A";

    // Updated Seller Message
    for (let item of result) {
        let productLink = `https://bizb.store/en/product/${item.productSlug}`;
        const sellerMessage =
            `Subject: Your item ${productLink} Is Dispatched\n\n` +
            `Hi ${item.productVendor},\n` +
            `We're excited to let you know that your item ${productLink} in the order ${orderId} has been dispatched to the buyer!\n\n` +
            `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
            `Best regards,\n` +
            `BizB Team`;

        // console.log("SELLER MESSAGE: ", sellerMessage);

        await sendMessage(context, item.sellerId, sellerMessage, null);
    }

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const trackingUrl = order?.shipping[0]?.trackingUrl || "Tracking link not available";
    const courierInfo = order?.shipping[0]?.tracking
        ? `${order.shipping[0].tracking} (${order.shipping[0].courier_Name})`
        : "Tracking number not available";

    // Updated Buyer Message
    const buyerMessage =
        `Subject: Your order ${orderId} Is Dispatched\n\n` +
        `Hi ${customerName},\n` +
        `We're excited to let you know that your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: https://bizb.store/order/${orderId}\n\n` +
        `Please check this ${courierInfo}, so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${trackingUrl}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE: ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDeliveredNotification(order, context) {
    const customerName = order?.shipping[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Order ${orderId} Is Delivered\n\n` +
        `Hi ${customerName},\n` +
        `Great news! Your order ${orderId} has been delivered successfully.\n` +
        `View your order: ${orderLink}\n\n` +
        `We hope you're satisfied with your purchase. We would love to hear from you!\n` +
        `Please leave a google review about your experience here: https://maps.app.goo.gl/8Aexkuz4FcE5BB66A\n\n` +
        `If you have any questions or need assistance with anything related to your order, please don't hesitate to reach out to our customer support team.\n` +
        `Thank you for choosing BizB!\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE: ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function OnHoldNotification(order, context) {
    const customerName = order?.shipping[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Updated Delivery Timeline for Your Order\n\n` +
        `Dear ${customerName},\n\n` +
        `We sincerely apologize for the delay in processing your order ${orderId}. We understand the importance of timely delivery and are working diligently to ensure your order reaches you as soon as possible.\n` +
        `View your order: ${orderLink}\n\n` +
        `We truly appreciate your patience and understanding during this time.\n` +
        `If you have any questions or concerns, please don't hesitate to reach out to our customer support team—we're always here to help.\n\n` +
        `Thank you for choosing Bizb!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function OnRefundedNotification(order, context) {
    const customerName = order?.shipping?.[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const homeLink = `https://bizb.store`;

    const buyerMessage =
        `Subject: Refund Process Completed for Your Order\n\n` +
        `Hi ${customerName},\n\n` +
        `We hope you're doing well! We’re pleased to inform you that the refund for your canceled order ${orderId} has been successfully processed and credited to your provided account details.\n` +
        `View your order: ${orderLink}\n\n` +
        `We value you as a customer and would love to see you shop with us again. Don’t forget to check out our latest collection for amazing deals and unique items curated just for you! 😊\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any questions or need further assistance, feel free to reach out.\n\n` +
        `Thank you for choosing Bizb, and we look forward to serving you again soon!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping?.[0]?.address?.phone);
}

async function OnRefundInProcessNotification(order, context) {

    const customerName = order?.shipping?.[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;;

    const buyerMessage =
        'Subject: Refund Process Update for Your Order\n\n' +
        `Hi ${customerName},\n\n` +
        `We hope you're doing well. We wanted to inform you that the refund for your canceled order ${orderId} is currently in process.\n` +
        `View your order: ${orderLink}\n\n` +
        `As soon as the refund is completed, we will notify you immediately. If you have any questions in the meantime, feel free to reach out.\n\n` +
        `Thank you for your patience and understanding! 😊\n\n` +
        `Best regards,\n` +
        `Bizb Team`;
    // console.log("BUYER MESSAGE", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping?.[0]?.address?.phone);
}


async function onCompleteNotification(order) {
    console.log("ORDER COMPLETED NOTIFICATION")
    // console.log("ORDER COMPLETED NOTIFICATION", order)
    return order
}
