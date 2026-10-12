/**
 * Act navigation bridge — nav buttons / HUD dots request the scroll
 * cinematic to deep-scroll to an act. The ScrollCinematic owns the real
 * GSAP ScrollTrigger math and listens for these events.
 */

export const SEEK_ACT_EVENT = "hyperreel:seek-act";

export function scrollToAct(actIndex: number): void {
  window.dispatchEvent(
    new CustomEvent<number>(SEEK_ACT_EVENT, { detail: actIndex })
  );
}
