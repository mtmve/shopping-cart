var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')
const userHelpers=require('../helpers/user-helpers');
const { response } = require('../app');
const e = require('express');
const { reset } = require('nodemon');

const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
    next()

  }else{
    res.redirect('/login')
  }
}


/* GET home page. */
router.get('/',async function(req, res, next) {

  let user=req.session.user
  console.log(user);
  let cartCount=null
  if(req.session.user){
   cartCount=await userHelpers.getCartCount(req.session.user._id)
  }

  productHelpers.getAllProducts().then((products)=>{
 
    res.render('user/view-products',{products,user,cartCount})
  
  })
});

router.get('/login',(req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/')

  }else{
  
  res.render('user/login',{"loginErr":req.session.loginErr})
  req.session.loginErr=false

  }
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
    userHelpers.doSignup(req.body).then((response)=>{
      console.log(response);
      req.session.loggedIn=true
      req.session.user=response
      res.redirect('/')
    })
})


router.post('/login',(req,res)=>{
   userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      req.session.loginErr=true;
      res.redirect('/login')
      
    }
   })
    
})

router.get('/logout',(req,res)=>{
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProducts(req.session.user._id)
  let totalvalue=await userHelpers.getTotalAmount(req.session.user._id)   
  console.log(products);
  res.render('user/cart',{products,user:req.session.user,totalvalue})  
})
router.get('/add-to-cart/:id',(req,res)=>{
  console.log("api call")
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
     res.json({status:true})
  })

})

router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body)
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
  response.total=await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})


router.get('/place-order',verifyLogin,async(req,res)=>{

  let total=await userHelpers.getTotalAmount(req.session.user._id)

  console.log(total)
  res.render('user/place-order',{total,user:req.session.user})

    
})
router.post('/place-order',async(req,res)=>{
  console.log(req.body)
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{

    if(req.body['payement-method']=='COD'){

      res.json({status:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
             res.json(response)
      })

    }
          console.log(req.body)
  })



  router.get('/order-success',(req,res)=>{
    res.render('user/order-success',{user:req.session.user})
  })

  router.get('/order',async(req,res)=>{
    let orders=await userHelpers.getUserOrder(req.session.user._id)
    res.render('user/orders',{user:req.session.user,orders})
    console.log(orders)
  })

  router.get('/ordered-products/:id',async(req,res)=>{
    let products=await userHelpers.getOrderProducts(req.params._id)
    res.render('user/ordered-products',{user:req.session.user,products})
    console.log(products)
  })
  




  
 
})
module.exports = router;

 

