'use client';

import { useCallback, useState } from 'react';
import { Header } from '../../page';

export default function ProductPageHeader() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = useCallback((term: string) => {
    setSearchQuery(term.trim());
  }, []);

  return <Header searchQuery={searchQuery} onSubmitSearch={handleSubmit} />;
}
