export default async function buyersReferralCode(_, args, context) {
 
    const query = await context.queries.buyersReferralCode(context, args);
    return query;
    }