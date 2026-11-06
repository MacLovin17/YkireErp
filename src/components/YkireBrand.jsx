import React from 'react';

/** Identidade da plataforma YKIRE (separada da logo de cada empresa). */
export default function YkireBrand({ className = '', eager = false }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}branding/ykire-loop.webp`}
      alt="YKIRE"
      title="YKIRE"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={`block shrink-0 object-contain rounded-md ${className}`}
    />
  );
}
