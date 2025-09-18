import _ from "lodash";
import ReactionError from "@reactioncommerce/reaction-error";

/**
 * Build and run Orders aggregation with dynamic filters + custom pagination.
 * Adds `isPaid: true` in the result if any payment method is JAZZCASH.
 *
 * @param {Object} context
 * @param {Object} params
 * @param {Object} params.filters
 * @param {String[]} params.shopIds
 * @param {number} params.first   - page size
 * @param {number} params.offset  - offset for pagination
 * @returns {Promise<{ nodes: any[], totalCount: number }>}
 */
export default async function orders(
  context,
  { filters, shopIds, first = 10, offset = 0 } = {}
) {
  const { collections } = context;
  const { Orders } = collections;

  const query = {};
  query.$and = [];

  // Date range
  if (filters?.createdAt) {
    const { createdAt } = filters;
    const gteProp = createdAt.gte ? { $gte: createdAt.gte } : {};
    const lteProp = createdAt.lte ? { $lte: createdAt.lte } : {};
    query.$and.push({ createdAt: { ...gteProp, ...lteProp } });
  }

  // Permissions
  if (!shopIds)
    throw new ReactionError("invalid-param", "You must provide ShopId(s)");
  for (const shopId of shopIds) {
    // eslint-disable-next-line no-await-in-loop
    await context.validatePermissions("reaction:legacy:orders", "read", {
      shopId,
    });
  }
  query.shopId = { $in: shopIds };

  // Fulfillment status
  if (filters?.fulfillmentStatus) {
    const fulfillmentStatuses = filters.fulfillmentStatus.map((status) => {
      const prefix = status === "new" ? "" : "coreOrderWorkflow/";
      return `${prefix}${status}`;
    });
    query.$and.push({
      "shipping.workflow.status": { $in: fulfillmentStatuses },
    });
  }

  // Payment status
  if (filters?.paymentStatus) {
    query.$and.push({ "payments.status": { $in: filters.paymentStatus } });
  }

  // Order workflow status
  if (filters?.status) {
    const prefix = filters.status === "new" ? "" : "coreOrderWorkflow/";
    query.$and.push({
      "workflow.status": { $eq: `${prefix}${filters.status}` },
    });
  }

  if (filters?.sellerId) {
    query.$and.push({ "shipping.items.sellerId": filters.sellerId });
  }

  if (filters?.searchField) {
    const { searchField } = filters;
    const regexMatch = { $regex: _.escapeRegExp(searchField), $options: "i" };
    query.$and.push({
      $or: [
        { _id: searchField },
        { referenceId: searchField },
        { email: searchField },
        { "discounts.code": searchField },
        { "shipping.address.phone": searchField },
        { "payments.address.fullName": regexMatch },
        { "shipping.address.fullName": regexMatch },
        { "payments.address.phone": regexMatch },
      ],
    });
  }

  if (!query.$and.length) delete query.$and;

  const pipeline = [
    { $match: query },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $addFields: {
        isPaid: {
          $or: [
            {
              $eq: [
                { $toUpper: { $ifNull: ["$paymentMethod", ""] } },
                "JAZZCASH",
              ],
            },
            {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$payments", []] },
                      as: "p",
                      cond: {
                        $or: [
                          {
                            $eq: [
                              { $toUpper: { $ifNull: ["$$p.method", ""] } },
                              "JAZZCASH",
                            ],
                          },
                          {
                            $eq: [
                              {
                                $toUpper: {
                                  $ifNull: ["$$p.paymentMethod", ""],
                                },
                              },
                              "JAZZCASH",
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $facet: {
        total: [{ $count: "value" }],
        nodes: [{ $skip: Math.max(0, offset) }, { $limit: Math.max(0, first) }],
      },
    },
  ];

  const [result] = await Orders.aggregate(pipeline, {
    allowDiskUse: true,
  }).toArray();

  const totalCount = result?.total?.[0]?.value ?? 0;
  const nodes = result?.nodes ?? [];

  return { nodes, totalCount };
}
