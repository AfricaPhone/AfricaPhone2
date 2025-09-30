jest.mock('@react-navigation/material-top-tabs', () => {
  const React = require('react');
  const capturedProps = { current: null } as { current: any };
  const MaterialTopTabBar = jest.fn(({ renderTabBarItem, ...rest }: any) => {
    capturedProps.current = { ...rest, renderTabBarItem };
    return null;
  });

  return {
    __esModule: true,
    MaterialTopTabBar,
    __mock: { capturedProps },
  };
});

jest.mock('react-native-tab-view', () => {
  const React = require('react');
  const TabBarItem = jest.fn((props: any) => React.createElement('TabBarItem', props));
  return {
    __esModule: true,
    TabBarItem,
  };
});

import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import PatchedMaterialTopTabBar from '../PatchedMaterialTopTabBar';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import type { TabBarItemProps } from 'react-native-tab-view';

const {
  __mock: { capturedProps },
  MaterialTopTabBar,
} = jest.requireMock('@react-navigation/material-top-tabs') as {
  MaterialTopTabBar: jest.Mock;
  __mock: { capturedProps: { current: any } };
};

const { TabBarItem } = jest.requireMock('react-native-tab-view') as { TabBarItem: jest.Mock };

type TabRoute = { key: string; name: string };

type RenderItemArgs = any;

const createState = () => ({
  index: 0,
  key: 'top-tabs',
  routeNames: [] as string[],
  routes: [] as TabRoute[],
  type: 'material-top-tab',
  stale: false,
});

const createBaseProps = (): MaterialTopTabBarProps => ({
  layout: { width: 320, height: 64 },
  position: new Animated.Value(0) as unknown as Animated.AnimatedInterpolation<number>,
  jumpTo: jest.fn(),
  navigation: { emit: jest.fn(), dispatch: jest.fn() } as any,
  descriptors: {},
  state: createState() as any,
});

const createRenderItemArgs = (route: TabRoute, overrides: Partial<RenderItemArgs> = {}): RenderItemArgs => ({
  key: '0',
  route,
  focused: false,
  color: '#000',
  navigationState: { index: 0, routes: [route] } as any,
  position: new Animated.Value(0) as any,
  layout: { width: 320, height: 64 },
  jumpTo: jest.fn(),
  getLabelText: jest.fn(),
  getAccessible: jest.fn(),
  getAccessibilityLabel: jest.fn(),
  getTestID: jest.fn(),
  renderIcon: jest.fn(),
  renderLabel: jest.fn(),
  renderBadge: jest.fn(),
  getBadge: jest.fn(),
  onTabPress: jest.fn(),
  onTabLongPress: jest.fn(),
  pressColor: 'rgba(0,0,0,0.1)',
  getTabPressColor: jest.fn(),
  ...overrides,
});

describe('PatchedMaterialTopTabBar', () => {
  beforeEach(() => {
    capturedProps.current = null;
    MaterialTopTabBar.mockClear();
    TabBarItem.mockClear();
  });

  it('transmet toutes les props vers MaterialTopTabBar', () => {
    const baseProps = createBaseProps();

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current as any;
    expect(captured).toMatchObject({ ...baseProps });
    expect(typeof captured.renderTabBarItem).toBe('function');
  });

  it('utilise la key de la route pour les items', () => {
    const baseProps = createBaseProps();
    const route = { key: 'tablette', name: 'tablette' };

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current as any;
    const element = captured.renderTabBarItem(createRenderItemArgs(route)) as React.ReactElement;

    expect(React.isValidElement(element)).toBe(true);
    expect(element.key).toBe(route.key);
  });

  it('clone la sortie custom en forcant la key de la route', () => {
    const route = { key: 'accessoire', name: 'accessoire' };
    const customElement = <React.Fragment />;
    const renderTabBarItem = jest.fn<React.ReactElement | null, [RenderItemArgs]>(() => customElement);

    const baseProps = {
      ...createBaseProps(),
      renderTabBarItem,
    } as MaterialTopTabBarProps & { renderTabBarItem: typeof renderTabBarItem };

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current as any;
    const element = captured.renderTabBarItem(createRenderItemArgs(route)) as React.ReactElement;

    expect(renderTabBarItem).toHaveBeenCalled();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.key).toBe(route.key);
  });
});
