

/**
 * @name OrderItem/uploadedBy
 * @method
 * @memberof Catalog/GraphQL
 * @summary Returns the tags for an OrderItem
 * @param {Object} orderItem - OrderItem from parent resolver
 * @param {TagConnectionArgs} connectionArgs - arguments sent by the client {@link ConnectionArgs|See default connection arguments}
 * @param {Object} context - an object containing the per-request state
 * @param {Object} info Info about the GraphQL request
 * @returns {Promise<Object[]>} Promise that resolves with array of Tag objects
 */
export default async function imageURLs(parent, connectionArgs, context, info) {
  const {collections}=context;
  const { Products } = collections;
  
  const productImages= await Products.findOne({"_id":parent.productId});
  console.log("productImages");
  if(productImages?.media[0]){
  
  return productImages?.media[0]?.URLs;
}
  else {
    return null;
  }
}
