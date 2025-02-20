import { decodeOrderItemOpaqueId, decodeOrderOpaqueId } from "../../xforms/id.js";

/**
 * @name Mutation/updateOrderItem
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the updateOrderItem GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {String} args.input.orderId - The order ID
 * @param {String} args.input.itemId - The ID of the item to cancel
 * @param {String} [args.input.reason] - Optional free text reason for cancel
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} CancelOrderItemPayload
 */
export default async function updateOrderItem(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    itemId,
    status,
    orderId,
    reason,
    tracking,
    courier_Name,
    tracking_URL
  } = input;

  const { order } = await context.mutations.updateOrderItem(context, {
    itemId: decodeOrderItemOpaqueId(itemId),
    orderId: decodeOrderOpaqueId(orderId),
    status,
    reason,
    tracking,
    courier_Name,
    tracking_URL
  });

  return {
    clientMutationId,
    order
  };
}
