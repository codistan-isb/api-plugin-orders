export default async function customerInfo(node, args, context) {
    const { collections } = context;
    const { Accounts, SubOrders } = collections;

    const address = node.shipping[0].address;

    console.log("address", address);


    const customerAdress = address.address1 || null
    const customerName = address.fullName || null
    console.log("customerAdress", customerAdress);
    console.log("customerName", customerName);

    return { customerAdress, customerName }

}