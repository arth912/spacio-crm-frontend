/** Custom DOM events the tour uses to drive parts of the UI it points at. */
export const TOUR_ACTION_EVENT = "spacio:tour-action";
/** Same string as TOGGLE_SIDEBAR_EVENT in AppShell (kept here to avoid a circular import). */
export const OPEN_SIDEBAR_EVENT = "spacio:toggle-sidebar";
export const CLOSE_SIDEBAR_EVENT = "spacio:close-sidebar";

export type TourOpenable = "item-form" | "profile-menu";

export function dispatchTourAction(type: TourOpenable, open: boolean) {
  window.dispatchEvent(new CustomEvent(TOUR_ACTION_EVENT, { detail: { type, open } }));
}
