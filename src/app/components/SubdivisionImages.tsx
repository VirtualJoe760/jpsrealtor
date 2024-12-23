'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';

type StreetViewData = {
  name: string;
  streetViewUrl: string;
};

export default function SubdivisionImages() {
  const [subdivisions, setSubdivisions] = useState<Record<string, StreetViewData[]>>({});

  useEffect(() => {
    const fetchSubdivisions = async () => {
      const response = await fetch('/api/streetview');
      const data = await response.json();
      setSubdivisions(data);
    };
    fetchSubdivisions();
  }, []);

  return (
    <div>
      {Object.entries(subdivisions).map(([key, neighborhoods]) => (
        <div key={key}>
          <h2>{key.replace(/-/g, ' ')}</h2>
          {neighborhoods.map(({ name, streetViewUrl }) => (
            <div key={name}>
              <h3>{name}</h3>
              <Image src={streetViewUrl} alt={`${name} Street View`} width={600} height={300} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
