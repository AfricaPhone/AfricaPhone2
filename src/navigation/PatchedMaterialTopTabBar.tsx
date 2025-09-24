import React, { useCallback } from 'react';
import { MaterialTopTabBar, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarItem, TabBarItemProps } from 'react-native-tab-view';

type Route = TabBarItemProps<any>['route'];

type RenderTabBarItem = (
  props: (TabBarItemProps<Route> & { key: string })
) => React.ReactElement | null;

type ExtendedMaterialTopTabBarProps = MaterialTopTabBarProps & {
  renderTabBarItem?: RenderTabBarItem;
};

const PatchedMaterialTopTabBar: React.FC<ExtendedMaterialTopTabBarProps> = props => {
  const { renderTabBarItem: originalRender, ...restProps } = props;

  const renderTabBarItem = useCallback(
    (itemProps: TabBarItemProps<Route> & { key: string }) => {
      const { key: providedKey, route, ...tabBarItemProps } = itemProps;
      const elementKey = route?.key ?? providedKey ?? route?.name ?? '';
      const baseProps = { ...tabBarItemProps, route } as TabBarItemProps<Route>;

      if (originalRender) {
        const element = originalRender({ ...baseProps, key: elementKey });
        return React.isValidElement(element) ? React.cloneElement(element, { key: elementKey }) : element;
      }

      return <TabBarItem key={elementKey} {...baseProps} />;
    },
    [originalRender]
  );

  const materialProps: any = {
    ...restProps,
    renderTabBarItem,
  };

  return React.createElement(MaterialTopTabBar as any, materialProps);
};

export default PatchedMaterialTopTabBar;
