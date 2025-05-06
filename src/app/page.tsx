import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-background to-muted min-h-screen flex flex-col font-sans">
      {/* Hero Section with Animation */}
      <section className="w-full flex flex-col items-center justify-center py-24 px-4 text-center bg-gradient-to-br from-primary/10 to-background animate-gradient">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 tracking-tight animate-fade-in">Record. Edit. Share. <span className="text-primary">Everywhere.</span></h1>
        <p className="text-lg sm:text-2xl text-muted-foreground max-w-2xl mb-8 animate-fade-in">The all-in-one platform to record podcasts, enhance your audio, and upload instantly to all your socials.</p>
        <Button size="lg" className="px-8 py-6 text-lg hover:scale-105 transition-transform">Get Started Free</Button>
        <div className="mt-12 flex justify-center">
          <Image src="/podcast-hero.png" alt="Podcast app screenshot" width={600} height={340} className="rounded-xl shadow-xl border border-muted animate-float" />
        </div>
      </section>

      {/* Features Section with Glassmorphism */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow bg-white/10 backdrop-blur-md">
            <Image src="/mic.svg" alt="Record" width={48} height={48} className="mb-4" />
            <h3 className="font-semibold text-xl mb-2">Studio-Quality Recording</h3>
            <p className="text-muted-foreground">Capture crystal-clear audio with one click, solo or with guests.</p>
          </Card>
          <Card className="p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow bg-white/10 backdrop-blur-md">
            <Image src="/edit.svg" alt="Edit" width={48} height={48} className="mb-4" />
            <h3 className="font-semibold text-xl mb-2">AI-Powered Editing</h3>
            <p className="text-muted-foreground">Remove noise, add music, and polish your podcast with smart tools.</p>
          </Card>
          <Card className="p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow bg-white/10 backdrop-blur-md">
            <Image src="/upload.svg" alt="Upload" width={48} height={48} className="mb-4" />
            <h3 className="font-semibold text-xl mb-2">One-Click Social Uploads</h3>
            <p className="text-muted-foreground">Publish to Spotify, Apple, YouTube, and all your socials instantly.</p>
          </Card>
        </div>
      </section>

      {/* How It Works Section with Animation */}
      <section className="py-20 px-4 bg-muted/50">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto">
          <Card className="flex-1 p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl font-bold mb-2">1</span>
            <h4 className="font-semibold mb-2">Record</h4>
            <p className="text-muted-foreground">Start a new session and invite guests. Record in high fidelity from anywhere.</p>
          </Card>
          <Card className="flex-1 p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl font-bold mb-2">2</span>
            <h4 className="font-semibold mb-2">Edit</h4>
            <p className="text-muted-foreground">Trim, enhance, and add effects with our intuitive editor.</p>
          </Card>
          <Card className="flex-1 p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl font-bold mb-2">3</span>
            <h4 className="font-semibold mb-2">Share</h4>
            <p className="text-muted-foreground">Upload to all your socials and podcast platforms in one click.</p>
          </Card>
        </div>
      </section>

      {/* Demo Section with Animation */}
      <section className="py-20 px-4 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">See It In Action</h2>
        <div className="rounded-xl overflow-hidden shadow-lg border border-muted aspect-video bg-black flex items-center justify-center animate-pulse">
          <span className="text-white text-lg">[Demo Video Placeholder]</span>
        </div>
      </section>

      {/* Social Proof Section with Animation */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Trusted by Creators Everywhere</h2>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          <Image src="/logo1.svg" alt="Brand 1" width={100} height={40} className="hover:scale-110 transition-transform" />
          <Image src="/logo2.svg" alt="Brand 2" width={100} height={40} className="hover:scale-110 transition-transform" />
          <Image src="/logo3.svg" alt="Brand 3" width={100} height={40} className="hover:scale-110 transition-transform" />
          <Image src="/logo4.svg" alt="Brand 4" width={100} height={40} className="hover:scale-110 transition-transform" />
        </div>
      </section>

      {/* Pricing Section with Animation */}
      <section className="py-20 px-4 bg-muted/50">
        <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto justify-center">
          <Card className="flex-1 p-8 flex flex-col items-center text-center border-primary border-2 hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-xl mb-2">Free</h3>
            <p className="mb-4">Get started with the basics</p>
            <ul className="mb-6 text-muted-foreground">
              <li>Up to 2 hours/month</li>
              <li>Basic editing tools</li>
              <li>Standard uploads</li>
            </ul>
            <Button className="w-full hover:scale-105 transition-transform">Start Free</Button>
          </Card>
          <Card className="flex-1 p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-xl mb-2">Pro</h3>
            <p className="mb-4">For serious creators</p>
            <ul className="mb-6 text-muted-foreground">
              <li>Unlimited recording</li>
              <li>AI-powered editing</li>
              <li>Priority uploads</li>
            </ul>
            <Button className="w-full hover:scale-105 transition-transform">Go Pro</Button>
          </Card>
        </div>
      </section>

      {/* FAQ Section with Animation */}
      <section className="py-20 px-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-semibold mb-2">Is it really free to start?</h4>
            <p className="text-muted-foreground">Yes! You can record and upload up to 2 hours per month for free.</p>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-semibold mb-2">Can I invite guests to my podcast?</h4>
            <p className="text-muted-foreground">Absolutely. Invite anyone, anywhere, and record together in high quality.</p>
          </Card>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-semibold mb-2">Which platforms can I upload to?</h4>
            <p className="text-muted-foreground">You can upload to Spotify, Apple Podcasts, YouTube, and all major social platforms.</p>
          </Card>
        </div>
      </section>

      {/* Footer with Animation */}
      <footer className="py-10 px-4 border-t border-muted text-center text-muted-foreground">
        <div className="mb-2">&copy; {new Date().getFullYear()} Riverside. All rights reserved.</div>
        <div className="flex justify-center gap-6 mt-2">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Contact</a>
        </div>
      </footer>
    </div>
  );
}
