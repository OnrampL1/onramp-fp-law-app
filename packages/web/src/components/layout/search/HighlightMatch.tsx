interface HighlightMatchProps {
  text: string;
  query: string;
}

// Bolds the first case-insensitive occurrence of `query` inside `text`, per
// the reference screenshot's "bolded matched text" treatment. Only the
// primary result label gets this — subtext stays plain, same as the
// reference image.
export function HighlightMatch({ text, query }: HighlightMatchProps) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return <>{text}</>;

  const matchIndex = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());
  if (matchIndex === -1) return <>{text}</>;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + trimmedQuery.length);
  const after = text.slice(matchIndex + trimmedQuery.length);

  return (
    <>
      {before}
      <strong className="font-semibold text-foreground">{match}</strong>
      {after}
    </>
  );
}
