
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";

export default async function addItemToOrder(context, input) {
    const { collections, accountId } = context;
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

    const order = await Orders.findOne({ _id: orderId });
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
        // Validation: Check if the product and variant already exist in the order's shipping items
        const productAlreadyInOrder = order.shipping.some((shipping) =>
            shipping.items.some((item) => item.productId === productId && item.variantId === variantId)
        );

        if (productAlreadyInOrder) {
            throw new ReactionError(
                "conflict",
                `Product with ID ${productId} and Variant ID ${variantId} is already in the order. Duplicate products are not allowed.`
            );
        }

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

        updates.$push["shipping.$[].items"].$each.push(orderItem);
        updates.$push["shipping.$[].itemIds"].$each.push(orderItem._id);
        updates.$inc["shipping.$[].invoice.subtotal"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].invoice.total"] += variant.pricing.USD.price;
        updates.$inc["shipping.$[].totalItemQuantity"] += 1;
        updates.$inc["totalItemQuantity"] += 1;
    }

    const updateResult = await Orders.updateOne({ _id: orderId }, updates);
    if (updateResult.modifiedCount === 0) {
        throw new ReactionError("not-found", "Order not updated");
    }

    const updatedOrder = await Orders.findOne({ _id: orderId }, { projection: { _id: 1 } });
    if (!updatedOrder) {
        throw new ReactionError("not-found", "Order not found after update");
    }

    console.log("Updated Order:", updatedOrder);

    return updatedOrder;
}
