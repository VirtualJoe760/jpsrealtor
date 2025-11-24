// src/app/cma/page.tsx
// CMA page - React Server Component

import { Metadata } from 'next';
import CMAClient from '../components/cma/CMAClient';

export const metadata: Metadata = {
  title: 'CMA - Comparative Market Analysis | Joseph Sardella Real Estate',
  description:
    'Generate professional Comparative Market Analysis reports with accurate property valuations, comparable sales data, and investment metrics.',
  keywords: [
    'CMA',
    'Comparative Market Analysis',
    'Property Valuation',
    'Real Estate Analysis',
    'Market Report',
    'Investment Analysis',
  ],
};

export default function CMAPage() {
  return <CMAClient />;
}
