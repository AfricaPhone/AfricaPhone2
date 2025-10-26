import { fireEvent, render, screen } from '@testing-library/react';
import { TopBar } from '@/components/HomePageClient';

describe('TopBar search interaction', () => {
  it('submits current search term on form submit', () => {
    const handleSubmit = jest.fn();

    render(<TopBar searchQuery="" onSubmitSearch={handleSubmit} />);

    const input = screen.getByPlaceholderText(/rechercher/i);
    fireEvent.change(input, { target: { value: 'Galaxy S24' } });

    const form = screen.getByRole('search', { name: /catalogue/i });
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('Galaxy S24');
  });

  it('trims whitespace before propagating the search term', () => {
    const handleSubmit = jest.fn();

    render(<TopBar searchQuery="" onSubmitSearch={handleSubmit} />);

    const input = screen.getByPlaceholderText(/rechercher/i);
    fireEvent.change(input, { target: { value: '   Infinix Zero   ' } });

    const form = screen.getByRole('search', { name: /catalogue/i });
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledWith('Infinix Zero');
  });
});
