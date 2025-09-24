import React, { useCallback } from 'react';
import { MaterialTopTabBar, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarItem } from 'react-native-tab-view';

type RenderTabBarItem = NonNullable<MaterialTopTabBarProps['renderTabBarItem']>;
type RenderItemProps = Parameters<RenderTabBarItem>[0] & { key?: string };

const PatchedMaterialTopTabBar: React.FC<MaterialTopTabBarProps> = props => {
  const { renderTabBarItem: originalRender, ...restProps } = props;

  const renderTabBarItem = useCallback<RenderTabBarItem>(
    itemProps => {
      const { key: providedKey, route, ...tabBarItemProps } = itemProps as RenderItemProps;
      const elementKey = route?.key ?? providedKey ?? route?.name;
      const baseProps = { ...tabBarItemProps, route } as RenderItemProps;

      if (originalRender) {
        const element = originalRender({ ...baseProps, key: elementKey });
        return React.isValidElement(element) ? React.cloneElement(element, { key: elementKey }) : element;
      }

      return (
        <TabBarItem
          key={elementKey}
          {...(baseProps as React.ComponentProps<typeof TabBarItem>)}
        />
      );
    },
    [originalRender]
  );

  return <MaterialTopTabBar {...restProps} renderTabBarItem={renderTabBarItem} />;
};

export default PatchedMaterialTopTabBar;
