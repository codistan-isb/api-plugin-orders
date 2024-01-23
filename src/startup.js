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
