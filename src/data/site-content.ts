import type { AboutContent, WritingArticle } from '../domain/site-content';

/**
 * Hand-authored site copy. Not generated, not synced from anywhere —
 * edit directly. Kept as one small data module (same spirit as
 * config/site.ts) rather than a repository/port, since this is literal
 * authored content with no alternate source to swap in.
 *
 * DRAFT: paragraphs and "now" lines below are a first pass — replace with
 * your own words before shipping.
 */
export const about: AboutContent = {
  paragraphs: [
    "I build production software end to end — React and Vue on the frontend, Node.js and Go on the backend — and I'm most interested in the unglamorous parts: the data model that has to be right, the migration that can't break prod, the test suite that lets a team move fast without fear.",
    'Based in Sonora, Mexico, working remote with US teams. Outside of work I write on Go and clean architecture, and I try to bring the same honesty I want from good code to everything else — including how I talk about my own work.',
  ],
  now: [
    { label: 'BUILDING — KAZE, AN AI-NATIVE WEB AGENCY PLATFORM' },
    { label: 'SHIPPING — ALLBLUE, A GO + FLUTTER + NEXT.JS MEAL PLANNER' },
    { label: 'THINKING ABOUT — HOW MUCH CREDIT TO CLAIM WHEN AI WRITES THE CODE' },
  ],
};

/**
 * No published writing yet — kept empty rather than filled with invented
 * entries. Writing.astro renders a quiet empty state when this is [].
 */
export const writingArticles: WritingArticle[] = [];
