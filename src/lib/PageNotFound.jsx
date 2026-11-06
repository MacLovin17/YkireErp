import React from 'react';
import { Link } from 'react-router-dom';
export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="my-4 text-slate-600">Esta página não existe.</p>
        <Link className="text-indigo-600 underline" to="/modulos">
          Voltar aos módulos
        </Link>
      </div>
    </div>
  );
}
