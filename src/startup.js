import sendOrderEmail from "./util/sendOrderEmail.js";
import createNotification from "./util/createNotification.js";
import getProductbyId from "./util/getProductbyId.js";
import { encodeShopOpaqueId, encodeProductOpaqueId, decodeProductOpaqueId, decodeShopOpaqueId } from "./xforms/id.js";
import Logger from "@reactioncommerce/logger";
import fetch from "node-fetch"
import { onCreateOrder, onUpdateOrder, onSubOrderUpdated } from "./util/customStatuses.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default function ordersStartup(context) {
  const { appEvents, collections } = context;

  appEvents.on("afterOrderCreate", ({ order }) => sendOrderEmail(context, order));

  // EVENTS CALL ON THE PLACE ORDEr WHERE ORDER CREATE
  appEvents.on("afterOrderCreate", async ({ order, createdBy }) => {
    await onCreateOrder(order, context, createdBy)

  });

  // EVENTS CALL ON THE FULLFILLMENT GROUP UPDATED  (MAIN ORDER STATUS UPDATED)
  appEvents.on("afterOrderUpdate", async ({ order, updatedBy }) => {
    // let { Products } = collections
    await onUpdateOrder(order, context, updatedBy)

  });

  // EVENTS CALL ON THE FULLFILLMENT GROUP ITEMS  UPDATED  (SUBORDER  ORDER STATUS UPDATED)
  appEvents.on("afterSubOrderUpdate", async ({ subOrder, updatedBy }) => {
    await onSubOrderUpdated(subOrder, context)
  });
}