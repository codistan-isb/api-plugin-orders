
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";

export default async function addCommentToOrder(context, input) {
    const { collections, accountId } = context

    const { Orders, Accounts, Groups } = collections

    const {
        text,
        referenceId
    } = input;

    if (!accountId) {
        throw new ReactionError("unauthorized", "You do not have permission to create a comment");
    }

    const account = await Accounts.findOne({ _id: accountId });
    if (!account) {
        throw new ReactionError("not-found", "Account not found");

    }
    if (!account || !account.groups || !Array.isArray(account.groups)) {
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

    const newComment = {
        id: Random.id(),
        text,
        userId: account._id,
        userName: account.username,
        createdAt: new Date()
    };

    console.log("New comment IN MUTATION", newComment);

    try {
        console.log("Attempting to add comment to order by referenceId:", referenceId, newComment);

        // Push the new comment into the comments array of the specified order using referenceId
        const updateResult = await Orders.updateOne(
            { referenceId: referenceId },
            { $push: { comments: newComment } }
        );

        console.log("MongoDB update response:", updateResult);

        // Check if the update was successful
        if (updateResult.matchedCount === 1 && updateResult.modifiedCount === 1) {
            return await Orders.findOne({ referenceId: referenceId });
        } else {
            throw new ReactionError("not-found", "Order not found with the provided referenceId");
        }
    } catch (error) {
        console.error("Error adding comment to order:", error);
        throw new ReactionError("server-error", "Failed to add comment to the order", error);
    }
}
