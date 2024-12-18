
import { client } from "@/sanity/lib/client";
import VariableHero from "../components/VariableHero";

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  publishedAt,
  "thumbnail": mainImage.asset->url,
  "altText": mainImage.alt
}`;

const options = { next: { revalidate: 30 } };

export default async function IndexPage() {


  return (
    <>
      {/* Hero Section */}
      <VariableHero
        backgroundImage="/city-images/cathedral-city.jpg"
        heroContext="JPS Insights"
        description="Read the latest on my local tips about buying, selling & The Coachella Valley."
        alignment="center"
      />

      {/* Articles Section */}
      
    </>
  );
}
