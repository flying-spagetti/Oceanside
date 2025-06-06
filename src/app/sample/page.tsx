"use client"
import Head from 'next/head'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [roomName, setRoomName] = useState('')

  const joinRoom = () => {
    router.push(`/sample/${roomName || Math.random().toString(36).slice(2)}`)
  }

  return (
    <>
      <Head>
        <title>Native WebRTC API with NextJS</title>
        <meta name="description" content="Use Native WebRTC API for video conferencing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-4">Let's join a room!</h1>
        <input
          className="border border-gray-300 rounded-md p-2 mb-4 w-64"
          onChange={(e) => setRoomName(e.target.value)}
          value={roomName}
          placeholder="Enter room name"
        />
        <button
          onClick={joinRoom}
          type="button"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
        >
          Join Room
        </button>
      </main>
    </>
  )
}
