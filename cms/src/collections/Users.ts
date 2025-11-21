import { CollectionConfig } from 'payload/types';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'createdAt'],
  },

  access: {
    read: ({ req }) => {
      // admins can read everyone
      if (req.user?.role === 'admin') return true;

      // agents can read their own users + service providers
      if (req.user?.role === 'agent') {
        return {
          or: [
            { id: req.user.id },
            { role: 'provider' }
          ]
        };
      }

      // basic users can only read themselves
      return {
        id: req.user?.id,
      };
    },

    create: () => true, // allow signups

    update: ({ req }) => {
      if (req.user?.role === 'admin') return true;

      // users can edit their own profile only
      return {
        id: req.user?.id,
      };
    },

    delete: ({ req }) => req.user?.role === 'admin',
  },

  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'client',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Agent', value: 'agent' },
        { label: 'Broker / Team Leader', value: 'broker' },
        { label: 'Client / Consumer', value: 'client' },
        { label: 'Investor (Pro Tier)', value: 'investor' },
        { label: 'Service Provider (Title, Lender, Vendor)', value: 'provider' },
        { label: 'Host (Short-Term Rentals)', value: 'host' },
      ],
    },

    {
      name: 'subscriptionTier',
      type: 'select',
      required: false,
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Pro Search ($10/mo)', value: 'pro' },
        { label: 'Investor Pro ($399/mo)', value: 'investor-pro' },
        { label: 'Agent SaaS', value: 'agent-saas' },
        { label: 'Host Package', value: 'host-tier' },
      ],
      admin: { condition: (_, data) => data.role !== 'admin' },
    },

    {
      name: 'profile',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'bio', type: 'textarea' },
      ],
    },
  ],
};
