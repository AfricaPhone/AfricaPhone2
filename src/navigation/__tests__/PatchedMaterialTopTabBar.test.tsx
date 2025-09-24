jest.mock("@react-navigation/material-top-tabs", () => {
  const React = require("react");
  const capturedProps = { current: null } as { current: any };
  const MockMaterialTopTabBar = (props: any) => {
    capturedProps.current = props;
    return null;
  };

  return {
    __esModule: true,
    MaterialTopTabBar: MockMaterialTopTabBar,
    __mock: { capturedProps },
  };
});

import React from "react";
import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import PatchedMaterialTopTabBar from "../PatchedMaterialTopTabBar";

type TabRoute = { key: string; name: string };

const capturedModule = jest.requireMock("@react-navigation/material-top-tabs") as {
  __mock: { capturedProps: { current: any } };
};
const {
  __mock: { capturedProps },
} = capturedModule;

const createBaseProps = () => ({
  layout: { width: 320, height: 64 },
  position: new Animated.Value(0) as unknown,
  jumpTo: jest.fn(),
  state: { index: 0, routes: [] },
  navigation: { emit: jest.fn() },
  descriptors: {},
});

const createItemProps = (route: TabRoute) => ({
  key: "initial-key",
  route,
  position: new Animated.Value(0) as unknown,
  navigationState: { index: 0, routes: [route] },
  getAccessibilityLabel: jest.fn(),
  getAccessible: jest.fn(),
  getLabelText: jest.fn(),
  getTestID: jest.fn(),
  renderBadge: jest.fn(),
  renderIcon: jest.fn(),
  renderLabel: jest.fn(),
  activeColor: "#000",
  inactiveColor: "#999",
  pressColor: "#eee",
  pressOpacity: 0.5,
  onPress: jest.fn(),
  onLongPress: jest.fn(),
  labelStyle: {},
  style: {},
});

describe("PatchedMaterialTopTabBar", () => {
  beforeEach(() => {
    capturedProps.current = null;
  });

  it("passe la clé de route au renderer personnalisé", () => {
    const baseProps = createBaseProps();
    const customRender = jest.fn().mockReturnValue(<></>);

    render(
      <PatchedMaterialTopTabBar
        {...(baseProps as any)}
        renderTabBarItem={customRender}
      />
    );

    const { renderTabBarItem } = capturedProps.current;
    const route = { key: "tablette", name: "Tablettes" };

    renderTabBarItem(createItemProps(route));

    expect(customRender).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "tablette",
        route,
      })
    );
  });

  it("utilise la clé de route lors du fallback vers TabBarItem", () => {
    const baseProps = createBaseProps();

    render(<PatchedMaterialTopTabBar {...(baseProps as any)} />);

    const { renderTabBarItem } = capturedProps.current;
    const route = { key: "accessoire", name: "Accessoires" };

    const element = renderTabBarItem(createItemProps(route));

    expect(element.key).toBe("accessoire");
    expect(element.props.route).toBe(route);
  });
});
