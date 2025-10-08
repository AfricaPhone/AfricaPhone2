import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import PatchedMaterialTopTabBar from '../PatchedMaterialTopTabBar';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import type { TabBarItemProps } from 'react-native-tab-view';

type TabRoute = { key: string; name: string };

type CapturedProps = MaterialTopTabBarProps & {
  renderTabBarItem?: (props: TabBarItemProps<TabRoute>) => React.ReactElement | null;
};

jest.mock('@react-navigation/material-top-tabs', () => {
  const capturedProps: { current: CapturedProps | null } = { current: null };
  const MaterialTopTabBar = jest.fn((props: CapturedProps) => {
    capturedProps.current = props;
    return null;
  });

  return {
    __esModule: true,
    MaterialTopTabBar,
    __mock: { capturedProps },
  };
});

jest.mock('react-native-tab-view', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const TabBarItem = jest.fn((props: TabBarItemProps<TabRoute>) => ReactModule.createElement('TabBarItem', props));
  return {
    __esModule: true,
    TabBarItem,
  };
});

const {
  __mock: { capturedProps },
  MaterialTopTabBar,
} = jest.requireMock('@react-navigation/material-top-tabs') as {
  MaterialTopTabBar: jest.Mock<null, [CapturedProps]>;
  __mock: { capturedProps: { current: CapturedProps | null } };
};

const { TabBarItem } = jest.requireMock('react-native-tab-view') as {
  TabBarItem: jest.Mock<React.ReactElement, [TabBarItemProps<TabRoute>]>;
};

const createState = (): MaterialTopTabBarProps['state'] =>
  ({
    index: 0,
    key: 'top-tabs',
    routeNames: [],
    routes: [],
    type: 'material-top-tab',
    stale: false,
  }) as MaterialTopTabBarProps['state'];

const createBaseProps = (): MaterialTopTabBarProps => ({
  layout: { width: 320, height: 64 },
  position: new Animated.Value(0) as unknown as Animated.AnimatedInterpolation<number>,
  jumpTo: jest.fn(),
  navigation: { emit: jest.fn(), dispatch: jest.fn() } as unknown as MaterialTopTabBarProps['navigation'],
  descriptors: {} as MaterialTopTabBarProps['descriptors'],
  state: createState(),
});

const createRenderItemArgs = (
  route: TabRoute,
  overrides: Partial<TabBarItemProps<TabRoute>> = {}
): TabBarItemProps<TabRoute> => ({
  key: '0',
  route,
  focused: false,
  color: '#000',
  navigationState: { index: 0, routes: [route] } as unknown as TabBarItemProps<TabRoute>['navigationState'],
  position: new Animated.Value(0) as unknown as Animated.AnimatedInterpolation<number>,
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

  it('transfers props to MaterialTopTabBar', () => {
    const baseProps = createBaseProps();

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current;
    expect(MaterialTopTabBar).toHaveBeenCalledTimes(1);
    expect(captured).not.toBeNull();

    if (!captured) {
      throw new Error('captured props should not be null');
    }

    expect(typeof captured.renderTabBarItem).toBe('function');
  });

  it('uses the route key for built-in items', () => {
    const baseProps = createBaseProps();
    const route: TabRoute = { key: 'tablette', name: 'tablette' };

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current;
    if (!captured || !captured.renderTabBarItem) {
      throw new Error('renderTabBarItem not captured');
    }

    const element = captured.renderTabBarItem(createRenderItemArgs(route));
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.key).toBe(route.key);
  });

  it('clones custom output and enforces key', () => {
    const route: TabRoute = { key: 'accessoire', name: 'accessoire' };
    const customElement = <React.Fragment />;
    const renderTabBarItem = jest.fn<React.ReactElement | null, [TabBarItemProps<TabRoute>]>(() => customElement);

    const baseProps: MaterialTopTabBarProps & { renderTabBarItem: typeof renderTabBarItem } = {
      ...createBaseProps(),
      renderTabBarItem,
    };

    render(<PatchedMaterialTopTabBar {...baseProps} />);

    const captured = capturedProps.current;
    if (!captured || !captured.renderTabBarItem) {
      throw new Error('renderTabBarItem not captured');
    }

    const element = captured.renderTabBarItem(createRenderItemArgs(route));
    expect(renderTabBarItem).toHaveBeenCalled();
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.key).toBe(route.key);
  });
});
