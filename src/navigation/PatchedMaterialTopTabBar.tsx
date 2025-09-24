import React, { useCallback } from 'react';
import { MaterialTopTabBar, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarItem } from 'react-native-tab-view';

const PatchedMaterialTopTabBar: React.FC<MaterialTopTabBarProps> = props => {
  const { renderTabBarItem: originalRender, ...restProps } = props;

  const renderTabBarItem = useCallback(
    (itemProps: React.ComponentProps<typeof TabBarItem> & { key: string }) => {
      const { key, ...tabBarItemProps } = itemProps;

      if (originalRender) {
        const element = originalRender({ ...tabBarItemProps, key } as typeof itemProps);
        return React.isValidElement(element) ? React.cloneElement(element, { key }) : element;
      }

      return <TabBarItem key={key} {...(tabBarItemProps as React.ComponentProps<typeof TabBarItem>)} />;
    },
    [originalRender]
  );

  return <MaterialTopTabBar {...restProps} renderTabBarItem={renderTabBarItem} />;
};

export default PatchedMaterialTopTabBar;
