import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProfileListItem from './ProfileListItem';

describe('ProfileListItem', () => {
  it('should render the label and icon correctly', () => {
    // 1. On "dessine" le composant avec des props de base
    render(<ProfileListItem icon="person-outline" label="Informations" />);

    // 2. On vérifie que le texte "Informations" est bien visible à l'écran
    expect(screen.getByText('Informations')).toBeTruthy();
  });

  it('should render the detail text when provided', () => {
    render(<ProfileListItem icon="color-palette-outline" label="Apparence" detail="System" />);

    // On vérifie que le détail "System" est aussi affiché
    expect(screen.getByText('Apparence')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
  });

  it('should render a Switch when isSwitch is true', () => {
    render(
      <ProfileListItem
        icon="notifications-outline"
        label="Notifications"
        isSwitch
        switchValue={true}
        onSwitchChange={() => {}}
      />
    );

    // On cherche un élément avec le "rôle" d'un interrupteur (switch)
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeTruthy();

    // On vérifie qu'il est bien activé
    expect(switchElement.props.value).toBe(true);
  });

  it('should not render a Switch by default', () => {
    render(<ProfileListItem icon="person-outline" label="Informations" />);

    // queryByRole retourne null si l'élément n'est pas trouvé (contrairement à getByRole qui lève une erreur)
    expect(screen.queryByRole('switch')).toBeNull();
  });
});