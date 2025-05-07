import getProductbyId from "./getProductbyId.js";
import { sendMessage } from "./sendMessage.js"

export async function customSuborderStatus(subOrder, context, itemId) {
    let productPurchased = await getProductbyId(context, { productId: subOrder?.shipping[0]?.items[0]?.variantId });

    if (subOrder.workflow && subOrder.workflow.status === "RTS_Cancelled") {
        await orerCancelNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Out_Of_Stock") {
        await onOutofStockNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Quality_Issue") {
        await onQualityIssueNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Pickup_Generated") {
        await onPickupGeneratedNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched") {
        await onDispatchedChildNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Returned_To_Seller") {
        await onReturnedToSellerkNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Return_in_Process") {
        await onReturninProcessNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_MP") {
        await onDispatchedOnMPNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_TCS") {
        await onDispatchedOnTCSNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dipatched_On_Leopard") {
        await onDipatchedOnLeopardNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Daewoo") {
        await onDispatchedOnDaewooNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Postex") {
        await onDispatchedOnPostexNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Trax") {
        await onDispatchedOnTraxNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Penta") {
        await onDispatchedOnPentaNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Booked_On_Penta") {
        await onBookedOnPentaNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Booked_on_PostEx") {
        await onBookedPostEx(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Delivered") {
        await onDeliveredNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Payment_Released") {
        await onPaymentReleasedNotification(subOrder, context, itemId, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Restocked") {
        await onRestock(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "On_Hold") {
        await OnHoldNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Refunded") {
        await OnRefundedNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Refund_In_Process") {
        await OnRefundInProcessNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Quality_Approved") {
        await OnQualityApprovedNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Return_Received") {
        await OnReturnReceivedNotification(subOrder, context, itemId)
    } else if (subOrder.workflow && subOrder.workflow.status === "Completed") {
        await onCompleteNotification(subOrder, context, productPurchased)
    } else {
        console.log("Unhandled order status:", subOrder.workflow.status);
    }

    // else if (subOrder.workflow && subOrder.workflow.status === "Confirmed") {
    //     await onConfirmNotification(subOrder, context, productPurchased)
    // }
}


async function orerCancelNotification(order, context, itemId) {
    const { collections } = context;
    const { SimpleInventory } = collections;

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productId, productSlug } = matchedItem;

    // console.log("PRODUCT ID IN THE SUB ORDER", productId)


    await SimpleInventory.updateOne(
        { 'productConfiguration.productId': productId },
        { $set: { 'inventoryReserved': 0 } }
    );

    await context.mutations.publishProducts(context, [productId]);

    // Build dynamic values
    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const cancellationDate = new Date().toLocaleDateString();
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const productLink = `https://bizb.store/en/product/${productSlug}`; // Assuming your product URL structure like this

    // Updated buyer message
    const buyerMessage =
        `Subject: Order ${orderId} Cancellation Confirmation\n\n` +
        `Dear ${customerName},\n\n` +
        `We are sorry to inform you that your item ${productLink} from your order ${orderId} with BizB, has been cancelled as per your request. We understand that circumstances can change, and we respect your decision.\n\n` +
        `View your order: ${orderLink}\n` +
        `Cancelled Item: ${productLink}\n` +
        `Cancellation Date: ${cancellationDate}\n\n` +
        `If you have any further questions or concerns, please feel free to reach out to our customer support team. We are here to assist you.\n\n` +
        `Thank you for considering BizB, and we hope to have the opportunity to serve you in the future.\n\n` +
        `Best regards,\nBizB Team`;

    // console.log("BUYER MESSAGE", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onOutofStockNotification(order, context, itemId) {
    const { collections } = context;
    const { SimpleInventory, Catalog } = collections;

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productId, productSlug } = matchedItem;

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const productLink = `https://bizb.store/en/product/${productSlug}`
    const homeLink = `https://bizb.store`;


    // Set inventory to 0
    await SimpleInventory.updateOne(
        { 'productConfiguration.productId': productId },
        { $set: { 'inventoryReserved': 0 } }
    );

    await context.mutations.publishProducts(context, [productId]);

    // Construct buyer message
    const buyerMessage =
        `Subject: Your Selected Product(s) from Order ${orderId} is Out of Stock\n\n` +
        `Hi ${customerName},\n\n` +
        `We regret to inform you that your item(s) from order ${orderId} is currently out of stock. We sincerely apologize for any inconvenience this may have caused.\n\n` +
        `View your order: ${orderLink}\n` +
        `${productLink}\n` +
        `Our inventory is regularly updated, and we encourage you to visit our store to explore a wide range of other exciting products that might interest you.\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any questions or need further assistance, please don’t hesitate to reach out to our customer support team—we’re here to help!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("buyer Message: ", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onQualityIssueNotification(order, context, itemId) {
    const { collections } = context;
    const { Products } = collections;

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productId, productSlug, productVendor, sellerId } = matchedItem;

    const productUrl = `https://bizb.store/product/${productSlug}`;
    const orderId = order?.referenceId || "N/A";

    await Products.findOneAndUpdate(
        { _id: productId },
        {
            $set: {
                isVisible: false,
                updatedAt: new Date()
            }
        },
        { returnOriginal: false }
    );

    await context.mutations.publishProducts(context, [productId]);

    // New seller message
    const sellerMessage =
        `Subject: Quality Check Update for Your Item\n\n` +
        `Dear ${productVendor},\n\n` +
        `We regret to inform you that your item ${productUrl} in the order ${orderId} did not pass our quality check stage. We understand that this may be disappointing, but we need to maintain our quality standards.\n\n` +
        `The item will be returned to you shortly. If you have any questions or concerns, please feel free to reach out to us.\n\n` +
        `Thank you for your understanding.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("SELLER MESSAGE:", sellerMessage);
    await sendMessage(context, sellerId, sellerMessage, null);

    const customerName = order?.shipping?.[0]?.address?.fullName || "Customer";
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const homeLink = `https://bizb.store`;

    // New buyer message
    const buyerMessage =
        `Subject: Update on Your Order - Quality Check Status\n\n` +
        `Hi ${customerName},\n\n` +
        `We regret to inform you that the item ${productUrl} from your order ${orderId} did not pass our quality check. We sincerely apologize for any inconvenience this may have caused. Please know that we prioritize the quality of our products and customer trust, which is why we cannot compromise on these standards.\n\n` +
        `View your order: ${orderLink}\n\n` +
        `Our inventory is regularly updated, and we invite you to explore our wide range of other high-quality products available on our store/website.\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any questions or need further assistance, please don’t hesitate to contact our customer support team. We’re here to help!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE:", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping?.[0]?.address?.phone);
}

async function onPickupGeneratedNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    const { productSlug, productVendor, sellerId } = matchedItem;

    const productUrl = `https://bizb.store/product/${productSlug}`;
    const orderId = order?.referenceId || "N/A";

    // Updated seller message
    const sellerMessage =
        `Subject: Pickup Scheduled for Your Item\n\n` +
        `Dear ${productVendor},\n\n` +
        `We would like to inform you that we have scheduled the pickup of your article ${productUrl} in the order ${orderId} with our third-party logistics partner. Please ensure that all details previously shared with you are clearly marked on the parcel, and that it is properly packed.\n\n` +
        `The rider will attempt to pick up the parcel within the next 3 working days. Please ensure you are available to respond promptly to the rider's calls or messages, which may come from unknown numbers.\n\n` +
        `When the rider arrives to pick up the parcel, kindly share a picture of the parcel being handed over to them. Without this, we will not be able to accept responsibility for any potential parcel loss.\n\n` +
        `If the rider visits your address and you are unable to hand over the parcel, you will need to send it to our office using your own means.\n\n` +
        `In case we receive an update from the courier indicating that your address is not within their service area, you will need to send the parcel to us directly.\n\n` +
        `Thank you for your cooperation. If you encounter any issues or need further assistance, please don’t hesitate to contact us.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    await sendMessage(context, sellerId, sellerMessage, null);
}

async function onDispatchedChildNotification(order, context, itemId, productPurchased) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug, tracking_URL, tracking, courier_Name, productVendor, sellerId } = matchedItem;

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const productUrl = `https://bizb.store/product/${productSlug}`;
    const orderId = order?.referenceId || "N/A";

    // New Seller Message
    const sellerMessage =
        `Subject: Your item ${productUrl} Is Dispatched\n\n` +
        `Hi ${productVendor},\n` +
        `We're excited to let you know that your item ${productUrl} in the order ${orderId} has been dispatched to the buyer!\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("SELLER MESSAGE:", sellerMessage)

    await sendMessage(context, sellerId, sellerMessage, null);

    const productRef = productPurchased?.referenceId || "Product";

    // New Buyer Message
    const buyerMessage =
        `Subject: Your item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n` +
        `We're excited to let you know that the item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: https://bizb.store/order/${orderId}\n\n` +
        `Please check this ${tracking} (${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onReturnedToSellerkNotification(order, context, itemId) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug, cancelReason, productVendor, sellerId } = matchedItem;

    const productUrl = `https://bizb.store/product/${productSlug}`;
    const orderId = order?.referenceId || "N/A";

    if (!matchedItem) {
        throw new ReactionError("not-found", "Item not found in the order");
    }

    // New Seller Message
    const sellerMessage =
        `Subject: Product Returned to You\n\n` +
        `Hi ${productVendor},\n\n` +
        `We wanted to inform you that your product ${productUrl} in the order ${orderId} has been sent back to you. The reason for the return is: ${cancelReason}.\n\n` +
        `Please ensure to review the product and address the mentioned issue. If you have any questions or require further clarification, feel free to reach out to us.\n\n` +
        `Thank you for your cooperation.\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("SELLER MESSAGE:", sellerMessage)

    await sendMessage(context, sellerId, sellerMessage, null);
}

async function onReturninProcessNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug } = matchedItem;

    const productUrl = `https://bizb.store/product/${productSlug}`;
    const orderId = order?.referenceId || "N/A";
    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    // New Buyer Message
    const buyerMessage =
        `Subject: Return Initiation for Your Item ${productUrl}\n\n` +
        `Hi ${customerName},\n\n` +
        `We have received your request to return the item ${productUrl} from your order ${orderId}. The return process has now been initiated.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Our team will guide you through the next steps to ensure a smooth return experience. Please make sure the item is securely packed and includes all original tags and packaging.\n\n` +
        `If you have any questions or need assistance during the return process, feel free to reach out to us. We're here to help!\n\n` +
        `Thank you for choosing Bizb.\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnMPNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnTCSNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDipatchedOnLeopardNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnDaewooNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnPostexNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnTraxNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onDispatchedOnPentaNotification(order, context, itemId, productPurchased) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { tracking_URL, tracking, courier_Name } = matchedItem;

    // console.log("Purchased Product", productPurchased)

    const customerName = order?.shipping[0]?.address?.fullName || "Customer";
    const orderId = order?.referenceId || "N/A";
    const productRef = productPurchased?.referenceId || "Product";
    const orderPageUrl = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your Item ${productRef} Is Dispatched\n\n` +
        `Hi ${customerName},\n\n` +
        `We're excited to let you know that your item ${productRef} from your order ${orderId} has been dispatched! It's on its way to you. The estimated delivery time is 3 to 4 working days.\n` +
        `View your order: ${orderPageUrl}\n\n` +
        `Please check this (Tracking number: ${tracking}, Courier: ${courier_Name}), so you can keep an eye on the progress of your order.\n` +
        `Tracking link: ${tracking_URL}\n\n` +
        `If you have any questions or need further assistance, feel free to contact our customer support.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("BUYER MESSAGE:", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function onBookedOnPentaNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    const { productSlug, productVendor, sellerId } = matchedItem;
    const orderId = order?.referenceId || "N/A";
    const productURL = `https://bizb.store/product/${productSlug}`;

    const sellerMessage =
        `Subject: Pickup Scheduled for Your Item\n\n` +
        `Dear ${productVendor},\n\n` +
        `We would like to inform you that we have scheduled the pickup of your article ${productURL} in the order ${orderId} with our third-party logistics partner. Please ensure that all details previously shared with you are clearly marked on the parcel, and that it is properly packed.\n\n` +
        `The rider will attempt to pick up the parcel within the next 3 working days. Please ensure you are available to respond promptly to the rider's calls or messages, which may come from unknown numbers.\n\n` +
        `When the rider arrives to pick up the parcel, kindly share a picture of the parcel being handed over to them. Without this, we will not be able to accept responsibility for any potential parcel loss.\n\n` +
        `If the rider visits your address and you are unable to hand over the parcel, you will need to send it to our office using your own means.\n\n` +
        `In case we receive an update from the courier indicating that your address is not within their service area, you will need to send the parcel to us directly.\n\n` +
        `Thank you for your cooperation. If you encounter any issues or need further assistance, please don’t hesitate to contact us.\n\n` +
        `Best regards,\n` +
        `BizB Team`;
    // console.log("SELLER MESSAGE:", sellerMessage)
    await sendMessage(context, sellerId, sellerMessage, null);
}

async function onBookedPostEx(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    const { productSlug, productVendor, sellerId } = matchedItem;
    const orderId = order?.referenceId || "N/A";
    const productURL = `https://bizb.store/product/${productSlug}`;

    const sellerMessage =
        `Subject: Pickup Scheduled for Your Item\n\n` +
        `Dear ${productVendor},\n\n` +
        `We would like to inform you that we have scheduled the pickup of your article ${productURL} in the order ${orderId} with our third-party logistics partner. Please ensure that all details previously shared with you are clearly marked on the parcel, and that it is properly packed.\n\n` +
        `The rider will attempt to pick up the parcel within the next 3 working days. Please ensure you are available to respond promptly to the rider's calls or messages, which may come from unknown numbers.\n\n` +
        `When the rider arrives to pick up the parcel, kindly share a picture of the parcel being handed over to them. Without this, we will not be able to accept responsibility for any potential parcel loss.\n\n` +
        `If the rider visits your address and you are unable to hand over the parcel, you will need to send it to our office using your own means.\n\n` +
        `In case we receive an update from the courier indicating that your address is not within their service area, you will need to send the parcel to us directly.\n\n` +
        `Thank you for your cooperation. If you encounter any issues or need further assistance, please don’t hesitate to contact us.\n\n` +
        `Best regards,\n` +
        `BizB Team`;
    // console.log("SELLER MESSAGE:", sellerMessage)
    await sendMessage(context, sellerId, sellerMessage, null);
}

async function onDeliveredNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug } = matchedItem;

    const customerName = order?.shipping[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';

    const productLink = `https://bizb.store/product/${productSlug}`;
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Your item ${productLink} Is Delivered\n\n` +
        `Hi ${customerName},\n` +
        `Great news! Your item ${productLink} from your order ${orderId} has been delivered successfully.\n` +
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

async function onPaymentReleasedNotification(order, context, itemId) {


    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug, productVendor, sellerId } = matchedItem;

    const orderId = order?.referenceId || 'N/A';
    const productLink = `https://bizb.store/product/${productSlug}`;

    const sellerMessage =
        `Subject: Payment Transfer Notification\n\n` +
        `Dear ${productVendor},\n` +
        `We're pleased to inform you that the payment for your sold item ${productLink} in the order ${orderId} on BizB has been successfully transferred to your account. You should see the funds reflected in your account shortly.\n` +
        `Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need further assistance, please don't hesitate to reach out to our support team.\n\n` +
        `Best regards,\n` +
        `BizB Team`;

    // console.log("SELLER MESSAGE ON PAYMENT RELEASED: ", sellerMessage);

    await sendMessage(context, sellerId, sellerMessage, null);
}

async function onRestock(order, context, productPurchased) {
    const { collections } = context
    const { Catalog, SimpleInventory, Products } = collections
    const productId = productPurchased.ancestors[0]

    const productLink = await Catalog.findOne({ "product._id": productId })

    if (!productLink) throw new ReactionError("not-found", "Product not found");

    let { modifiedCount } = await Products.findOneAndUpdate({ _id: productId }, {
        $set: {
            isVisible: true,
            updatedAt: new Date()
        }
    }, { returnOriginal: false })

    const updateResult = await SimpleInventory.updateOne(
        {
            'productConfiguration.productId': productId,
        },
        {
            $set: {
                'inventoryInStock': 1,
                'inventoryReserved': 0
            }
        }
    );

    await context.mutations.publishProducts(context, [productId])
}

async function OnHoldNotification(order, context, itemId) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug } = matchedItem;

    const customerName = order?.shipping[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';

    const productLink = `https://bizb.store/product/${productSlug}`;
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Updated Delivery Timeline for Your Item\n\n` +
        `Dear ${customerName},\n\n` +
        `We sincerely apologize for the delay in processing your item ${productLink} from your order ${orderId}. We understand the importance of timely delivery and are working diligently to ensure your order reaches you as soon as possible.\n` +
        `View your order: ${orderLink}\n\n` +
        `We truly appreciate your patience and understanding during this time.\n` +
        `If you have any questions or concerns, please don't hesitate to reach out to our customer support team—we're always here to help.\n\n` +
        `Thank you for choosing Bizb!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE ON HOLD:", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function OnRefundedNotification(order, context, itemId) {
    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug } = matchedItem;
    const customerName = order?.shipping[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;
    const homeLink = `https://bizb.store`;

    const productLink = productSlug ? `https://bizb.store/product/${productSlug}` : 'your item';

    const buyerMessage =
        `Subject: Refund Process Completed for Your Item\n\n` +
        `Hi ${customerName},\n\n` +
        `We hope you're doing well! We’re pleased to inform you that the refund for the item ${productLink} from your order ${orderId} has been successfully processed and credited to your provided account details.\n` +
        `View your order: ${orderLink}\n\n` +
        `We value you as a customer and would love to see you shop with us again. Don’t forget to check out our latest collection for amazing deals and unique items curated just for you! 😊\n` +
        `Visit our store: ${homeLink}\n\n` +
        `If you have any questions or need further assistance, feel free to reach out.\n\n` +
        `Thank you for choosing Bizb, and we look forward to serving you again soon!\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}

async function OnRefundInProcessNotification(order, context) {
    const customerName = order?.shipping?.[0]?.address?.fullName || 'Customer';
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const buyerMessage =
        `Subject: Refund Process Update for Your Item\n\n` +
        `Hi ${customerName},\n\n` +
        `We hope you're doing well. We wanted to inform you that the refund for the item from your order ${orderId} is currently in process.\n` +
        `View your order: ${orderLink}\n\n` +
        `As soon as the refund is completed, we will notify you immediately. If you have any questions in the meantime, feel free to reach out.\n\n` +
        `Thank you for your patience and understanding! 😊\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("BUYER MESSAGE REFUND IN PROCESS", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping?.[0]?.address?.phone);
}

async function OnQualityApprovedNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug, productVendor, sellerId } = matchedItem;
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const productLink = productSlug ? `https://bizb.store/product/${productSlug}` : 'your item';
    let sellerMessage =
        'Subject: Your Article is Ready for Dispatch!\n\n' +
        `Hi ${productVendor},\n\n` +
        `Great news! Your article [${productLink}] in the order [${orderLink}] has successfully passed our quality check process on Bizb 🎉. It is now ready to be dispatched to the customer.\n\n` +
        `If you have any questions or need further assistance, please don’t hesitate to reach out to our support team.\n\n` +
        `Thank you for your commitment to quality! 😊\n\n` +
        `Best regards,\n` +
        `Bizb Team`;

    // console.log("SELLER MESSAGE:", sellerMessage)

    await sendMessage(context, sellerId, sellerMessage, null)
}


async function OnReturnReceivedNotification(order, context, itemId) {

    const shippingArray = order.shipping[0];
    const result = shippingArray.items;
    const matchedItem = result.find(item => item._id === itemId);
    // console.log("RESULT in the SUB ORDER", matchedItem)
    const { productSlug } = matchedItem;
    const orderId = order?.referenceId || 'N/A';
    const orderLink = `https://bizb.store/en/checkout/order?orderId=${orderId}`;

    const productLink = productSlug ? `https://bizb.store/product/${productSlug}` : 'your item';
    let buyerMessage =
        'Subject: Update on Your Returned Item\n\n' +
        `Hi ${order?.shipping[0]?.address?.fullName},\n\n` +
        `We hope you're doing well. We wanted to let you know that the item [${productLink}] from your order [${orderLink}] that you had canceled has been received back at our office.\n\n` +
        `If you have any questions or need further assistance, please feel free to reach out.\n\n` +
        `Thank you for shopping with us, and we hope to serve you again in the future! 😊\n\n` +
        `Best regards,\n` +
        `Bizb Team`;
    // console.log("BUYER MESSAGE:", buyerMessage)
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone);
}


async function onCompleteNotification(order, context, itemId) {
    console.log("ORDER COMPLETED NOTIFICATION")
    // console.log("ORDER COMPLETED NOTIFICATION", order)
    return order
}