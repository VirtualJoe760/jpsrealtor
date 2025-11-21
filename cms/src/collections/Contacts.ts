import { CollectionConfig } from 'payload/types';

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  admin: { useAsTitle: 'email' },

  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin' || req.user?.role === 'agent') return true;
      return { owner: req.user?.id };
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => ({
      or: [
        { owner: req.user?.id },
        req.user?.role === 'admin'
      ]
    }),
    delete: ({ req }) => req.user?.role === 'admin',
  },

  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'notes', type: 'richText' },
    { name: 'leadSource', type: 'text' },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
  ],
};
