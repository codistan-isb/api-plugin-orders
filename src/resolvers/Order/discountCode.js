export default async function getDiscountCode(node, args, context) {
    const { collections } = context;
    const { Orders } = collections;

    // console.log("NODE ID", node._id);
    const order = await Orders.findOne({ _id: node._id });

    // Check if the discounts array exists and has at least one item
    if (order.discounts && order.discounts.length > 0) {
        const discountInfo = order.discounts[0];

        return {
            code: discountInfo.code,
            discountAmount: discountInfo.discountAmount,
            discountId: discountInfo.discountId
        };
    } else {
        return {
            code: null,
            discountAmount: null,
            discountId: null
        };
    }
}
