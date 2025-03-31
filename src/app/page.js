"use client";

import Head from "next/head";
import GameCanvas from "../components/GameCanvas";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {" "}
      <Head>
        <title>Vibe Surfers</title>
        <meta
          name="description"
          content="Endless runner game built with Next.js and Three.js"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <GameCanvas />
      </main>
    </div>
  );
}
