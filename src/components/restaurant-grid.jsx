import RestaurantCard from "@/components/restaurant-card";

export default function RestaurantGrid({ restaurants }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {restaurants.map((restaurant, index) => (
        <li key={restaurant.slug}>
          <RestaurantCard restaurant={restaurant} preload={index < 3} />
        </li>
      ))}
    </ul>
  );
}
