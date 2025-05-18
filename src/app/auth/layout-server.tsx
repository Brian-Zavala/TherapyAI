// Server component layout that supports metadata
export default function AuthLayoutServer({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is just a wrapper - the client component handles all the logic
  return children;
}