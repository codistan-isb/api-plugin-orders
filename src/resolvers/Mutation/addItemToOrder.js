export default async function addItemToOrder(parentResult, { input }, context) {
    let newCreateCategory = await context.mutations.addItemToOrder(
        context,
        input
    );

    return newCreateCategory;
}
