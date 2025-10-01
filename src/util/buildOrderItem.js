import accounting from "accounting-js";
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

/**
 * @summary Builds an order item
 * @param {Object} context an object containing the per-request state
 * @param {String} currencyCode The order currency code
 * @param {Object} inputItem Order item input. See schema.
 * @param {Object} cart - The cart this order is being built from
 * @returns {Promise<Object>} An order item, matching the schema needed for insertion in the Orders collection
 */
export default async function buildOrderItem(
  context,
  { currencyCode, inputItem, cart }
) {
  const { queries, collections } = context;
  const { Bids } = collections;
  let { addedAt, price, productConfiguration, quantity } = inputItem;
  const { productId, productVariantId } = productConfiguration;

  const {
    catalogProduct: chosenProduct,
    parentVariant,
    variant: chosenVariant,
  } = await queries.findProductAndVariant(context, productId, productVariantId);

  const variantPriceInfo = await queries.getVariantPrice(
    context,
    chosenVariant,
    currencyCode
  );
  let finalPrice = (variantPriceInfo || {}).price;

  // Handle null or undefined price returned. Don't allow sale.
  if (!finalPrice && finalPrice !== 0) {
    throw new ReactionError(
      "invalid",
      `Unable to get current price for "${
        chosenVariant.title || chosenVariant._id
      }"`
    );
  }

  // Check if user has an accepted bid for this product
  let acceptedBidPrice = null;
  const userId =
    context.userId || context.accountId || "669170e6807a5d1d64898046";

  if (userId) {
    console.log("Checking bid for user ID:", userId);

    try {
      // Decode opaque IDs to get actual database IDs
      const decodedProduct = decodeOpaqueId(productId);
      const decodedVariant = decodeOpaqueId(productVariantId);

      const decodeProductId = decodedProduct.id;
      const decodeVariantId = decodedVariant.id;

      console.log("Decoded IDs:", { decodeProductId, decodeVariantId });

      const activeBids = await Bids.findOne({
        createdBy: userId,
        productId: decodeProductId,
        variantId: decodeVariantId,
        status: "closed",
        acceptedOffer: { $exists: true, $ne: null },
      });

      if (activeBids && activeBids.acceptedOffer) {
        console.log("Found accepted bid:", activeBids.acceptedOffer);

        // Check if the accepted offer is still valid (not expired)
        const now = new Date();
        const validTill = new Date(activeBids.acceptedOffer.validTill);
        const isValid = now <= validTill;

        console.log("Bid validity check:", { now, validTill, isValid });

        if (isValid) {
          acceptedBidPrice = activeBids.acceptedOffer.amount.amount;
          console.log("Using accepted bid price:", acceptedBidPrice);
        } else {
          console.log("Bid has expired");
        }
      } else {
        console.log("No accepted bid found");
      }
    } catch (error) {
      console.log("Error checking bid:", error.message);
    }
  }

  // Use accepted bid price if available, otherwise use original price
  if (acceptedBidPrice !== null) {
    finalPrice = acceptedBidPrice;
    console.log("Using bid price:", finalPrice);
  } else {
    // If no valid bid, check if provided price matches current price
    if (finalPrice !== price) {
      throw new ReactionError(
        "invalid",
        `Provided price for the "${chosenVariant.title}" item does not match current published price`
      );
    }
  }

  const inventoryInfo = await context.queries.inventoryForProductConfiguration(
    context,
    {
      fields: ["canBackorder", "inventoryAvailableToSell"],
      productConfiguration: {
        ...productConfiguration,
        isSellable: true,
      },
      shopId: chosenProduct.shopId,
    }
  );

  if (
    !inventoryInfo.canBackorder &&
    quantity > inventoryInfo.inventoryAvailableToSell
  ) {
    throw new ReactionError(
      "invalid-order-quantity",
      `Sorry, "${chosenVariant.title}" is out of stock now.`
    );
  }

  // Until we do a more complete attributes revamp, we'll do our best to fudge attributes here.
  const attributes = [];
  if (parentVariant) {
    attributes.push({
      label: parentVariant.attributeLabel,
      value: parentVariant.optionTitle,
    });
  }
  attributes.push({
    label: chosenVariant.attributeLabel,
    value: chosenVariant.optionTitle,
  });

  const now = new Date();
  const newItem = {
    _id: Random.id(),
    addedAt: addedAt || now,
    attributes,
    createdAt: now,
    optionTitle: chosenVariant && chosenVariant.optionTitle,
    parcel: chosenVariant.parcel,
    price: {
      amount: finalPrice,
      currencyCode,
    },
    productId: chosenProduct.productId,
    productSlug: chosenProduct.slug,
    sellerId: chosenVariant?.uploadedBy?.userId
      ? chosenVariant?.uploadedBy?.userId
      : null,
    productType: chosenProduct.type,
    productTagIds: chosenProduct.tagIds,
    productVendor: chosenProduct.vendor,
    quantity,
    shopId: chosenProduct.shopId,
    subtotal: +accounting.toFixed(quantity * finalPrice, 3),
    title: chosenProduct.title,
    updatedAt: now,
    variantId: chosenVariant.variantId,
    variantTitle: chosenVariant.title,
    workflow: {
      status: "new",
      workflow: [
        "coreOrderWorkflow/created",
        "coreItemWorkflow/removedFromInventoryAvailableToSell",
      ],
    },
  };

  let cartItem;
  if (cart && cart.items.length) {
    cartItem = cart.items.find(
      (cItem) => cItem.productId === newItem.productId
    );
  }
  for (const func of context.getFunctionsOfType(
    "mutateNewOrderItemBeforeCreate"
  )) {
    await func(context, {
      chosenProduct,
      chosenVariant,
      item: newItem,
      cartItem,
    }); // eslint-disable-line no-await-in-loop
  }

  return newItem;
}
