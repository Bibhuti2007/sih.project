import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="noise flex min-h-screen w-full items-center justify-center bg-[#f7f1e3] px-5 text-[#173a3b]">
      <Card className="w-full max-w-md border-[#cbdacf] bg-[#fffaf0] shadow-[0_20px_60px_rgba(35,70,62,.08)]">
        <CardContent className="p-8">
          <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#f3e3c1] text-[#9a6d25]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#287d73]">A wrong turn</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">This page is not on the map.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5c7671]">The link may have moved, but your Jansetu work is still safe.</p>
          <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#174d4c] px-4 py-3 text-sm font-bold text-[#fffaf0]" data-testid="link-not-found-home">
            <ArrowLeft className="h-4 w-4" /> Return home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
