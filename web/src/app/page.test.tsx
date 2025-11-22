import { fireEvent, render, screen } from '@testing-library/react';
import { TopBar } from '@/components/HomePageClient';

describe('TopBar search interaction', () => {
  const openModal = () => {
    const trigger = screen.getByRole('button', { name: /rechercher un produit/i });
    fireEvent.click(trigger);
  };

  it('submits current search term from the modal form', () => {
    const handleSubmit = jest.fn();
    const handleClear = jest.fn();

    render(<TopBar searchQuery="" onSubmitSearch={handleSubmit} onClearSearch={handleClear} />);

    openModal();

    const input = screen.getByPlaceholderText(/produit ou une marque/i);
    fireEvent.change(input, { target: { value: 'Galaxy S24' } });

    const submitButton = screen.getByRole('button', { name: /^rechercher$/i });
    fireEvent.click(submitButton);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('Galaxy S24');
  });

  it('trims whitespace before propagating the search term', () => {
    const handleSubmit = jest.fn();
    const handleClear = jest.fn();

    render(<TopBar searchQuery="" onSubmitSearch={handleSubmit} onClearSearch={handleClear} />);

    openModal();

    const input = screen.getByPlaceholderText(/produit ou une marque/i);
    fireEvent.change(input, { target: { value: '   Infinix Zero   ' } });

    const form = screen.getByRole('search', { name: /catalogue/i });
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledWith('Infinix Zero');
  });

  it('submits immediately when a suggestion is selected', () => {
    const handleSubmit = jest.fn();
    const handleClear = jest.fn();

    render(<TopBar searchQuery="" onSubmitSearch={handleSubmit} onClearSearch={handleClear} />);

    openModal();

    const suggestion = screen.getByRole('button', { name: /tecno camon 30/i });
    fireEvent.click(suggestion);

    expect(handleSubmit).toHaveBeenCalledWith('Tecno Camon 30');
  });
});
