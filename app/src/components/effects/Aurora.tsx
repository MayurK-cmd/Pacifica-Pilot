export function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="aurora-1 aurora-blob-1 absolute -top-1/3 left-1/4 h-[700px] w-[900px] rounded-full blur-3xl" />
      <div className="aurora-2 aurora-blob-2 absolute top-1/4 -right-1/4 h-[600px] w-[800px] rounded-full blur-3xl" />
      <div className="aurora-fade absolute inset-0" />
    </div>
  );
}
