import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import Random from "@reactioncommerce/random";
import updateGroupStatusFromItemStatus from "../util/updateGroupStatusFromItemStatus.js";
import { Order as OrderSchema } from "../simpleSchemas.js";


// These should eventually be configurable in settings
const itemStatusesThatOrdererCanCancel = ["new"];
const orderStatusesThatOrdererCanCancel = ["new"];

const inputSchema = new SimpleSchema({

  itemId: String,
  orderId: String,
  status: String

});

/**
 * @method updateOrderItem
 * @summary Use this mutation to update one item of an order, either for the
 *   full ordered quantity or for a partial quantity. If partial, the item will be
 *   split into two items and the original item will have a lower quantity and will
 *   be canceled.
 *
 *   If this results in all items in a fulfillment group being canceled, the group
 *   will also be canceled. If this results in all fulfillment groups being canceled,
 *   the full order will also be canceled.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `order` property containing the created order
 */
export default async function updateOrderItem(context, input) {
  console.log("input", input)
  inputSchema.validate(input);
  let sellerId = null;
  const {
    orderId,
    itemId,
    status,
    reason = null
  } = input;
  console.log("updateOrderItem", status)
  const { accountId, appEvents, collections, userId } = context;
  const { Orders } = collections;

  // First verify that this order actually exists
  const order = await Orders.findOne({ _id: orderId });
  if (!order) throw new ReactionError("not-found", "Order not found");

  // await context.validatePermissions(`reaction:legacy:orders:${order._id}`, "update:item", {
  //   shopId: order.shopId,
  //   owner: order.accountId
  // });

  // Is the account calling this mutation also the account that placed the order?
  // We need this check in a couple places below, so we'll get it here.
  const accountIsOrderer = (order.accountId && accountId === order.accountId);

  // The orderer may only update while the order status is still "new"
  if (accountIsOrderer && !orderStatusesThatOrdererCanCancel.includes(order.workflow.status)) {
    throw new ReactionError("invalid", `Order status (${order.workflow.status}) is not one of: ${orderStatusesThatOrdererCanCancel.join(", ")}`);
  }

  // Find and update the item
  let foundItem = false;
  const updatedGroups = order.shipping.map((group) => {
    let itemToAdd;
    const updatedItems = group.items.map((item) => {
      if (item._id !== itemId) return item;
      foundItem = true;

      // The orderer may only update while the order item status is still "new"
      // if (accountIsOrderer && !itemStatusesThatOrdererCanCancel.includes(item.workflow.status)) {
      //   throw new ReactionError("invalid", `Item status (${item.workflow.status}) is not one of: ${itemStatusesThatOrdererCanCancel.join(", ")}`);
      // }

      // If they are requesting to update fewer than the total quantity of items
      // that were ordered, we'll create a new item here with the remaining quantity.
      // It will have the same status as this item has before we update it.
      // Later, after we exit this loop, we'll append it to the `group.items` list.
      // if (item.quantity > cancelQuantity) {
      //   const newItemQuantity = item.quantity - cancelQuantity;
      //   itemToAdd = {
      //     ...item,
      //     _id: Random.id(),
      //     quantity: newItemQuantity
      //   };

      //   // Update the subtotal since it is related to the quantity
      //   itemToAdd.subtotal = item.price.amount * newItemQuantity;
      // } else if (item.quantity < cancelQuantity) {
      //   throw new ReactionError("invalid-param", "cancelQuantity may not be greater than item quantity");
      // }

      const updatedItem = {
        ...item,
        // cancelReason: reason,
        // quantity: cancelQuantity
      };

      // Update the subtotal since it is related to the quantity
      // updatedItem.subtotal = item.price.amount * cancelQuantity;

      if (item.workflow.status !== status) {
        updatedItem.workflow = {
          status: status,
          workflow: [...item.workflow.workflow, status]
        };
      }
      sellerId = updatedItem.sellerId;
      // If we make it this far, then we've found the item that they want to update.
      // We set the status and the update reason if one was provided.
      // This will also decrement the quantity to match the quantity that is being
      // canceled, which will be offset by pushing `itemToAdd` into the array later.
      return updatedItem;
    });

    // If they canceled fewer than the full quantity of the item, add a new
    // non-canceled item to make up the difference.
    if (itemToAdd) {
      updatedItems.push(itemToAdd);
    }

    const updatedGroup = { ...group, items: updatedItems };

    // Ensure proper group status
    updateGroupStatusFromItemStatus(updatedGroup);

    // There is a convenience itemIds prop, so update that, too
    if (itemToAdd) {
      updatedGroup.itemIds.push(itemToAdd._id);
    }

    // Return the group, with items and workflow potentially updated.
    return updatedGroup;
  });

  // If we did not find any matching item ID while looping, something is wrong
  if (!foundItem) throw new ReactionError("not-found", "Order item not found");

  // If all groups are canceled, set the order status to canceled
  let updatedOrderWorkflow;
  let fullOrderWasCanceled = false;
  const allGroupsAreUpdated = updatedGroups.every((group) => group.workflow.status === status);
  if (allGroupsAreUpdated && order.workflow.status !== status) {
    updatedOrderWorkflow = {
      status: status,
      workflow: [...order.workflow.workflow, status]
    };
  }

  // We're now ready to actually update the database and emit events
  const modifier = {
    $set: {
      shipping: updatedGroups,
      updatedAt: new Date()
    }
  };

  if (updatedOrderWorkflow) {
    modifier.$set.workflow = updatedOrderWorkflow;
  }

  OrderSchema.validate(modifier, { modifier: true });

  const { modifiedCount, value: updatedOrder } = await Orders.findOneAndUpdate(
    { _id: orderId },
    modifier,
    { returnOriginal: false }
  );

  console.log('Order updated successfully in order items updated:', updatedOrder);
  if (modifiedCount === 0 || !updatedOrder) throw new ReactionError("server-error", "Unable to update order");

  // await appEvents.emit("afterOrderUpdate", {
  //   order: updatedOrder,
  //   updatedBy: userId,
  // });

  await appEvents.emit("afterOrderStatusUpdate", {
    order: updatedOrder,
    updatedBy: userId,
    itemId: itemId,
    sellerId: sellerId,
    status: status,
  });

  // await appEvents.emit("afterOrderItemStatusUpdate", {
  //   order: updatedOrder,
  //   itemId:itemId,
  //   sellerId:sellerId,
  //   status:status,
  //   updatedBy: userId
  // });


  return { order: updatedOrder };
}
