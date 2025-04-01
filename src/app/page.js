"use client";

import Head from "next/head";
import GameCanvas from "../components/GameCanvas";

export default function Home() {
  return (
    <div>
      <Head>
        <title>Vibe Surfers - Reloaded</title>
        <meta
          name="description"
          content="Endless shooter game built with Next.js and Three.js"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <GameCanvas />
      </main>
    </div>
  );
}
