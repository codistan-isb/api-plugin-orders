export default async function addCommentToOrderResolver(parentResult, { input }, context) {
    console.log("Input received:", input);
    let newComment = await context.mutations.addCommentToOrder(context, input);
    console.log("NEW COMMENT", newComment)
    return newComment;
}
