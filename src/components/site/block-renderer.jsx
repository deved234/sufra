import AboutBlock from "@/components/site/blocks/about-block";
import AnnouncementBlock from "@/components/site/blocks/announcement-block";
import BookingBlock from "@/components/site/blocks/booking-block";
import ContactBlock from "@/components/site/blocks/contact-block";
import FeaturedBlock from "@/components/site/blocks/featured-block";
import GalleryBlock from "@/components/site/blocks/gallery-block";
import HeroBlock from "@/components/site/blocks/hero-block";
import HoursBlock from "@/components/site/blocks/hours-block";
import MenuBlock from "@/components/site/blocks/menu-block";

const COMPONENTS = {
  about: AboutBlock,
  announcement: AnnouncementBlock,
  booking: BookingBlock,
  contact: ContactBlock,
  featured: FeaturedBlock,
  gallery: GalleryBlock,
  hero: HeroBlock,
  hours: HoursBlock,
  menu: MenuBlock,
};

// A restaurant's page, from its list of blocks. It's not client code and not async, so
// the public page renders it on the server and the editor renders it in the browser.
// @container: blocks size themselves to this box rather than the screen, which lets the
// editor show a phone-sized page on a computer.
export default function BlockRenderer({ restaurant, blocks, editing = false }) {
  const context = {
    editing,
    hasBooking: blocks.some((block) => block.type === "booking"),
    hasHours: blocks.some((block) => block.type === "hours"),
  };
  return (
    <div className="@container flex flex-1 flex-col">
      {blocks.map((block) => {
        const Block = COMPONENTS[block.type];
        return <Block key={block.id} block={block} restaurant={restaurant} context={context} />;
      })}
    </div>
  );
}
