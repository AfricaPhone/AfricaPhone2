import React, { useCallback } from 'react';
import { MaterialTopTabBar, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarItem, TabBarItemProps } from 'react-native-tab-view';

type Route = MaterialTopTabBarProps['state']['routes'][number];

type RenderTabBarItem = (props: TabBarItemProps<Route>) => React.ReactElement | null;

type ExtendedMaterialTopTabBarProps = MaterialTopTabBarProps & {
  renderTabBarItem?: RenderTabBarItem;
};

const PatchedMaterialTopTabBar: React.FC<ExtendedMaterialTopTabBarProps> = ({
  renderTabBarItem: originalRender,
  ...restProps
}) => {
  const renderTabBarItem = useCallback<NonNullable<MaterialTopTabBarProps['renderTabBarItem']>>(
    itemProps => {
      const { route, key: providedKey } = itemProps;
      const elementKey = providedKey ?? route?.key ?? route?.name ?? '';

      if (originalRender) {
        const element = originalRender(itemProps);
        return React.isValidElement(element) ? React.cloneElement(element, { key: elementKey }) : element;
      }

      return <TabBarItem {...itemProps} key={elementKey} />;
    },
    [originalRender]
  );

  return <MaterialTopTabBar {...restProps} renderTabBarItem={renderTabBarItem} />;
};

export default PatchedMaterialTopTabBar;
