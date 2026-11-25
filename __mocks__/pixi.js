// Mock for pixi.js to avoid issues with ES modules in tests
import { vi } from 'vitest';

const mockContainer = vi.fn().mockImplementation(function () {
  const children = [];
  return {
    children,
    addChild: vi.fn(child => children.push(child)),
    removeChild: vi.fn(child => {
      const index = children.indexOf(child);
      if (index > -1) children.splice(index, 1);
    }),
    destroy: vi.fn(),
    position: { set: vi.fn(), x: 0, y: 0 },
    anchor: { set: vi.fn() },
    on: vi.fn(),
    clear: vi.fn(),
    circle: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    visible: true,
    alpha: 1,
    rotation: 0,
  };
});

const mockGraphics = vi.fn().mockImplementation(function () {
  const children = [];
  return {
    children,
    addChild: vi.fn(child => children.push(child)),
    removeChild: vi.fn(child => {
      const index = children.indexOf(child);
      if (index > -1) children.splice(index, 1);
    }),
    destroy: vi.fn(),
    clear: vi.fn(),
    circle: vi.fn().mockReturnThis(),
    ellipse: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    position: { set: vi.fn(), x: 0, y: 0 },
    alpha: 1,
    rotation: 0,
    tint: 0xffffff,
  };
});

const mockText = vi.fn().mockImplementation(function (options) {
  return {
    text: options?.text,
    style: options?.style,
    position: { set: vi.fn() },
    anchor: { set: vi.fn() },
  };
});

export const Container = mockContainer;
export const Graphics = mockGraphics;
export const Text = mockText;
