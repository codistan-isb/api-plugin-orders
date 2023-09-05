

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
export default async function uploadedBy(parent, connectionArgs, context, info) {
  const {collections}=context;
  const { Accounts } = collections;
  
  const sellerInfo= await Accounts.findOne({"_id":parent.sellerId});
  if(sellerInfo){
    let phoneNumber=sellerInfo?.billing?.phone?sellerInfo?.billing?.phone:sellerInfo?.profile?.phone?sellerInfo?.profile?.phone:sellerInfo?.phone?sellerInfo?.phone:"NA";
    let address1=sellerInfo?.billing?.address?sellerInfo?.storeAddress?.address1:"---";
    let {city,address2,postalcode}=sellerInfo?.billing?sellerInfo?.billing:sellerInfo?.storeAddress?sellerInfo?.storeAddress:{city:"",address2:"",postalcode:""};
     if(!address1){address1=""}
     if(!address2){address2=""}
     if(!phoneNumber){phoneNumber=""}
     if(!city){city=""}
     if(!postalcode){postalcode=""}
  const response = {
    storeName:sellerInfo?.storeName,
    name:sellerInfo?.profile?.name,
    email:sellerInfo?.emails[0]?.address,
    billingAddress:{city,address2,postalcode,address1,phone:phoneNumber}
    }
  return response;}
  else {
    return null;
  }
}
