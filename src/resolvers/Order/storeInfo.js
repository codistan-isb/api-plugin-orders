export default async function storeInfo(node, args, context) {
    const { collections } = context;
    const { Accounts } = collections;

    const items = node.shipping[0].items;
    const seller = items.map(item => item.sellerId)

    for (const sellerId of seller) {

        const account = await Accounts.find({ _id: sellerId }).toArray()

        if (!account || account.length === 0) {
            return null; // No account found, safely return null
        }

        const storeName = account[0].storeName

        return { storeName }
    }
}