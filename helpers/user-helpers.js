var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
const { response } = require('../app')
const { ObjectId } = require('mongodb')
var objectId=require('mongodb').ObjectId
const Razorpays=require('razorpay')

const Razorpay = require('razorpay');
var instance = new Razorpay({
  key_id: 'rzp_test_2lYA6ScDt3CBSU',
  key_secret: 'k7AiOAw1xTKCGQ9vVMspVEhZ',
});





module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,riject)=>{
            userData.password=await bcrypt.hash(userData.password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                userData._id = data.insertedId;
                resolve(userData);
            })
        })
    },

    doLogin:(userData)=>{
        console.log(userData)
        return new Promise(async(resolve,riject)=>{
            let loginStatus=false
         let response={}
   let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.Email})
           if(user){
               bcrypt.compare(userData.password,user.password).then((status)=>{
                if(status){
                    console.log("login success")
                    response.user=user
                    response.status=true
                    resolve(response)
                }
                else{
                    console.log("user not found")
                    resolve({status:false})
                }
               })
            }else{
                console.log("login failed")
                resolve({status:false})
            }
        })
    },
      addToCart:(proId,userId)=>{
        let proObj={
            item:ObjectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,riject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                console.log(proExist)
                if(proExist!=-1){
                     db.get().collection(collection.CART_COLLECTION)
                     .updateOne({user:ObjectId(userId),'products.item':ObjectId(proId)},
                     {
                        $inc:{'products.$.quantity':1}

                     }
                     ).then(()=>{
                        resolve()
                     })
                }else{

             
                  db.get(collection.CART_COLLECTION)
                db.get().collection(collection.CART_COLLECTION)
                  .updateOne({user:ObjectId(userId)},
                    
                  {
                        
                        $push:{products:proObj}
                    
            
                  }
                  
                  ).then((response)=>{
                    resolve()
                  })
                }
            }else{
                let cartObj={
                    user:ObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            
            }
        })
      },
      
      getCartProducts:(userId)=>{
        return new Promise(async(resolve,riject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    
                    $unwind: "$products"
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                        
                    }      
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
              
            ]).toArray()
            resolve(cartItems)

        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,riject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },
     changeProductQuantity:(details)=>{
      details.count=parseInt(details.count)
      details.quantity= parseInt(details.quantity)
        
        return new Promise((resolve,riject)=>{
            if(details.count==-1 && details.quantity==1){
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:ObjectId(details.cart)},
            {
               $pull:{products:{item:ObjectId(details.product)}}

            }
            ).then((response)=>{

            //    resolve({removeProduct:true}) 
                resolve({status:true})
            })

       
    }else{
        db.get().collection(collection.CART_COLLECTION)
           .updateOne({_id:ObjectId(details.cart),'products.item':ObjectId(details.product)},
        {
            $inc:{'products.$.quantity':details.count}
        }
    ).then((response)=>{
        
        resolve(true)

      })
    }

 })
  },
  getTotalAmount:(userId)=>{
    
    return new Promise(async(resolve,riject)=>{
        let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
            {
                $match:{user:ObjectId(userId)}
            },
            {
                
                $unwind: "$products"
            },
            {
                $project:{
                    item:'$products.item',
                  quantity:'$products.quantity'    
                }      
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
                $project:{
                    item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                }
            },
            {
                $group:{
                    _id:null,
                    total: {$sum: {$multiply: [{ $toInt: "$quantity" }, { $toInt: "$product.Price" }]}}
                    
                }
            }          
        ]).toArray()
        resolve(total[0].total);

    })
    
    
 },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,riject)=>{
            console.log(order,products,total);
               let status=order['payment-method']==='COD'?'placed':'pending'
               let orderObj={
                   deliveryDetailes:{
                    mobile:order.mobile,
                    adress:order.adress,
                    pincode:order.pincode
                   },
                   userId:objectId(order.userId),
                   paymentMethod:order['payment-method'],
                   products:products,
                   totalAmount:total,
                   status:status,
                   date:new Date()

               }

               db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                console.log("order id:",response.ops[0]._id)
                resolve(response.ops[0]._id)

               })
        

        })

    },

    getUserOrder:(userId)=>{
        return new Promise(async(resolve,riject)=>{
            console.log(userId);
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).toArray()
            console.log(orders);
            resolve(orders)
        })
      },

      getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
          let orderItems = await db
            .get()
            .collection(collection.ORDER_COLLECTION)
            .aggregate([
              {
                $match: { _id: objectId(orderId) },
              },
              {
                $unwind: "$orderObject.products",
              },
              {
                $project: {
                  item: "$orderObject.products.item",
                  quantity: "$orderObject.products.quantity",
                },
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: "item",
                  foreignField: "_id",
                  as: "product",
                },
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  product: { $arrayElemAt: ["$product", 0] },
                },
              },
            ])
            .toArray();
            console.log(orderItems)
          resolve(orderItems);
        });
    },

    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,riject)=>{
            var options = {
                amount:total,
                currency:"INR",
                receipt: ""+orderId
            };
            instance.order.create(options,function(err,order){
                if(err){
                    console.log(err)
                }else{
                    console.log("New Order",order);
                    resolve(order)
                }

                
            });

            

        })
    }
}

    









    
  







        
