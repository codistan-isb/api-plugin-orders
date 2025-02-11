
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

    let productPurchased = await getProductbyId(context, { productId: order?.shipping[0]?.items[0]?.variantId })

    let buyerMessage =
        'Subject: Your Order ' + order?.referenceId + ' is Placed\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'Thank you for your purchase! Your order is placed successfully. Please note that the order delivery process may take 7-10 working days.\n\n' +
        'Visit our store: https://bizb.store\n\n' +
        'Order Summary:\n' +
        await generateOrderSummary(order?.shipping[0]?.items) + '\n\n' +
        'Please respond to this message for confirmation by typing "confirmed". If you have any questions or need further assistance, feel free to contact our customer support at support@bizb.store.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

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

}

export async function onUpdateOrder(order, context, updatedBy) {

    // console.log("ORDER IN THE ON UPDATE STATUS", order)
    let productPurchased = await getProductbyId(context, { productId: order?.shipping[0]?.items[0]?.variantId });

    if (order.workflow && order.workflow.status === "Cancelled") {
        await orerCancelNotification(order, context, productPurchased,)
    } else if (order.workflow && order.workflow.status === "Confirmed") {
        await onConfirmNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "Out_Of_Stock") {
        await onOutofStockNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "Dispatched") {
        await onDispatchedNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "On_Hold") {
        await OnHoldNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "Delivered") {
        await onDeliveredNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "Refunded") {
        await OnRefundedNotification(order, context, productPurchased)
    } else if (order.workflow && order.workflow.status === "Refund_In_Process") {
        await OnRefundInProcessNotification(order, context, productPurchased)
    } else {
        // Handle any other status or default case here
        console.log("Unhandled order status:", order.workflow.status);
        // Optionally, handle or log the unhandled status appropriately
    }


}

export async function onSubOrderUpdated(subOrder, context) {

    // console.log("ORDER IN THE CHILD ORDER UPDATE", subOrder)
    let productPurchased = await getProductbyId(context, { productId: subOrder?.shipping[0]?.items[0]?.variantId });

    if (subOrder.workflow && subOrder.workflow.status === "RTS_Cancelled") {
        // console.log("ORDER IN THE ON UPDATE STATUS HIT THE RTS_Cancelled")
        await orerCancelNotification(subOrder, context, productPurchased,)
    } else if (subOrder.workflow && subOrder.workflow.status === "Out_Of_Stock") {
        await onOutofStockNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Quality_Issue") {
        await onQualityIssueNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Pickup_Generated") {
        await onPickupGeneratedNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Returned_To_Seller") {
        await onReturnedToSellerkNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Return_in_Process") {
        await onReturninProcessNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_MP") {
        await onDispatchedOnMPNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dipatched_On_Leopard") {
        await onDipatchedOnLeopardNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_TCS") {
        await onDispatchedOnTCSNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Daewoo") {
        await onDispatchedOnDaewooNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Postex") {
        await onDispatchedOnPostexNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Booked_On_Penta") {
        await onBookedOnPentaNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Dispatched_On_Penta") {
        await onDispatchedOnPentaNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Delivered") {
        await onDeliveredNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Payment_Released") {
        await onPaymentReleasedNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Restocked") {
        await onRestock(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "On_Hold") {
        await OnHoldNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Refunded") {
        await OnRefundedNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Refund_In_Process") {
        await OnRefundInProcessNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Quality_Approved") {
        await OnQualityApprovedNotification(subOrder, context, productPurchased)
    } else if (subOrder.workflow && subOrder.workflow.status === "Return_Received") {
        await OnReturnReceivedNotification(subOrder, context, productPurchased)
    } else {
        // Handle any other status or default case here
        console.log("Unhandled order status:", subOrder.workflow.status);
        // Optionally, handle or log the unhandled status appropriately
    }
}

async function orerCancelNotification(order, context, productPurchased) {

    const { collections } = context

    const { Products, SimpleInventory } = collections;

    // console.log("PRODUCT PURCHASED IN ORDER CNCELLATION", productPurchased)


    // console.log("productPurchased._id", productPurchased._id)
    const productId = productPurchased.ancestors[0]

    const foundProduct = await Products.findOne({
        _id: productId,

    })
    if (!foundProduct) throw new ReactionError("not-found", "Product not found");

    const updateResult = await SimpleInventory.updateOne(
        {
            'productConfiguration.productId': productId,
        },
        {
            $set: {
                'inventoryReserved': 0
            }
        }
    );

    // console.log("Update Result: ", updateResult);

    // console.log("productId", productId)

    // const productId = decodeProductOpaqueId(productConfiguration.productId);
    // const productVariantId = decodeProductOpaqueId(productConfiguration.productVariantId);
    // const shopId = decodeShopOpaqueId(opaqueShopId);
    // const inventoryInfo = await context.mutations.updateSimpleInventory(context, {
    //     canBackorder: false,
    //     inventoryInStock: 2,
    //     isEnabled: true,
    //     lowInventoryWarningThreshold: 0,
    //     productConfiguration: {
    //         productId: productPurchased.ancestors[0],
    //         productVariantId: productPurchased._id,
    //     },
    //     shopId: productPurchased.shopId,
    // });
    // let inventory = await context.mutations.updateSimpleInventory(context, input);

    await context.mutations.publishProducts(context, [productId])

    let sellerMessage =
        'Subject: Order Cancellation Notification\n\n' +
        'Dear ' + productPurchased?.uploadedBy?.name + ',\n\n' +
        'We regret to inform you that the order placed for your item ' + productPurchased?.title + ' on BizB has been cancelled by the buyer. We understand that this may be disappointing, but rest assured, your item will be restocked on our platform for potential buyers.\n\n' +
        'Thank you for your understanding. If you have any questions or concerns, please feel free to reach out to us.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("SELLER MESSAGE", sellerMessage);
    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)

    let buyerMessage =
        'Subject: Order ' + order?.referenceId + ' Cancellation Confirmation\n' +
        'Dear ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We are sorry to inform you that your order ' + order?.referenceId + ' with BizB has been cancelled as per your request. We understand that circumstances can change, and we respect your decision.\n\n' +
        'Order Details:\n' +
        'Order ID: ' + order?.referenceId + '\n' +
        'Cancellation Date: ' + new Date().toLocaleDateString() + '\n\n' +
        'If you have any further questions or concerns, please feel free to reach out to our customer support team. We are here to assist you.\n\n' +
        'Thank you for considering BizB, and we hope to have the opportunity to serve you in the future.\n\n' +
        'Best regards,\n' +
        'BizB Team';


    // console.log("BUYER MESSAGE", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)
}


async function onConfirmNotification(order, context, productPurchased) {

    const { collections } = context

    // console.log("ORDER: " + order)

    const { Catalog } = collections
    console.log("productPurchased.ancestors[0]", productPurchased.ancestors[0])
    const productId = productPurchased.ancestors[0]

    const productLink = await Catalog.findOne({ "product._id": productId })

    // console.log("productLink: " + productLink)

    const { slug } = productLink.product;
    // console.log("PRODUCT SLUG: " + slug)


    let sellerMessage =
        "Subject: Your Item Has Been Purchased!\n\n" +
        "Dear " + productPurchased?.uploadedBy?.name + ",\n\n" +
        "We're excited to inform you that one of your listed items on BizB has been purchased by a buyer! Congratulations on your sale!\n\n" +
        "Please ensure that the item at https://staging.bizb.store/product/" + slug + " is neat and clean and ready for pickup by our logistics partner. The rider will visit to collect the article from your specified location. Kindly have the item packed securely and ready for handover.\n\n" +
        "Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need assistance, feel free to reach out to our seller support team.\n\n" +
        "Best regards,\n" +
        "BizB Team";
    ;
    // console.log("SELLER MESSAGE: ", sellerMessage)
    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)

}

async function onOutofStockNotification(order, context, productPurchased) {
    const { collections } = context
    const { Catalog, SimpleInventory } = collections
    const productId = productPurchased.ancestors[0]

    const productLink = await Catalog.findOne({ "product._id": productId })

    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    const updateResult = await SimpleInventory.updateOne(
        {
            'productConfiguration.productId': productId,
        },
        {
            $set: {
                'inventoryInStock': 0
            }
        }
    );

    await context.mutations.publishProducts(context, [productId])

    let buyerMessage =
        'Subject: Your Selected Product https://staging.bizb.store/product/' + slug + ' is Out of Stock\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We regret to inform you that the item you recently ordered https://staging.bizb.store/product/' + slug + ' is currently out of stock. We sincerely apologize for any inconvenience this may have caused.\n\n' +
        'Our inventory is regularly updated, and we encourage you to visit our store to explore a wide range of other exciting products that might interest you.\n\n' +
        'If you have any questions or need further assistance, please don’t hesitate to reach out to our customer support team—we’re here to help!\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("buyer Message: ", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)
}

async function onQualityIssueNotification(order, context, productPurchased) {

    // console.log("ORDER  ISIDE THE THE QUALITY ISSUE FUNCTION", order)

    const { collections } = context
    const { Catalog, Products } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let { modifiedCount } = await Products.findOneAndUpdate({ _id: productId }, {
        $set: {
            isVisible: false,
            updatedAt: new Date()
        }
    }, { returnOriginal: false })

    await context.mutations.publishProducts(context, [productId])

    let sellerMessage =
        'Subject: Quality Check Update for Your Item\n' +
        'Dear ' + sellerName + ',\n\n' +
        'We regret to inform you that your item https://staging.bizb.store/product/' + slug + ' did not pass our quality check stage. We understand that this may be disappointing, but we need to maintain our quality standards.\n\n' +
        'The item will be returned to you shortly. If you have any questions or concerns, please feel free to reach out to us.\n\n' +
        'Thank you for your understanding.\n' +
        'Best regards,\n' +
        'BizB Team';


    // console.log("SELLER MESSAGE: ", sellerMessage)
    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)


    let buyerMessage =
        'Subject: Update on Your Order - Quality Check Status\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We regret to inform you that the item you recently ordered https://staging.bizb.store/product/' + slug + ' did not pass our quality check. We sincerely apologize for any inconvenience this may have caused. Please know that we prioritize the quality of our products and customer trust, which is why we cannot compromise on these standards.\n\n' +
        'Our inventory is regularly updated, and we invite you to explore our wide range of other high-quality products available on our store/website.\n\n' +
        'If you have any questions or need further assistance, please don’t hesitate to contact our customer support team. We’re here to help!\n\n' +
        'Best regards,\n' +
        'Bizb Team';


    // console.log("buyerMessage: ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)
}
async function onPickupGeneratedNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let sellerMessage =
        'Subject: Pickup Scheduled for Your Item\n\n' +
        'Dear ' + sellerName + ',\n\n' +
        'We would like to inform you that we have scheduled the pickup of your article https://staging.bizb.store/product/' + slug + ' with our third-party logistics partner. Please ensure that all details previously shared with you are clearly marked on the parcel, and that it is properly packed.\n\n' +
        'The rider will attempt to pick up the parcel within the next 3 working days. Please ensure you are available to respond promptly to the rider’s calls or messages, which may come from unknown numbers.\n\n' +
        'When the rider arrives to pick up the parcel, kindly share a picture of the parcel being handed over to them. Without this, we will not be able to accept responsibility for any potential parcel loss.\n\n' +
        'If the rider visits your address and you are unable to hand over the parcel, you will need to send it to our office using your own means.\n\n' +
        'In case we receive an update from the courier indicating that your address is not within their service area, you will need to send the parcel to us directly.\n\n' +
        'Thank you for your cooperation. If you encounter any issues or need further assistance, please don’t hesitate to contact us.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("SELLER MESSAGE: " + sellerMessage);
    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)

}
async function onDispatchedNotification(order, context, productPurchased) {
    const { collections } = context
    const { Catalog } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;
    let sellerMessage =
        'Subject: Your item https://staging.bizb.store/product/' + slug + ' Is Dispatched\n\n' +
        'Hi ' + sellerName + ',\n' +
        'We\'re excited to let you know that your item at https://staging.bizb.store/product/' + slug + ' has been dispatched to the buyer! \n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("SELLER MESSAGE", sellerMessage);

    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)


    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check this link for your order tracking: [insert tracking link here], so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("BUYER MESSAGE: ", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}
async function onReturnedToSellerkNotification(order, context, productPurchased) {
    const { collections } = context
    const { Catalog } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;
    let sellerMessage =
        'Subject: Product Returned to You\n\n' +
        'Hi ' + sellerName + ',\n\n' +
        'We wanted to inform you that your product at https://staging.bizb.store/product/' + slug + ' has been sent back to you. The reason for the return is: [Reason for Return].\n\n' +
        'Please ensure to review the product and address the mentioned issue. If you have any questions or require further clarification, feel free to reach out to us.\n\n' +
        'Thank you for your cooperation.\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("SELLER MESSAGE", sellerMessage)
    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)

}

async function onReturninProcessNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let buyerMessage =
        'Subject: Return Initiation for Your Order\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We have received your request to return the item at https://staging.bizb.store/product/' + slug + ' from your order ' + order?.referenceId + '. The return process has now been initiated.\n\n' +
        'Our team will guide you through the next steps to ensure a smooth return experience. Please make sure the item is securely packed and includes all original tags and packaging.\n\n' +
        'If you have any questions or need assistance during the return process, feel free to reach out to us. We\'re here to help!\n\n' +
        'Thank you for choosing Bizb.\n\n' +
        'Best regards,\n' +
        'Bizb Team';


    // console.log("BUYER MESSAGE: ", buyerMessage);
    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)
}

async function onDispatchedOnMPNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check this link for your tracking info: [insert tracking URL here] (Tracking number: [insert tracking number here], Courier: [insert courier name here]), so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("buyer Message: ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function onDispatchedOnTCSNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check your order tracking here: [insert tracking link here] (Tracking Number: [insert tracking number], Courier: [insert courier name]), so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("buyer Message on TCS", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}
async function onDipatchedOnLeopardNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check this link for your order tracking: [insert tracking link here], and your tracking number is [insert tracking number here] with [insert courier name] as the courier, so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("buyer Message on LeoPard", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function onDispatchedOnDaewooNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check your tracking information here: [insert tracking link here], with Tracking Number: [insert tracking number], Courier: [insert courier name], so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("Buyer message on Daewoo", buyerMessage)

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function onDispatchedOnPostexNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check this link for your order tracking: [insert tracking link here], with Tracking Number: [insert tracking number], Courier: [insert courier name], so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support.\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("BUYER MESSAGE:In Postex ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}


async function onBookedOnPentaNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog, Products } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let sellerMessage =
        'Subject: Pickup Scheduled for Your Item\n\n' +
        'Dear ' + sellerName + ',\n\n' +
        'We would like to inform you that we have scheduled the pickup of your article at https://staging.bizb.store/product/' + slug + ' with our third-party logistics partner. Please ensure that all details previously shared with you are clearly marked on the parcel, and that it is properly packed.\n\n' +
        'The rider will attempt to pick up the parcel within the next 3 working days. Please ensure you are available to respond promptly to the rider’s calls or messages, which may come from unknown numbers.\n\n' +
        'When the rider arrives to pick up the parcel, kindly share a picture of the parcel being handed over to them. Without this, we will not be able to accept responsibility for any potential parcel loss.\n\n' +
        'If the rider visits your address and you are unable to hand over the parcel, you will need to send it to our office using your own means.\n\n' +
        'In case we receive an update from the courier indicating that your address is not within their service area, you will need to send the parcel to us directly.\n\n' +
        'Thank you for your cooperation. If you encounter any issues or need further assistance, please don’t hesitate to contact us.\n\n' +
        'Best regards,\n' +
        'BizB Team';


    // console.log("SLLER MESSAGE in PENTA BOOKED", sellerMessage)

    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)


}

async function onDispatchedOnPentaNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your Order ' + order?.referenceId + ' Is Dispatched\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'We\'re excited to let you know that your order ' + order?.referenceId + ' has been dispatched! It\'s on its way to you. The estimated delivery time is 3 to 4 working days.\n\n' +
        'Please check this link for your order tracking: [insert tracking link here], with Tracking Number: [insert tracking number], Courier: [insert courier name], so you can keep an eye on the progress of your order.\n\n' +
        'If you have any questions or need further assistance, feel free to contact our customer support\n\n' +
        'Best regards,\n' +
        'BizB Team';


    // console.log("buyerMessage ON PENTA PATCHED", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function onDeliveredNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Your Order ' + order?.referenceId + ' Is Delivered\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n' +
        'Great news! Your order ' + order?.referenceId + ' has been delivered successfully. We hope you\'re satisfied with your purchase.\n' +
        'Please rate your experience here: https://forms.gle/7Ac2NzkoxgAbXCnn8\n\n' +
        'If you have any questions or need assistance with anything related to your order, please don\'t hesitate to reach out to our customer support team.\n' +
        'Thank you for choosing BizB!\n\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("buyer Message ON DELIVERERD", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}


async function onRestock(order, context, productPurchased) {
    const { collections } = context
    const { Catalog, SimpleInventory, Products } = collections
    const productId = productPurchased.ancestors[0]

    const productLink = await Catalog.findOne({ "product._id": productId })

    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

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

async function onPaymentReleasedNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog, Products } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let sellerMessage =
        'Subject: Payment Transfer Notification\n\n' +
        'Dear ' + sellerName + ',\n' +
        'We\'re pleased to inform you that the payment for your sold item at https://staging.bizb.store/product/' + slug + ' on BizB has been successfully transferred to your account. You should see the funds reflected in your account shortly.\n' +
        'Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need further assistance, please don\'t hesitate to reach out to our support team.\n' +
        'Best regards,\n' +
        'BizB Team';

    // console.log("SELLER MESSAGE ON Payment Realsed", sellerMessage)

    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)


}

async function onCompletedNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog, Products } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let sellerMessage = `
    Subject: Payment Transfer Notification

    Dear ${sellerName},
    We're pleased to inform you that the payment for your sold item https://staging.bizb.store/product/${slug} on BizB has been successfully transferred to your account. You should see the funds reflected in your account shortly.
    Thank you for choosing BizB as your platform for selling preloved fashion. If you have any questions or need further assistance, please don't hesitate to reach out to our support team.


    Best regards, 
    BizB Team`

    // console.log("SELLER MESSAGE", sellerMessage)

}

async function OnHoldNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Updated Delivery Timeline for Your Order\n\n' +
        'Dear ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We sincerely apologize for the delay in processing your order ' + order?.referenceId + '. We understand the importance of timely delivery and are working diligently to ensure your order reaches you as soon as possible.\n\n' +
        'We truly appreciate your patience and understanding during this time. \n' +
        'If you have any questions or concerns, please don\'t hesitate to reach out to our customer support team—we\'re always here to help.\n\n' +
        'Thank you for choosing Bizb!\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("BUYER MESSAGE", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function OnRefundedNotification(order, context, productPurchased) {

    let sellerMessage =
        'Subject: Refund Process Completed for Your Order\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We hope you\'re doing well! We’re pleased to inform you that the refund for your canceled order ' + order?.referenceId + ' has been successfully processed and credited to your provided account details.\n\n' +
        'We value you as a customer and would love to see you shop with us again. Don’t forget to check out our latest collection for amazing deals and unique items curated just for you! 😊\n\n' +
        'If you have any questions or need further assistance, feel free to reach out.\n\n' +
        'Thank you for choosing Bizb, and we look forward to serving you again soon!\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("BUYER MESSAGE", sellerMessage);

    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)
}

async function OnRefundInProcessNotification(order, context, productPurchased) {

    let buyerMessage =
        'Subject: Refund Process Update for Your Order\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We hope you\'re doing well. We wanted to inform you that the refund for your canceled order ' + order?.referenceId + ' is currently in process.\n\n' +
        'As soon as the refund is completed, we will notify you immediately. If you have any questions in the meantime, feel free to reach out.\n\n' +
        'Thank you for your patience and understanding! 😊\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("BUYER MESSAGE REFUND IN PROCESS", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}

async function OnQualityApprovedNotification(order, context, productPurchased) {

    const { collections } = context
    const { Catalog, Products } = collections

    const productId = productPurchased?.ancestors[0]
    const productLink = await Catalog.findOne({ "product._id": productId })
    const sellerName = productPurchased.uploadedBy.name

    // console.log("SELLER NAME", sellerName)
    if (!productLink) throw new ReactionError("not-found", "Product not found");

    const { slug } = productLink.product;

    let sellerMessage =
        'Subject: Your Article is Ready for Dispatch!\n\n' +
        'Hi ' + sellerName + ',\n\n' +
        'Great news! Your article at https://staging.bizb.store/product/' + slug + ' has successfully passed our quality check process on Bizb 🎉. It is now ready to be dispatched to the customer.\n\n' +
        'If you have any questions or need further assistance, please don’t hesitate to reach out to our support team.\n\n' +
        'Thank you for your commitment to quality! 😊\n\n' +
        'Best regards,\n' +
        'Bizb Team';


    // console.log("SELLER MESSAGE ON QUALITY APPROVEd", sellerMessage)

    await sendMessage(context, productPurchased?.uploadedBy?.userId, sellerMessage, null)

}

async function OnReturnReceivedNotification(order, context, productPurchased) {


    let buyerMessage =
        'Subject: Update on Your Returned Order\n\n' +
        'Hi ' + order?.shipping[0]?.address?.fullName + ',\n\n' +
        'We hope you\'re doing well. We wanted to let you know that the order ' + order?.referenceId + ' you had canceled has been received back at our office.\n\n' +
        'If you have any questions or need further assistance, please feel free to reach out.\n\n' +
        'Thank you for shopping with us, and we hope to serve you again in the future! 😊\n\n' +
        'Best regards,\n' +
        'Bizb Team';

    // console.log("BUYER MESSAGE:ON RETUR RECEUVED ", buyerMessage);

    await sendMessage(context, null, buyerMessage, order?.shipping[0]?.address?.phone)

}