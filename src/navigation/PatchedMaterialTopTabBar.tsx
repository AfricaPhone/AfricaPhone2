import React, { useCallback } from 'react';
import { MaterialTopTabBar, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { TabBarItem } from 'react-native-tab-view';

const PatchedMaterialTopTabBar: React.FC<MaterialTopTabBarProps> = props => {
  const { renderTabBarItem: originalRender, ...restProps } = props;

  const renderTabBarItem = useCallback(
    (itemProps: React.ComponentProps<typeof TabBarItem> & { key: string }) => {
      const { key: providedKey, route, ...tabBarItemProps } = itemProps;
      const elementKey = route?.key ?? providedKey;
      const baseProps = { ...tabBarItemProps, route };

      if (originalRender) {
        const element = originalRender({ ...(baseProps as typeof itemProps), key: elementKey });
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
