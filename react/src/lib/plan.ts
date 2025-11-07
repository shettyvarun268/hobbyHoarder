export function normalizeSteps(input: any): string[] {
  const raw: string[] = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(/\n+/)
    : [];

  const cleaned = raw
    .map((s) => String(s ?? "").trim())
    // drop code fences and bracket artifacts
    .filter((s) => s && s !== "```" && s.toLowerCase() !== "```json" && s !== "[" && s !== "]")
    // strip wrapping quotes/backticks
    .map((s) => s.replace(/^"|^'|^`|\s*,$/g, "").replace(/"$|'$|`$/g, ""))
    // strip leading numbering/bullets
    .map((s) => s.replace(/^\s*\d+[).\-\s]*\s*/, "").replace(/^[-*]\s+/, ""))
    // remove trailing commas left by JSON-like lists
    .map((s) => s.replace(/,\s*$/, "").trim())
    // filter out any leftover empty lines
    .filter((s) => s.length > 0);

  return cleaned.slice(0, 5);
}

