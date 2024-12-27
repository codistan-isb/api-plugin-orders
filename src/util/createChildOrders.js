
import Random from "@reactioncommerce/random";
import accounting from "accounting-js";


/**
 * @method createChildOrders
 * @summary Us this methode to create subOrders by seller ID when an order is placed
 * @param {Object} context - an object containing the per-request state
 * @param {Object} order - Order object emitted by afterOrderCreate
 * @returns {Promise<Object>} Object with `order` property containing the created order
 */

export default async function createChildOrders(context, order) {
    try {
        const { collections } = context;
        const { SubOrders, Cart, Accounts, Shops } = collections;

        const suborders = await SubOrders.find({ parentId: order._id }).toArray();

        let maxInternalOrderIdMap = {};

        // Prepare the highest internalOrderId per seller
        suborders.forEach(suborder => {
            if (!maxInternalOrderIdMap[suborder.sellerId] || maxInternalOrderIdMap[suborder.sellerId] < suborder.internalOrderId) {
                maxInternalOrderIdMap[suborder.sellerId] = suborder.internalOrderId;
            }
        });

        const parentFulfillmentGroup = order?.shipping?.[0];
        const orderItems = parentFulfillmentGroup?.items;

        let sellerOrders = {};

        orderItems?.forEach(item => {
            if (sellerOrders[item.sellerId]) {
                sellerOrders[item.sellerId].push(item);
            } else {
                sellerOrders[item.sellerId] = [item];
            }
        });

        console.log("SELLER ORDER: " + JSON.stringify(sellerOrders));

        Object.keys(sellerOrders).forEach(async (key) => {
            const childItems = sellerOrders[key];

            childItems.forEach(async (item) => {
                const itemTotal = +accounting.toFixed(item.subtotal, 3);
                const shippingTotal = parentFulfillmentGroup.shipmentMethod.rate || 0;
                const handlingTotal = parentFulfillmentGroup.shipmentMethod.handling || 0;
                const fulfillmentTotal = shippingTotal + handlingTotal;
                const total = +accounting.toFixed(Math.max(0, itemTotal + fulfillmentTotal), 3);

                let newInternalOrderId = '01'; // Default initial value

                let currentOrderId = maxInternalOrderIdMap[key];
                if (currentOrderId) {
                    let lastChar = currentOrderId.slice(-1);
                    let incrementedLastChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
                    newInternalOrderId = currentOrderId.slice(0, -1) + incrementedLastChar;
                } else {
                    let highestOrderId = Object.values(maxInternalOrderIdMap).sort().reverse()[0];
                    if (highestOrderId) {
                        let secondLastChar = highestOrderId.slice(-2, -1);
                        let incrementedSecondLastChar = String.fromCharCode(secondLastChar.charCodeAt(0) + 1);
                        newInternalOrderId = highestOrderId.slice(0, -2) + incrementedSecondLastChar + 'a';
                    }
                }

                maxInternalOrderIdMap[key] = newInternalOrderId;

                // console.log("NEW INTERNAL ID", newInternalOrderId);

                const childInvoice = { ...parentFulfillmentGroup.invoice, subtotal: itemTotal, total };
                let fulfillmentObj = {
                    ...parentFulfillmentGroup,
                    _id: Random.id(),
                    items: [item],
                    itemIds: [item._id],
                    totalItemQuantity: 1,
                    invoice: childInvoice
                };
                const childFulfillmentGroup = [fulfillmentObj];
                const childOrder = {
                    ...order,
                    _id: Random.id(),
                    sellerId: key,
                    itemIds: [item._id],
                    referenceId: order.referenceId,
                    shipping: childFulfillmentGroup,
                    totalItemQuantity: childFulfillmentGroup.reduce((sum, group) => sum + group.totalItemQuantity, 0),
                    internalOrderId: newInternalOrderId
                };

                // console.log("CHILD ORDER FINAL STEP", childOrder.internalOrderId);

                // OrderSchema.validate(childOrder);
                await SubOrders.insertOne({ ...childOrder, parentId: order._id });
            });
        });
    } catch (err) {
        console.log(err);
    }
}



