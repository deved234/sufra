import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dishShare, restaurantImage, restaurantShare } from "@/lib/site/share-image";

const uploaded = { id: "dish-photo" };
const demo = { src: "/_next/static/media/kabsa.webp" };
const menu = (...items) => [{ items: items.map((item) => ({ name: "Dish", description: "Tasty", ...item })) }];
const place = (extra) => ({ name: "Place", tagline: "Good food", menu: [], ...extra });

test("a restaurant's picture is its cover, then its first dish with one", () => {
  assert.match(restaurantImage(place({ cover: { id: "cover" }, menu: menu({ photo: uploaded }) })), /w_1280\/cover$/);
  assert.match(restaurantImage(place({ menu: menu({}, { photo: uploaded }) })), /w_1200\/dish-photo$/);
  assert.equal(restaurantImage(place({ menu: menu({}, { image: demo }) })), demo.src);
  assert.equal(restaurantImage(place()), null);
});

test("a restaurant with no pictures keeps the general one, with its own words", () => {
  const { openGraph, twitter } = restaurantShare(place());
  assert.deepEqual(openGraph.images, ["/og.png"]);
  assert.equal(openGraph.title, "Place");
  assert.equal(twitter.description, "Good food");
});

test("a dish shows its own picture, or else the restaurant's", () => {
  const restaurant = place({ cover: { id: "cover" } });
  assert.match(dishShare({ name: "Kabsa", description: "Rice", photo: uploaded }, restaurant).openGraph.images[0], /dish-photo$/);
  const plain = dishShare({ name: "Kabsa", description: "Rice" }, restaurant).openGraph;
  assert.match(plain.images[0], /cover$/);
  assert.equal(plain.title, "Kabsa | Place");
});
