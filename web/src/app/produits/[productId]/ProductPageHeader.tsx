'use client';

import { useCallback, useState } from 'react';
import { Header } from '@/components/HomePageClient';

export default function ProductPageHeader() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = useCallback((term: string) => {
    setSearchQuery(term.trim());
  }, []);

  const handleClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  return <Header searchQuery={searchQuery} onSubmitSearch={handleSubmit} onClearSearch={handleClear} />;
}
