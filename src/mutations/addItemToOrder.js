
// import Random from "@reactioncommerce/random";
// import ReactionError from "@reactioncommerce/reaction-error";
// import { decodeOrderOpaqueId, decodeProductOpaqueId } from "../xforms/id.js"

// export default async function addItemToOrder(context, input) {
//     const { collections, accountId, appEvents } = context;

//     console.log("APP EVENTS", appEvents)
//     const { Catalog, Orders, Accounts, Groups } = collections;

//     if (!Catalog || !Orders) {
//         throw new Error("Internal server error");
//     }

//     if (!accountId) {
//         throw new ReactionError("unauthorized", "You do not have permission to perform this action");
//     }

//     const account = await Accounts.findOne({ _id: accountId });
//     if (!account) {
//         throw new ReactionError("not-found", "Account not found");


//     }

//     const { orderId, items } = input;

//     const decodeOrder = decodeOrderOpaqueId(orderId)

//     console.log("decodeOrderOpaqueId", decodeOrder)


//     const order = await Orders.findOne({ _id: decodeOrder });
//     if (!order) {
//         throw new ReactionError("not-found", "Order not found");
//     }

//     const updates = {
//         $push: {
//             "shipping.$[].items": { $each: [] },
//             "shipping.$[].itemIds": { $each: [] }
//         },
//         $inc: {
//             "shipping.$[].invoice.subtotal": 0,
//             "shipping.$[].invoice.total": 0,
//             "shipping.$[].totalItemQuantity": 0,
//             "totalItemQuantity": 0
//         }
//     };

//     for (const { productId, variantId } of items) {

//         const decodedProductId = decodeProductOpaqueId(productId);
//         const decodedVariantId = decodeProductOpaqueId(variantId);

//         const productAlreadyInOrder = order.shipping.some((shipping) =>
//             shipping.items.some((item) => item.productId === decodedProductId && item.variantId === decodedVariantId)
//         );

//         console.log("productAlreadyInOrder", productAlreadyInOrder)



//         if (productAlreadyInOrder) {
//             throw new ReactionError(
//                 "conflict",
//                 `Product with ID ${decodedProductId} and Variant ID ${decodedVariantId} is already in the order. Duplicate products are not allowed.`
//             );
//         }

//         const product = await Catalog.findOne({
//             "product._id": decodedProductId,
//             "product.variants._id": decodedVariantId
//         });

//         if (!product || !product.product) {
//             throw new ReactionError("not-found", "Product or variant not found");
//         }

//         const actualProduct = product.product;
//         const variant = actualProduct.variants.find(v => v._id === decodedVariantId);

//         if (!variant) {
//             throw new ReactionError("not-found", "Variant not found");
//         }

//         const orderItem = {
//             _id: Random.id(),
//             addedAt: new Date(),
//             createdAt: new Date(),
//             price: variant.price,
//             productId: decodedProductId,
//             productSlug: actualProduct.slug,
//             sellerId: actualProduct.sellerId,
//             productType: actualProduct.type,
//             productTagIds: actualProduct.tagIds,
//             productVendor: actualProduct.vendor,
//             quantity: 1,
//             shopId: actualProduct.shopId,
//             price: {
//                 amount: variant.pricing.USD.price,
//                 currencyCode: "USD"
//             },
//             subtotal: variant.pricing.USD.price,
//             title: actualProduct.title,
//             updatedAt: new Date(),
//             variantId: decodedVariantId,
//             variantTitle: variant.title,
//             workflow: { status: "new", workflow: ["created"] },
//             isTaxable: variant.isTaxable,
//             taxCode: variant.taxCode,
//             tax: 0,
//             taxableAmount: 0,
//             taxes: [],
//             addedBy: {
//                 name: account.username,
//                 userId: account._id
//             }
//         };

//         updates.$push["shipping.$[].items"].$each.push(orderItem);
//         updates.$push["shipping.$[].itemIds"].$each.push(orderItem._id);
//         updates.$inc["shipping.$[].invoice.subtotal"] += variant.pricing.USD.price;
//         updates.$inc["shipping.$[].invoice.total"] += variant.pricing.USD.price;
//         updates.$inc["shipping.$[].totalItemQuantity"] += 1;
//         updates.$inc["totalItemQuantity"] += 1;
//     }

//     const updateResult = await Orders.updateOne({ _id: decodeOrder }, updates);
//     if (updateResult.modifiedCount === 0) {
//         throw new ReactionError("not-found", "Order not updated");
//     }

//     const updatedOrder = await Orders.findOne({ _id: decodeOrder }, { projection: { _id: 1 } });
//     if (!updatedOrder) {
//         throw new ReactionError("not-found", "Order not found after update");
//     }

//     console.log("Updated Order:", updatedOrder);

//     return updatedOrder;
// }



import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import { decodeOrderOpaqueId, decodeProductOpaqueId } from "../xforms/id.js"

export default async function addItemToOrder(context, input) {
    const { collections, accountId, appEvents } = context;

    console.log("APP EVENTS", appEvents)
    const { Catalog, Orders, Accounts, Groups } = collections;

    if (!Catalog || !Orders) {
        throw new Error("Internal server error");
    }

    if (!accountId) {
        throw new ReactionError("unauthorized", "You do not have permission to perform this action");
    }

    const account = await Accounts.findOne({ _id: accountId });
    if (!account) {
        throw new ReactionError("not-found", "Account not found");
    }

    const groupIds = account.groups;

    if (groupIds.length === 0) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to add order from this account."
        );
    }

    const groups = await Groups.find({ _id: { $in: groupIds } }).toArray();
    console.log("GROUPS", groups);

    if (groups.some((group) => group.slug === "seller")) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to add order from this account."
        );
    }

    const { orderId, items } = input;

    const decodeOrder = decodeOrderOpaqueId(orderId);

    console.log("decodeOrderOpaqueId", decodeOrder)

    const order = await Orders.findOne({ _id: decodeOrder });
    if (!order) {
        throw new ReactionError("not-found", "Order not found");
    }

    const updates = {
        $push: {
            "shipping.$[].items": { $each: [] },
            "shipping.$[].itemIds": { $each: [] }
        },
        $inc: {
            "shipping.$[].invoice.subtotal": 0,
            "shipping.$[].invoice.total": 0,
            "shipping.$[].totalItemQuantity": 0,
            "totalItemQuantity": 0
        }
    };

    for (const { productId, variantId } of items) {
        const decodedProductId = decodeProductOpaqueId(productId);
        const decodedVariantId = decodeProductOpaqueId(variantId);

        const productAlreadyInOrder = order.shipping.some((shipping) =>
            shipping.items.some((item) => item.productId === decodedProductId && item.variantId === decodedVariantId)
        );

        console.log("productAlreadyInOrder", productAlreadyInOrder)

        if (productAlreadyInOrder) {
            throw new ReactionError(
                "conflict",
                `Product with ID ${decodedProductId} and Variant ID ${decodedVariantId} is already in the order. Duplicate products are not allowed.`
            );
        }

        const product = await Catalog.findOne({
            "product._id": decodedProductId,
            "product.variants._id": decodedVariantId
        });

        if (!product || !product.product) {
            throw new ReactionError("not-found", "Product or variant not found");
        }

        const actualProduct = product.product;
        const variant = actualProduct.variants.find(v => v._id === decodedVariantId);

        if (!variant) {
            throw new ReactionError("not-found", "Variant not found");
        }

        const orderItem = {
            _id: Random.id(),
            addedAt: new Date(),
            createdAt: new Date(),
            price: variant.price,
            productId: decodedProductId,
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
            variantId: decodedVariantId,
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

        updates.$push["shipping.$[].items"].$each.push(orderItem);
        updates.$push["shipping.$[].itemIds"].$each.push(orderItem._id);
        updates.$inc["shipping.$[].invoice.subtotal"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].invoice.total"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].totalItemQuantity"] += 1;
        updates.$inc["totalItemQuantity"] += 1;
    }

    const updateResult = await Orders.updateOne({ _id: decodeOrder }, updates);
    if (updateResult.modifiedCount === 0) {
        throw new ReactionError("not-found", "Order not updated");
    }

    const updatedOrder = await Orders.findOne({ _id: decodeOrder }, { projection: { _id: 1 } });
    if (!updatedOrder) {
        throw new ReactionError("not-found", "Order not found after update");
    }


    for (const { productId, variantId } of items) {
        const decodedProductId = decodeProductOpaqueId(productId);
        const decodedVariantId = decodeProductOpaqueId(variantId);

        await Catalog.updateOne(
            { "product._id": decodedProductId, "product.variants._id": decodedVariantId },
            {
                $set: {
                    "product.isSoldOut": true
                }
            },
        );
    }

    return updatedOrder;
}
