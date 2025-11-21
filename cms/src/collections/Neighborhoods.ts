import { CollectionConfig } from 'payload/types';
import { generateSlug } from '../hooks/slugify';

export const Neighborhoods: CollectionConfig = {
  slug: 'neighborhoods',
  admin: { useAsTitle: 'name' },

  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.slug && data.name) {
          data.slug = generateSlug(data.name);
        }
      }
    ]
  },

  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, required: true },
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
      required: true,
    },
    { name: 'description', type: 'richText' },
    { name: 'yearBuiltRange', type: 'text' },
    { name: 'avgPrice', type: 'text' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
  ],
};
