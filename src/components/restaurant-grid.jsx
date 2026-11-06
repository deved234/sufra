import RestaurantCard from "@/components/restaurant-card";

export default function RestaurantGrid({ restaurants, favorite = false, preloadCount = 3 }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {restaurants.map((restaurant, index) => (
        <li key={restaurant.slug}>
          <RestaurantCard restaurant={restaurant} preload={index < preloadCount} favorite={favorite} />
        </li>
      ))}
    </ul>
  );
}
