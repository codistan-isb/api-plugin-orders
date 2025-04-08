export default async function ItemStatuses(node, args, context) {
    if (!node.workflow || !Array.isArray(node.workflow.workflow)) {
        console.error("Nested workflow array is undefined or not an array", node.workflow);
        return []; // Return an empty array to conform to the expected schema types
    }

    const itemStatuses = node.workflow.workflow.map(status => status);
    const updatedAt = node.updatedAt

    return [{ workFlowStatus: itemStatuses }];
}
