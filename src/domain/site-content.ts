/**
 * Pure domain types for hand-authored site copy that doesn't come from
 * cv.yaml (About prose, "now" status lines, writing index). Kept separate
 * from CvData because this content isn't sourced from RenderCV — it's
 * site-only copy, but still typed here so components never guess a shape.
 */
export interface NowItem {
  label: string;
}

export interface AboutContent {
  paragraphs: string[];
  now: NowItem[];
}

export interface WritingArticle {
  date: string;
  title: string;
  href: string;
}
