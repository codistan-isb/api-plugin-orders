import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @name getOrderQuery
 * @method
 * @memberof Order/helpers
 * @summary Queries for an order and returns it if user has correct permissions
 * @param {Object} context An object containing the per-request state
 * @param {Object} selector Order ID or Reference ID to query
 * @param {String} shopId Shop ID of the order
 * @param {String} token An anonymous order token, required if the order was placed without being logged in
 * @returns {Object} An order object
 */
export async function getOrderQuery(context, selector, shopId, token) {
  const { collections } = context;

  const order = await collections.Orders.findOne(selector);

  // console.log("order", order);
  // console.log("order============", order.shipping[0]);

  let shippingWorkflows = [];
  if (order.shipping && order.shipping.length > 0) {
    shippingWorkflows = order.shipping.map((shipment, index) => ({
      index: index + 1,
      workflowStatus: shipment.workflow.workflow
    }));
  } else {
    shippingWorkflows = "No shipping information available.";
  }
  if (!order) {
    throw new ReactionError("not-found", "Order not found");
  }

  order.shippingWorkflows = shippingWorkflows;


  // If you have the hashed token, you don't need to pass a permission check
  if (token && order.anonymousAccessTokens.some((accessToken) => accessToken.hashedToken === hashToken(token))) {
    return order;
  }

  // if you don't have the hashed token,
  // you must either have `reaction:legacy:orders/read` permissions,
  // or this must be your own order
  await context.validatePermissions(
    "reaction:legacy:orders",
    "read",
    {
      shopId,
      owner: order.accountId
    }
  );

  return order;
}
