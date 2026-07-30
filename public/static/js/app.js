const client = contentful.createClient({
  // This is the space ID. A space is like a project folder in Contentful terms
  space: "0snbon2lhkq6",
  // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
  accessToken: "Fv2NuGJNYv05QB9r3lI7aMPfQ_YRG-7t3w3ZaGyCu0M"
});

// Cloudinary
//var cl = new cloudinary.Cloudinary({cloud_name: "developerdanwu", secure: true});

//var tag = cl.url("v1614655547/artline_supreme_marker_9-768x768_fqhb3w.png");


//variables

const cartBtn = document.querySelector('.cart-icon');
const closeCartBtn = document.querySelector('.close-cart');
const clearCartBtn = document.querySelector('.clear-cart');
const cartDOM = document.querySelector('.cart');
const cartOverlay = document.querySelector('.cart-overlay');
const cartItems = document.querySelector('.cart-items');
const cartTotal = document.querySelector('.cart-total');
const cartContent = document.querySelector('.cart-content');
const productsDOM = document.querySelector('.product-center');
const productTest = document.querySelector('.product')
const productCategories = document.querySelector('.product-categories')
const backBtn = document.querySelector('#btn_prev')
const forwardBtn = document.getElementById('btn_next')


// cart
let cart = []

// buttons
let buttonsDOM = [];

// getting the products
class Products{

  async getProducts() {
    try {

      let contentfulSelect = await client.getEntries({
        content_type: "samAndCoProducts"
      });

      // let result = await fetch("products.json");
      // let data = await result.json();

      let products = contentfulSelect.items;



      products = products.map(item => {
        const {title, price, category, category2} = item.fields;
        console.log(title)
        const {id} = item.sys;
        const cloudinary = item.fields.image[0].secure_url;
        return {title,price,id,category,category2,cloudinary};
      });

      console.log(products)
      return products;

    } catch (error) {
      console.log(error);
    }

  }



}
// category2
 /* class Category2 {
  categorySearch(category, productTitle) {
    let title = ''
    if (category == 'office-stationery') {
      productTitle = 'Office Stationery';
    } else if (category == 'children') {
      title = 'Children'
    } else if (category == 'art-supplies') {
      title = 'Art Supplies'
    } else if (category == 'entertainment') {
      title = 'Entertainment'
    } else {
      title = ''
    }

    productTitle = title;



  }
} */



// Display products
class UI {

  displayProducts(products){

    let result = '';


    products.forEach(product => {
      let productTitle = '' ;
      let productTitle2 = '' ;
      let productPrice = '';

       if (product.category == 'office-stationery') {
        productTitle = 'Office Stationery';
      } else if (product.category == 'children') {
        productTitle = 'Children'
      } else if (product.category == 'art-supplies') {
        productTitle = 'Art Supplies'
      } else if (product.category == 'entertainment') {
        productTitle = 'Entertainment'
      } else if (product.category == 'seasonal-products') {
        productTitle = 'Seasonal Product'
      } else {
        productTitle = ''
      }
      if (product.category2 == 'office-stationery') {
        productTitle2 = 'Office Stationery';
      } else if (product.category2 == 'children') {
        productTitle2 = 'Children'
      } else if (product.category2 == 'art-supplies') {
        productTitle2 = 'Art Supplies'
      } else if (product.category2 == 'entertainment') {
        productTitle2 = 'Entertainment'
      } else if (product.category2 == 'seasonal-products') {
        productTitle2 = 'Seasonal Product'
      } else {
        productTitle2 = ''
      }

      if (product.price != null) {
        productPrice = 'HKD ' + product.price;
      } else {
        productPrice = '';
      }



      result += `
      <article class="product ${product.category} ${product.category2}">
        <div class="img-container">
        <img src=${product.cloudinary} class="" alt="${product.title}">
          <button class="bag-btn" data-id=${product.id}><i class="fas fa-shopping-cart"></i>add to cart
          </button>
        </div>
        <h3>${product.title}</h3>
        <h4>${productTitle}</h4>
        <h4>${productTitle2}</h4>
        <h4>${productPrice}</h4>
      </article>
      `;
    });
    productsDOM.innerHTML = result;

  }
  getBagButtons() {
    const buttons = [...document.querySelectorAll(".bag-btn")];
    buttonsDOM = buttons;
    buttons.forEach(button =>{
      let id = button.dataset.id;
      let inCart = cart.find(item => item.id === id);
      if(inCart){
        button.innerText = "in Cart";
        button.disabled = true
      }
        button.addEventListener('click', (event) =>{
          event.target.innerText = "in Cart";
          event.target.disabled = true;
          // Get product from products
          let cartItem = {...Storage.getProduct(id),amount:1};
          // add product to the cart
          cart = [...cart,cartItem];
          // Save cart in local storage
          Storage.saveCart(cart);
          // set cart values
          this.setCartValues(cart);
          // Display cart item
          this.addCartItem(cartItem);
          // show the cart
          this.showCart();
        });

    });
  }
  setCartValues(cart) {
    let tempTotal = 0;
    let itemsTotal = 0;
    cart.map(item => {
      tempTotal += item.price * item.amount;
      itemsTotal += item.amount;
    })
    cartTotal.innerText = parseFloat(tempTotal.toFixed(2))
    cartItems.innerText = itemsTotal;
  }
  addCartItem(item){
    const div = document.createElement('div');
    div.classList.add('cart-item');
    div.innerHTML = `<img src=${item.cloudinary} alt="">
    <div class="">
      <h4>${item.title}</h4>
      <!-- <h5>$${item.price}</h5> -->
      <span class="remove-item" data-id=${item.id}>remove</span>
    </div>
    <div class="">
      <i class="fas fa-chevron-up" data-id=${item.id}></i>
      <p class="item-amount">${item.amount}</p>
      <i class="fas fa-chevron-down" data-id=${item.id}></i>
      </div>`;
      cartContent.appendChild(div);
  }

showCart() {
  cartOverlay.classList.add('transparentBcg')
  cartDOM.classList.add('showCart')
}

setupAPP() {
  cart = Storage.getCart();
  this.setCartValues(cart);
  this.populateCart(cart);
  cartBtn.addEventListener('click',this.showCart);
  closeCartBtn.addEventListener('click',this.hideCart)
}
populateCart(cart) {
  cart.forEach(item => this.addCartItem(item));
}
hideCart(){
  cartOverlay.classList.remove("transparentBcg");
  cartDOM.classList.remove("showCart")
}
cartLogic() {
  // clear cart Button
  clearCartBtn.addEventListener('click', () => {
    this.clearCart();
  });
  // cart functionality
  cartContent.addEventListener('click', event => {
    if(event.target.classList.contains('remove-item')){
      let removeItem = event.target;
      let id = removeItem.dataset.id;
      cartContent.removeChild
      (removeItem.parentElement.parentElement);

      this.removeItem(id);
    }
    else if(event.target.classList.contains("fa-chevron-up")) {
      let addAmount = event.target;
      let id = addAmount.dataset.id;
      let tempItem = cart.find(item => item.id === id);
      tempItem.amount = tempItem.amount + 1;
      Storage.saveCart(cart);
      this.setCartValues(cart);
      addAmount.nextElementSibling.innerText = tempItem.amount;
    }
    else if(event.target.classList.contains("fa-chevron-down")) {
      let lowerAmount = event.target;
      let id = lowerAmount.dataset.id;
      let tempItem = cart.find(item => item.id === id);
      tempItem.amount = tempItem.amount - 1;
      if(tempItem.amount > 0) {
        Storage.saveCart(cart);
        this.setCartValues(cart);
        lowerAmount.previousElementSibling.innerText = tempItem.amount;
      }
      else {
        cartContent.removeChild(lowerAmount.parentElement.parentElement);
        this.removeItem(id);
      }
    }
  })
}
  clearCart() {
    let cartItems = cart.map(item => item.id);
    cartItems.forEach(id => this.removeItem(id));
    while(cartContent.children.length>0){
      cartContent.removeChild(cartContent.children[0])
    }
    this.hideCart();
}
removeItem(id) {
  cart = cart.filter(item => item.id !==id);
  this.setCartValues(cart);
  Storage.saveCart(cart);
  let button = this.getSingleButton(id);
  button.disabled = false;
  button.innerHTML = `<i class="fas fa-shopping-cart"></i>add to cart`;
}
getSingleButton(id) {
  return buttonsDOM.find(button => button.dataset.id === id);
}
}

//local storage
class Storage {

  static saveProducts(products){
    localStorage.setItem("products", JSON.stringify(products)
    );
  }
  static getProduct(id) {
    let products = JSON.parse(localStorage.getItem('products'));
    return products.find(product => product.id === id)
  }
  static saveCart(cart){
    localStorage.setItem('cart',JSON.stringify(cart));
  }
  static getCart() {
    return localStorage.getItem('cart')?JSON.parse(localStorage.getItem('cart')):[]

  }
}

document.addEventListener("DOMContentLoaded",()=> {
  const ui = new UI();
  const products = new Products();
  console.log(products.getProducts())
  // setup app
  // ui.setupAPP();
  // Get all products
  products.getProducts().then(products => {
    ui.displayProducts(products);
    pages(products)


    console.log(products)
    /* Storage.saveProducts(products); */
  })/*.then(()=>{
    ui.getBagButtons();
    ui.cartLogic();
  }); */
});

// Category function

/* productCategories.addEventListener('click', event => {
  const products = productsDOM.getElementsByClassName('product');
  const productsArray = Array.from(products);
  const productCategory = productsArray.forEach(item => {
    console.log(item);
    if (item.classList.contains('pens')) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  })

}) */

// search function

const searchBar = document.getElementById('searchBar');
  searchBar.addEventListener('keyup', (e) => {
  const searchString = e.target.value.toLowerCase();
  const products = productsDOM.getElementsByClassName('product');
  const productsArray = Array.from(products);
  const productTitle = productsArray.forEach(item => {
    const nodes = item.childNodes;
    const nodeItem = nodes.item(3)
    const title = nodeItem.textContent;
    if(title.toLowerCase().indexOf(searchString) != -1) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  })

});

// End of Search Function

// Category Search
class search {
  searchFunction(targetClass) {
     const products = productsDOM.getElementsByClassName('product');
     const productsArray = Array.from(products);
   const productCategory = productsArray.forEach(item => {
     if (item.classList.contains(targetClass)) {
       item.style.display = 'block';
     } else {
       item.style.display = 'none';
     }
   })
 }
}


productCategories.addEventListener('click', event => {

  const products = productsDOM.getElementsByClassName('product');
  const productsArray = Array.from(products);
  const searchProduct = new search();

  if (event.target.classList.contains('art-supplies')) {
    searchProduct.searchFunction('art-supplies'); }
    else if (event.target.classList.contains('children')) {
      searchProduct.searchFunction('children');
    } else if (event.target.classList.contains('office-stationery')) {
      searchProduct.searchFunction('office-stationery');
    } else if (event.target.classList.contains('entertainment')) {
      searchProduct.searchFunction('entertainment');
    }
    else if (event.target.classList.contains('seasonal-products')) {
      searchProduct.searchFunction('seasonal-products');
    }
      else {
      const productCategory = productsArray.forEach(item => {
        item.style.display = 'block';

      })
    }


  })

  // Next Page Test


function pages(products) {
  var current_page = 1;
var records_per_page = 100;

var objJson = products; // Can be obtained from another source, such as your objJson variable

forwardBtn.addEventListener('click', event => {
  nextPage()
})

function prevPage()
{
  console.log('back')
    if (current_page > 1) {
        current_page--;
        changePage(current_page);
    }
}

function nextPage()
{
  console.log('forward')
    if (current_page < numPages()) {
        current_page++;
        changePage(current_page);
    }
}

function changePage(page)
{
    var btn_next = document.getElementById("btn_next");
    var btn_prev = document.getElementById("btn_prev");
    var listing_table = document.getElementById("listingTable");
    var page_span = document.getElementById("page");

    // Validate page
    if (page < 1) page = 1;
    if (page > numPages()) page = numPages();

    listing_table.innerHTML = "";

    for (var i = (page-1) * records_per_page; i < (page * records_per_page); i++) {
        listing_table.innerHTML += objJson[i].adName + "<br>";
    }
    page_span.innerHTML = page;

    if (page == 1) {
        btn_prev.style.visibility = "hidden";
    } else {
        btn_prev.style.visibility = "visible";
    }

    if (page == numPages()) {
        btn_next.style.visibility = "hidden";
    } else {
        btn_next.style.visibility = "visible";
    }
}

function numPages()
{
    return Math.ceil(objJson.length / records_per_page);
}

window.onload = function() {
    changePage(1);
};
}


// Srcset template
/*            srcset="${product.cloudinary} 300w,
              ${product.cloudinary} 600w,
              ${product.cloudinary} 768w"
              sizes="(min-width: 500px) 80vw, 25vw" */
