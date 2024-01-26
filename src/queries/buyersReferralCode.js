export default async function buyersReferralCode(context, args) {
    const { collections } = context;
    const { Orders } = collections;

    try {
        const ordersWithDiscounts = await Orders.find({
            "discounts": { $exists: true, $not: { $size: 0 } }
        }).toArray();

         const buyersReferralCodes = ordersWithDiscounts.map(order => ({
            usedBy: order.accountId,
            code: order.discounts[0]?.code, // Assuming there's only one discount in the array
            createdAt: order.createdAt,
            email: order.email,
        }));
        console.log("buyersReferralCode",buyersReferralCodes);
        // Return the result or perform further actions
       return buyersReferralCodes;
    } catch (error) {
        console.error("Error fetching orders with discounts:", error);
        // Handle the error as needed
        throw error;
    }
}
