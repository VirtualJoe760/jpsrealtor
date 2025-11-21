import { CollectionConfig } from 'payload/types';
import { generateSlug } from '../hooks/slugify';

export const Schools: CollectionConfig = {
  slug: 'schools',
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
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'district',
      type: 'select',
      options: [
        'Palm Springs Unified School District',
        'Desert Sands Unified School District',
        'Coachella Valley Unified School District',
        'Private School'
      ]
    },
    { name: 'address', type: 'text' },
    { name: 'coordinates', type: 'point' },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'richText' },
    { name: 'phone', type: 'text' },
    { name: 'website', type: 'text' },
    { name: 'principal', type: 'text' },
  ],
};
