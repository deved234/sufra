import BlockRenderer from "@/components/site/block-renderer";
import { siteBlocks } from "@/lib/site/blocks";

// The body of a restaurant's page, for the public site and the owner's preview: what the
// owner published, or the default page. Takes a localized restaurant.
export default function RestaurantView({ restaurant }) {
  return <BlockRenderer restaurant={restaurant} blocks={siteBlocks(restaurant)} />;
}
