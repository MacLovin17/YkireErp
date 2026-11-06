import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

/** Logo própria da empresa em sessão; o YKIRE continua sendo a plataforma. */
export default function CompanyLogo({ user, className = 'h-11 w-11' }) {
  const [failed, setFailed] = useState(false);
  const file = user?.company_logo_url;
  useEffect(() => {
    setFailed(false);
  }, [file]);
  const rootClass = `${className} shrink-0 overflow-hidden flex items-center justify-center rounded-xl bg-white border border-white/20`;
  if (!file || failed) {
    return (
      <div className={rootClass}>
        <Building2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
      </div>
    );
  }
  const url = `${import.meta.env.BASE_URL}api/index.php${file}`;
  return (
    <div className={`${rootClass} p-1`}>
      <img
        src={url}
        alt={`Logo de ${user?.company_name || 'empresa'}`}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
