import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import './DominosPizzaPage.css';
import { CartContext } from '../context/CartContext'; // Added import for CartContext

const restaurant = {
  name: 'Domino\'s Pizza',
  photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/f9007f73da46783cb255a1e621637f27_d26djo.jpg',
  cuisines: ['Pizza', 'Fast Food', 'Italian', 'Beverages', 'Desserts', 'Sides'],
  address: '321, Pizza Street, Alkapuri, Vadodara',
  timings: '11am – 11pm',
  contact: '+917777777777',
  rating: 4.6,
  ratingCount: 892,
  menu: [
    { name: 'Margherita Pizza', price: 299, description: 'Classic tomato sauce with mozzarella cheese.', category: 'Pizza', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1753335236/pizza_eo0k4v.jpg' },
    { name: 'Peppy Paneer Pizza', price: 399, description: 'Spicy paneer with capsicum and onions.', category: 'Pizza', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1753335211/food1_z8vt3v.jpg' },
    { name: 'Farmhouse Pizza', price: 449, description: 'Fresh vegetables with mushrooms and olives.', category: 'Pizza', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1752563696/410b32a87e020b0e8dbe8a2850d8ca29_socitw.jpg' },
    { name: 'Mexican Green Wave', price: 399, description: 'Mexican herbs with jalapeños and paprika.', category: 'Pizza', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1753335242/samosa_q7pecl.jpg' },
    { name: 'Chicken Wings', price: 199, description: 'Crispy chicken wings with hot sauce.', category: 'Sides', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/859adef90e854238d9b330d0c7d2cf73_get6ol.jpg' },
    { name: 'Garlic Bread', price: 99, description: 'Toasted bread with garlic butter and herbs.', category: 'Sides', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1753335197/burger_yrnmbm.jpg' },
    { name: 'Chocolate Lava Cake', price: 149, description: 'Warm chocolate cake with molten center.', category: 'Desserts', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1752252984/684ca1498560c84097bebc3805da551b_mt0neb.jpg' },
    { name: 'Coca Cola', price: 79, description: 'Refreshing carbonated soft drink.', category: 'Beverages', photo: 'https://res.cloudinary.com/dlurlrbou/image/upload/v1752252980/01a8503fdbc5be552ae436c2aafcd064_sjk2uw.jpg' },
  ],
};

const categories = Array.from(new Set(restaurant.menu.map(item => item.category)));

export default function DominosPizzaPage() {
  const { addToCart, cartItems } = useContext(CartContext); // ✅ use global cart
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const navigate = useNavigate(); // ✅ Add navigation

  // ✅ Count total items by summing quantity
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // ✅ Handle cart click
  const handleCartClick = () => {
    navigate('/cart');
  };

  return (
    <div className="restaurant-detail-bg">
      <div
        className="restaurant-header restaurant-header-bgimg"
        style={{ backgroundImage: `url(${restaurant.photo})` }}
      >
        <div className="cravecart-header-row">
          <span className="cravecart-title">CraveCart</span>
          <GlobalSearch placeholder="Search for your cravings..." />
          <span className="cravecart-icons">
            <span className="cravecart-cart-icon" onClick={handleCartClick} style={{ cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {totalItems > 0 && <span className="cart-count-badge">{totalItems}</span>}
            </span>
          </span>
        </div>
        <div className="restaurant-header-content-bg">
          <div className="restaurant-header-info">
            <h1 className="restaurant-title">{restaurant.name}</h1>
            <div className="restaurant-cuisines">{restaurant.cuisines.join(', ')}</div>
            <div className="restaurant-address">{restaurant.address}</div>
            <div className="restaurant-meta">
              <span className="restaurant-timings">{restaurant.timings}</span>
              <span className="restaurant-contact">{restaurant.contact}</span>
              <span className="restaurant-rating">
                <span className="rating-badge">{restaurant.rating}★</span>
                <span className="rating-count">{restaurant.ratingCount} ratings</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="restaurant-menu-section menu-flex-layout">
        <h2 className="menu-title">Menu</h2>
        <div className="menu-flex-row">
          <div className="menu-categories-vertical">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`menu-category-btn${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="menu-list-vertical">
            {restaurant.menu.filter(item => item.category === selectedCategory).map((item, idx) => (
              <div className="menu-item" key={idx}>
                <div className="menu-item-main">
                  <div className="menu-item-name-desc">
                    <span className="menu-item-name">{item.name}</span>
                    <div className="menu-item-desc">{item.description}</div>
                    <button className="add-to-cart-btn" onClick={() => addToCart(item)}>
                      Add to Cart
                    </button>
                  </div>
                  <span className="menu-item-price">₹{item.price}</span>
                  <img src={item.photo} alt={item.name} className="menu-item-photo" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 