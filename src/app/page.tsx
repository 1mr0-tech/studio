
"use client";

export default function SimplePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground font-body">
      <main className="p-10 bg-card rounded-lg shadow-md max-w-2xl text-center">
        <header className="mb-6">
          <h1 className="text-5xl font-bold font-headline text-primary">Welcome to Your App</h1>
          <p className="text-lg text-muted-foreground mt-2">This is a simple, static page to get you started.</p>
        </header>

        <section className="my-8">
          <h2 className="text-3xl font-headline font-semibold mb-4">About</h2>
          <p>
            This page is built with Next.js and Tailwind CSS, but designed to be simple and clean.
            You can easily modify its content by editing the file at{' '}
            <code className="bg-muted px-2 py-1 rounded-md font-code text-sm">src/app/page.tsx</code>.
          </p>
        </section>

        <footer className="mt-8 pt-6 border-t border-border text-sm text-muted-foreground">
          <p>&copy; 2024 Your Application. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
