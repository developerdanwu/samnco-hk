const client = contentful.createClient({
  // This is the space ID. A space is like a project folder in Contentful terms
  space: "0snbon2lhkq6",
  // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
  accessToken: "Fv2NuGJNYv05QB9r3lI7aMPfQ_YRG-7t3w3ZaGyCu0M"
});

//variables


const productsDOM = document.querySelector('.discount-container');
const productTest = document.querySelector('.product')


// cart
let cart = []

// buttons
let buttonsDOM = [];

// getting the products
class Products{

  async getProducts() {
    try {

      let contentfulSelect = await client.getEntries({
        'fields.category2': 'discount',
        content_type: "samAndCoProducts",
        limit: 4,

      })




      console.log(contentfulSelect)


      // let result = await fetch("products.json");
      // let data = await result.json();

      let products = contentfulSelect.items;
      console.log(products);

      products = products.map(item => {
        const {title, price, category, category2, originalPrice} = item.fields;
        const {id} = item.sys;
        const cloudinary = item.fields.cloudinary[0].secure_url
        return {title,price,id,category,category2,cloudinary, originalPrice};
      });


      return products;
    } catch (error) {
      console.log(error);
    }

  }



}

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
      } else if (product.category2 == 'discount') {
        productTitle2 = 'Discount'
      } else {
        productTitle2 = ''
      }
      if (product.originalPrice != null) {
        productPrice = 'HKD ' + '<strike>' + product.originalPrice + '</strike>'  + ' ' + product.price;
      }
      else if (product.price != null) {
        productPrice = 'HKD ' + product.price;
      } else {
        productPrice = '';
      }



      result += `
      <article class="product ${product.category} ${product.category2}">
        <div class="img-container">
        <img src=${product.cloudinary} class="" alt="${product.title}">
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
}

document.addEventListener("DOMContentLoaded",()=> {
  const ui = new UI();
  const products = new Products();
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
