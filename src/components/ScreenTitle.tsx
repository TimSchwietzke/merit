/**
 * A screen's accessible heading.
 *
 * From `lg` the screen is named by the path bar and below `lg` by the header's
 * mono label (DESIGN.md §7), so on the tab screens the `h1` has no visible
 * rendering of its own. The header already carries the name, and repeating it
 * 40px lower is the page-title-plus-breadcrumb pattern §7 replaces. The
 * document still needs exactly one `h1`, so it stays here and stays lowercase,
 * in the navigation's own vocabulary (§4.4).
 *
 * Screens that carry a real title and lead of their own, sign-in, not-found,
 * the legal pages, use `PageHeader` instead.
 */
export function ScreenTitle({ children }: { children: string }) {
  return <h1 className="sr-only">{children}</h1>
}
