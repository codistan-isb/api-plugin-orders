import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import { decodeOrderOpaqueId, decodeProductOpaqueId } from "../xforms/id.js";
import createChildOrders from "../util/createChildOrders.js";

export default async function addItemToOrder(context, input) {
    const { collections, accountId, appEvents } = context;
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

    const { orderId, items } = input;
    const decodeOrder = decodeOrderOpaqueId(orderId);
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

    // Prepare new items to add
    const newItems = [];
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

        // console.log("PRODUCT", product)

        if (!product || !product.product) {
            throw new ReactionError("not-found", "Product or variant not found");
        }

        const actualProduct = product.product;

        console.log("ACTUAL PRODUCT", actualProduct)
        const variant = actualProduct.variants.find(v => v._id === decodedVariantId);

        // console.log("ACTUAL VARIANT", decodedVariantId)

        // console.log("VARIANT", variant)

        // console.log("USER", variant.uploadedBy.userId)

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
            sellerId: variant.uploadedBy.userId,
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
            taxes: []
        };

        updates.$push["shipping.$[].items"].$each.push(orderItem);
        updates.$push["shipping.$[].itemIds"].$each.push(orderItem._id);
        updates.$inc["shipping.$[].invoice.subtotal"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].invoice.total"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].totalItemQuantity"] += 1;
        updates.$inc["totalItemQuantity"] += 1;

        newItems.push(orderItem); // Collect the new items
    }

    const updateResult = await Orders.updateOne({ _id: decodeOrder }, updates);
    if (updateResult.modifiedCount === 0) {
        throw new ReactionError("not-found", "Order not updated");
    }

    // Call createChildOrders for new items
    if (newItems.length > 0) {
        await createChildOrders(context, {
            ...order, shipping: [
                {
                    ...order.shipping[0],
                    items: newItems,
                },
            ],
        });
    }

    return await Orders.findOne({ _id: decodeOrder }, { projection: { _id: 1 } });
}
