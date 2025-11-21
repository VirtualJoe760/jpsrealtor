/**
 * CMS Query Helpers
 *
 * Example helper functions for fetching data from Payload CMS collections.
 * These can be used in Next.js server components, API routes, or with proper
 * error handling in client components.
 *
 * All queries use the Payload REST API under the hood.
 */

import { cmsFetch } from './cmsFetch';

/**
 * Get all cities
 * @example const { docs: cities } = await getCities();
 */
export async function getCities() {
  return cmsFetch('/cities');
}

/**
 * Get a single city by slug
 * @example const city = await getCityBySlug('palm-springs');
 */
export async function getCityBySlug(slug: string) {
  const result = await cmsFetch(`/cities?where[slug][equals]=${slug}`);
  return result.docs?.[0] || null;
}

/**
 * Get all neighborhoods, optionally filtered by city
 * @example const { docs: neighborhoods } = await getNeighborhoods();
 * @example const { docs: neighborhoods } = await getNeighborhoods('city-id-123');
 */
export async function getNeighborhoods(cityId?: string) {
  const query = cityId ? `?where[city][equals]=${cityId}` : '';
  return cmsFetch(`/neighborhoods${query}`);
}

/**
 * Get a single neighborhood by slug
 * @example const neighborhood = await getNeighborhoodBySlug('palm-desert-country-club');
 */
export async function getNeighborhoodBySlug(slug: string) {
  const result = await cmsFetch(`/neighborhoods?where[slug][equals]=${slug}`);
  return result.docs?.[0] || null;
}

/**
 * Get all schools, optionally filtered by district
 * @example const { docs: schools } = await getSchools();
 * @example const { docs: schools } = await getSchools('Palm Springs Unified School District');
 */
export async function getSchools(district?: string) {
  const query = district ? `?where[district][equals]=${encodeURIComponent(district)}` : '';
  return cmsFetch(`/schools${query}`);
}

/**
 * Get a single school by slug
 * @example const school = await getSchoolBySlug('palm-springs-high-school');
 */
export async function getSchoolBySlug(slug: string) {
  const result = await cmsFetch(`/schools?where[slug][equals]=${slug}`);
  return result.docs?.[0] || null;
}

/**
 * Get all published blog posts
 * @example const { docs: posts } = await getBlogPosts();
 */
export async function getBlogPosts() {
  return cmsFetch('/blog-posts?where[published][equals]=true');
}

/**
 * Get a single blog post by slug
 * @example const post = await getBlogPostBySlug('top-10-neighborhoods-in-palm-springs');
 */
export async function getBlogPostBySlug(slug: string) {
  const result = await cmsFetch(`/blog-posts?where[slug][equals]=${slug}&where[published][equals]=true`);
  return result.docs?.[0] || null;
}

/**
 * Get recent blog posts (limit 5 by default)
 * @example const { docs: recentPosts } = await getRecentBlogPosts();
 * @example const { docs: recentPosts } = await getRecentBlogPosts(10);
 */
export async function getRecentBlogPosts(limit: number = 5) {
  return cmsFetch(`/blog-posts?where[published][equals]=true&limit=${limit}&sort=-createdAt`);
}
