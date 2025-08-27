import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./AllRestaurants.css";



const restaurantsData = [
  { name: "Old School Eatery", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252981/cbf0e26a374f31531096c56671993220_ffd7xy.jpg", isVeg: false },
  { name: "The South Cafe", time: "20 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252984/781c6867d971c5fa7a704c992dc755c3_waxhi9.jpg", isVeg: true },
  { name: "Le Prive", time: "25 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/400b385226afc26f539aa732d38b14a6_k6si5f.jpg", isVeg: false },
  { name: "Domino's Pizza", time: "20 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/f9007f73da46783cb255a1e621637f27_d26djo.jpg", isVeg: false },
  { name: "Santosh Pav Bhaji", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252985/a79424d1606a535db91108548167727f_rpmxgv.jpg", isVeg: true },
  { name: "The Chaat Chaska", time: "15 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252986/930a559fbe007109bb73b2be1f53411a_ojpdss.jpg", isVeg: true },
  { name: "Urban Bites", time: "25 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752397646/ae21f90d2d9471f8d345edfbe03e4ee2_pxltci.jpg", isVeg: true },
  { name: "Punjabi Dhaba", time: "35 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252985/a79424d1606a535db91108548167727f_rpmxgv.jpg", isVeg: false },
  { name: "Mums Cafe", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/400b385226afc26f539aa732d38b14a6_k6si5f.jpg", isVeg: true },
  { name: "Rajasthan Rasoi", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252983/400b385226afc26f539aa732d38b14a6_k6si5f.jpg", isVeg: true },
  { name: "Earthmonk", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752252984/684ca1498560c84097bebc3805da551b_mt0neb.jpg", isVeg: true },
   { name: "Cafeista", time: "30 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1753074067/dc5bcfa36115660616df1ea8a7f202d2_hriasg.jpg", isVeg: true },
  { name: "Jassi de Parathe", time: "15 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1753074301/4d65723ca703fe8bbf6f0d60fdd70939_xpu8pr.jpg", isVeg: true },
  
  { name: "MomosHut", time: "15 mins", image: "https://res.cloudinary.com/dlurlrbou/image/upload/v1752398135/0b5eb439a0fe2c71aa7b427d3402e1ea_jd6bkm.jpg", isVeg: true },
];

const AllRestaurants = () => {
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    const filtered = showVegOnly
      ? restaurantsData.filter((r) => r.isVeg)
      : restaurantsData;
    setRestaurants(filtered.slice(0, 10));
  }, [showVegOnly]);

  const loadMoreRestaurants = useCallback(() => {
    const filtered = showVegOnly
      ? restaurantsData.filter((r) => r.isVeg)
      : restaurantsData;

    const currentLength = restaurants.length;
    const more = filtered.slice(currentLength, currentLength + 10);
    if (more.length > 0) {
      setRestaurants((prev) => [...prev, ...more]);
    }
  }, [restaurants, showVegOnly]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100
      ) {
        loadMoreRestaurants();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMoreRestaurants]);

  const toggleVeg = () => {
    setShowVegOnly((prev) => !prev);
  };

  const routeMap = {
    "Old School Eatery": "/old-school-eatery",
    "Le Prive": "/le-prive",
    "The South Cafe": "/south-cafe",
    "Domino's Pizza": "/dominos-pizza",
    "Santosh Pav Bhaji": "/santosh-pav-bhaji",
    "Urban Bites": "/urban-bites",
    "Punjabi Dhaba": "/punjabi-dhaba",
    "Rajasthan Rasoi": "/rajasthani-rasoi", // ✅ ADDED
    "The Chaat Chaska": "/the-chaat-chaska", // ✅ ADDED
    "MomosHut": "/momos-hut", // ✅ ADDED

  };

  return (
    <section className="all-restaurants">
      <div className="all-restaurants-header">
        <h2>All Restaurants</h2>
        <div className="filters" onClick={toggleVeg}>
          <span className="filter-label">
            {showVegOnly ? "Veg: ON" : "Veg: OFF"}
          </span>
          <div className={`filter-toggle ${showVegOnly ? "on" : ""}`}></div>
        </div>
      </div>

      <div className="restaurant-grid">
        {restaurants.map((res, index) => {
          const cardContent = (
            <>
              <img src={res.image} alt={res.name} />
              <p className="restaurant-name">{res.name}</p>
              <p className="restaurant-time">⏱ {res.time}</p>
            </>
          );

          const route = routeMap[res.name];

          return route ? (
            <Link
              to={route}
              key={index}
              className="restaurant-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {cardContent}
            </Link>
          ) : (
            <div className="restaurant-card" key={index}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AllRestaurants;
