export async function generateOrderSummary(items) {
    return items.map((item, index) => {
        return `- Item ${index + 1}: ${item.title}
        - Quantity: ${item.quantity}
        - Price: ${item.subtotal}`;
    }).join('\n');
}