import KanjiGame from "@/components/KanjiGame";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50">
      <main className="flex w-full max-w-md flex-1 flex-col items-center gap-8 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-800">
          かんじ かきとり
        </h1>
        <KanjiGame />
      </main>
    </div>
  );
}
