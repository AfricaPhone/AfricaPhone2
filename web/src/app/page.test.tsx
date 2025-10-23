import { fireEvent, render, screen } from '@testing-library/react';
import { TopNav } from './page';

describe('TopNav search interaction', () => {
  it('submits current search term when clicking the search button', () => {
    const handleSubmit = jest.fn();

    render(<TopNav searchQuery="" onSubmitSearch={handleSubmit} />);

    const input = screen.getByLabelText(/champ de recherche/i);
    fireEvent.change(input, { target: { value: 'Galaxy S24' } });

    const button = screen.getByRole('button', { name: /rechercher/i });
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('Galaxy S24');
  });

  it('trims whitespace before propagating the search term', () => {
    const handleSubmit = jest.fn();

    render(<TopNav searchQuery="" onSubmitSearch={handleSubmit} />);

    const input = screen.getByLabelText(/champ de recherche/i);
    fireEvent.change(input, { target: { value: '   Infinix Zero   ' } });

    const form = screen.getByRole('search', { name: /catalogue/i });
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledWith('Infinix Zero');
  });
});
