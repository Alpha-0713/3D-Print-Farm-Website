import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { syncSidebarSelection } from "../src/sidebarSelection.js?v=2.2&rev=5";

const listeners = new Map(), motionListeners = new Map(), observers = [];
const motion = { matches: false, addEventListener: (type, listener) => motionListeners.set(type, listener), removeEventListener: (type) => motionListeners.delete(type) };
globalThis.window = { matchMedia: () => motion, addEventListener: (type, listener) => listeners.set(type, listener), removeEventListener: (type) => listeners.delete(type) };
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
  observe() { this.disconnected = false; }
  disconnect() { this.disconnected = true; }
};
const emptyPage = { querySelector: () => null };
beforeEach(() => { syncSidebarSelection(emptyPage); observers.length = 0; motion.matches = false; });

function sidebar(initial = 0) {
  let active = initial, visual = null;
  const bounds = { left: 10, top: 100 };
  const boxes = [0, 1, 2, 3].map((index) => ({ x: 0, y: index * 46, width: 200, height: 42 }));
  const animations = [], classes = new Set();
  const absolute = (rect) => ({ left: bounds.left + rect.x, top: bounds.top + rect.y, width: rect.width, height: rect.height });
  const links = boxes.map((box) => ({ getBoundingClientRect: () => absolute(box) }));
  const marker = {
    style: {},
    getBoundingClientRect() {
      if (visual) return absolute(visual);
      const match = this.style.transform?.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
      return absolute({ x: Number(match?.[1] || 0), y: Number(match?.[2] || 0), width: parseFloat(this.style.width || '200'), height: parseFloat(this.style.height || '42') });
    },
    animate(frames, options) {
      const animation = { frames, options, cancelCount: 0, cancel() { this.cancelCount++; visual = null; } };
      animations.push(animation);
      return animation;
    },
  };
  const nav = { scrollLeft: 0, scrollTop: 0, classList: { add: (name) => classes.add(name) }, getBoundingClientRect: () => bounds, querySelector: (selector) => selector === '.sidebar-selection' ? marker : links[active] };
  return { root: { querySelector: () => nav }, marker, animations, classes,
    select: (index) => { active = index; },
    visual: (next) => { visual = { ...boxes[active], ...next }; },
    movePage: (top) => { bounds.top = top; },
    mobile: () => boxes.forEach((box, index) => Object.assign(box, { x: index % 2 * 146, y: Math.floor(index / 2) * 46, width: 140, height: 38 })),
  };
}

test("a direct staff-page load positions one highlight immediately", () => {
  const current = sidebar(2); syncSidebarSelection(current.root);
  assert.equal(current.marker.style.transform, 'translate3d(0px, 92px, 0)');
  assert.equal(current.animations.length, 0);
  assert.ok(current.classes.has('has-sliding-selection'));
});

test("tab changes retarget the same highlight and retain its controller", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root);
  assert.equal(observers.length, 1);
  assert.equal(current.animations.length, 1);
  assert.match(current.animations[0].frames[0].transform, /translate3d\(0px, 0px, 0\)/);
  assert.match(current.animations[0].frames[1].transform, /translate3d\(0px, 138px, 0\)/);
  assert.equal(current.animations[0].options.duration, 380);
});

test("routine data renders and initial resize notifications do not restart or cancel a slide", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root);
  const animation = current.animations[0];
  syncSidebarSelection(current.root); observers[0].callback(); syncSidebarSelection(current.root);
  assert.equal(animation.cancelCount, 0);
  assert.equal(current.animations.length, 1);
  assert.equal(observers.length, 1);
});

test("rapid reversal begins at the live position of the existing highlight", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root);
  current.visual({ x: 0, y: 65 });
  current.select(1); syncSidebarSelection(current.root);
  assert.equal(current.animations[0].cancelCount, 1);
  assert.match(current.animations[1].frames[0].transform, /translate3d\(0px, 65px, 0\)/);
  assert.match(current.animations[1].frames[1].transform, /translate3d\(0px, 46px, 0\)/);
});

test("scrolling the page does not change the highlight's local position or restart motion", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root); current.visual({ x: 0, y: 65 });
  current.movePage(-300); syncSidebarSelection(current.root);
  assert.equal(current.animations[0].cancelCount, 0);
  current.select(1); syncSidebarSelection(current.root);
  assert.match(current.animations[1].frames[0].transform, /translate3d\(0px, 65px, 0\)/);
});

test("responsive layout changes realign immediately without creating another animation", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root);
  current.mobile(); observers[0].callback();
  assert.equal(current.animations[0].cancelCount, 1);
  assert.equal(current.animations.length, 1);
  assert.equal(current.marker.style.width, '140px');
  assert.equal(current.marker.style.height, '38px');
  assert.equal(current.marker.style.transform, 'translate3d(146px, 46px, 0)');
});

test("reduced motion selects instantly and cancels an ongoing slide when enabled", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  motion.matches = true; current.select(2); syncSidebarSelection(current.root);
  assert.equal(current.animations.length, 0);
  assert.equal(current.marker.style.transform, 'translate3d(0px, 92px, 0)');
  motion.matches = false; current.select(3); syncSidebarSelection(current.root);
  motion.matches = true; motionListeners.get('change')();
  assert.equal(current.animations[0].cancelCount, 1);
});

test("leaving staff pages cleans up animation and listeners; a different shell starts immediately", () => {
  const current = sidebar(); syncSidebarSelection(current.root);
  current.select(3); syncSidebarSelection(current.root);
  const observer = observers[0]; syncSidebarSelection(emptyPage);
  assert.equal(observer.disconnected, true);
  assert.equal(current.animations[0].cancelCount, 1);
  assert.equal(listeners.size, 0); assert.equal(motionListeners.size, 0);
  const other = sidebar(2); syncSidebarSelection(other.root);
  assert.equal(other.animations.length, 0);
});

test("the highlight still tracks navigation if animation support is unavailable", () => {
  const current = sidebar(); current.marker.animate = undefined;
  syncSidebarSelection(current.root); current.select(3); syncSidebarSelection(current.root);
  assert.equal(current.marker.style.transform, 'translate3d(0px, 138px, 0)');
});
