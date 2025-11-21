import { CollectionConfig } from 'payload/types';
import { generateSlug } from '../hooks/slugify';

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: { useAsTitle: 'title' },

  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'agent',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'agent',
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.slug && data.title) {
          data.slug = generateSlug(data.title);
        }
      }
    ]
  },

  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, required: true },
    { name: 'excerpt', type: 'textarea' },
    { name: 'content', type: 'richText' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    { name: 'published', type: 'checkbox', defaultValue: false },
  ],
};
