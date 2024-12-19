import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";

export default async function addItemToOrder(context, input) {
    const { collections, accountId } = context;
    const { Catalog, Orders, Accounts, Groups } = collections;

    if (!Catalog || !Orders) {
        throw new Error("Internal server error");
    }
    if (!accountId) {
        throw new ReactionError("unauthorized", "You do not have permission to create a comment");
    }

    const account = await Accounts.findOne({ _id: accountId });
    if (!account) {
        throw new ReactionError("not-found", "Account not found");
    }
    if (!account.groups || !Array.isArray(account.groups)) {
        throw new ReactionError("unauthorized", "Invalid account or groups data.");
    }

    const groupIds = account.groups;

    if (groupIds.length === 0) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to create comment from this account."
        );
    }

    const groups = await Groups.find({ _id: { $in: groupIds } }).toArray();
    console.log("GROUPS", groups);

    if (groups.some((group) => group.slug === "seller")) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to create comment from this account."
        );
    }

    const { orderId, productId, variantId } = input;

    // Fetch the order to check for existing items
    const order = await Orders.findOne({ _id: orderId });
    if (!order) {
        throw new ReactionError("not-found", "Order not found");
    }

    // Check if the product is already in the order's shipping items
    const existingProduct = order.shipping.some((shipping) =>
        shipping.items.some((item) => item.productId === productId && item.variantId === variantId)
    );

    if (existingProduct) {
        throw new ReactionError(
            "conflict",
            "This product already exists in the order. Duplicate products are not allowed."
        );
    }

    // Fetch the product and variant details
    const product = await Catalog.findOne({
        "product._id": productId,
        "product.variants._id": variantId
    });

    if (!product || !product.product) {
        throw new ReactionError("not-found", "Product or variant not found");
    }

    const actualProduct = product.product;
    const variant = actualProduct.variants.find(v => v._id === variantId);

    if (!variant) {
        throw new ReactionError("not-found", "Variant not found");
    }

    // Construct the new order item
    const orderItem = {
        _id: Random.id(),
        addedAt: new Date(),
        createdAt: new Date(),
        price: variant.price,
        productId: productId,
        productSlug: actualProduct.slug,
        sellerId: actualProduct.sellerId,
        productType: actualProduct.type,
        productTagIds: actualProduct.tagIds,
        productVendor: actualProduct.vendor,
        quantity: 1,
        shopId: actualProduct.shopId,
        price: {
            amount: variant.pricing.USD.price,
            currencyCode: "USD"
        },
        subtotal: variant.pricing.USD.price,
        title: actualProduct.title,
        updatedAt: new Date(),
        variantId: variantId,
        variantTitle: variant.title,
        workflow: { status: "new", workflow: ["created"] },
        isTaxable: variant.isTaxable,
        taxCode: variant.taxCode,
        tax: 0,
        taxableAmount: 0,
        taxes: [],
        addedBy: {
            name: account.username,
            userId: account._id
        }
    };

    console.log("Added variant", orderItem);

    // Update the order with the new item and adjust the invoice
    const updateResult = await Orders.updateOne(
        { _id: orderId },
        {
            $push: {
                "shipping.$[].items": orderItem,
                "shipping.$[].itemIds": orderItem._id
            },
            $inc: {
                "shipping.$[].invoice.subtotal": variant.pricing.USD.price,
                "shipping.$[].invoice.total": variant.pricing.USD.price,
                "shipping.$[].totalItemQuantity": 1,
                "totalItemQuantity": 1
            }
        }
    );

    if (updateResult.modifiedCount === 0) {
        throw new ReactionError("not-found", "Order not found");
    }

    return orderItem;
}



// import Random from "@reactioncommerce/random";
// import ReactionError from "@reactioncommerce/reaction-error";

// export default async function addItemToOrder(context, input) {
//     const { collections, accountId } = context;
//     const { Catalog, Orders, Accounts, Groups } = collections;

//     if (!Catalog || !Orders) {
//         throw new Error("Internal server error");
//     }
//     if (!accountId) {
//         throw new ReactionError("unauthorized", "You do not have permission to create a comment");
//     }

//     const account = await Accounts.findOne({ _id: accountId });
//     if (!account) {
//         throw new ReactionError("not-found", "Account not found");

//     }
//     if (!account || !account.groups || !Array.isArray(account.groups)) {
//         throw new ReactionError("unauthorized", "Invalid account or groups data.");
//     }

//     const groupIds = account.groups;

//     if (groupIds.length === 0) {
//         throw new ReactionError(
//             "unauthorized",
//             "Access denied: You do not have permission to create comment from this account."
//         );
//     }

//     const groups = await Groups.find({ _id: { $in: groupIds } }).toArray();
//     console.log("GROUPS", groups);

//     if (groups.some((group) => group.slug === "seller")) {
//         throw new ReactionError(
//             "unauthorized",
//             "Access denied: You do not have permission to create comment from this account."
//         );
//     }
//     const { orderId, productId, variantId } = input;

//     const product = await Catalog.findOne({
//         "product._id": productId,
//         "product.variants._id": variantId
//     });

//     if (!product || !product.product) {
//         throw new ReactionError("not-found", "Product or variant not found");
//     }

//     const actualProduct = product.product;
//     const variant = actualProduct.variants.find(v => v._id === variantId);

//     if (!variant) {
//         throw new ReactionError("not-found", "Variant not found");
//     }

//     // Construct the new order item
//     const orderItem = {
//         _id: Random.id(),
//         addedAt: new Date(),
//         createdAt: new Date(),
//         price: variant.price,
//         productId: productId,
//         productSlug: actualProduct.slug,
//         sellerId: actualProduct.sellerId,
//         productType: actualProduct.type,
//         productTagIds: actualProduct.tagIds,
//         productVendor: actualProduct.vendor,
//         quantity: 1,
//         shopId: actualProduct.shopId,
//         price: {
//             amount: variant.pricing.USD.price,
//             currencyCode: "USD"
//         },
//         subtotal: variant.pricing.USD.price,
//         title: actualProduct.title,
//         updatedAt: new Date(),
//         variantId: variantId,
//         variantTitle: variant.title,
//         workflow: { status: "new", workflow: ["created"] },
//         isTaxable: variant.isTaxable,
//         taxCode: variant.taxCode,
//         tax: 0,
//         taxableAmount: 0,
//         taxes: [],
//         addedBy: {
//             name: account.username,
//             userId: account._id

//         }
//     };

//     console.log("Added variant", orderItem)
//     // Update the order with the new item and adjust the invoice
//     const updateResult = await Orders.updateOne(
//         { _id: orderId },
//         {
//             $push: {
//                 "shipping.$[].items": orderItem,
//                 "shipping.$[].itemIds": orderItem._id
//             },
//             $inc: {
//                 "shipping.$[].invoice.subtotal": variant.pricing.USD.price,
//                 "shipping.$[].invoice.total": variant.pricing.USD.price,
//                 "shipping.$[].totalItemQuantity": 1,
//                 "totalItemQuantity": 1
//             }
//         }
//     );

//     if (updateResult.modifiedCount === 0) {
//         throw new ReactionError("not-found", "Order not found");
//     }

//     return orderItem;
// }

