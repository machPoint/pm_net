import { Typewriter } from "@/components/typewriter";
import { EmailCapture } from "@/components/email-capture";

export default function Page() {
  return (
    <main className="min-h-dvh relative bg-background text-foreground overflow-x-hidden">
      {/* Background image (same as current hero) + monochrome overlays */}
      <div
        className="absolute inset-0 -z-20 bg-[url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/STScI-J-earth-rim-iss059e075342-m-1200x800-1758682076894.jpg')] bg-cover bg-center"
        aria-hidden="true" />

      <div className="absolute inset-0 -z-10 bg-black/60" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" aria-hidden="true" />

      {/* Upper-right typewriter text - responsive positioning */}
        <div className="absolute top-[200px] sm:top-[250px] md:top-[296px] right-4 sm:right-8 md:right-[312px] z-10 w-[280px] sm:w-[400px] md:w-[520px] text-lg sm:text-2xl md:text-4xl lg:text-5xl font-medium text-foreground text-left">
          <Typewriter
          first="connect to email"
          pivot="connect"
          second="connect to confluence"
          others={["connect to windchill", "connect to jama", "connect to systems"]}
          longPauseMs={2200} />
        </div>
      {/* Content */}
      {/* moved to lower-left */}
      <section className="relative flex min-h-dvh items-end justify-start px-4 sm:px-6 pb-8 sm:pb-16 !bg-[url(https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/1511d8c2-1a46-4ab6-8602-a714b6ca0df2/visual-edit-uploads/1758683670999-h25cdqrplhd.jpg)] !bg-cover !bg-center">
        <div className="w-full max-w-3xl text-left !bg-none !bg-cover !bg-center m-2 sm:m-4 md:m-8 lg:!m-[100px] p-2 sm:p-4 md:p-8 lg:!p-[100px]">
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">Proxima Engineering • CORE-SE</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight md:!text-slate-200 font-body !whitespace-pre-line">launching soon

          </h1>
          <p className="mt-2 sm:mt-3 md:mt-4 text-sm text-muted-foreground !whitespace-pre-line leading-relaxed">CORE-SE is Proxima Engineering's next-generation platform for engineers who need clarity in a complex toolchain. Designed to work seamlessly with Jama Connect and other industry standards like Jira and Windchill, CORE-SE unifies requirements observability, verification workflows, and change notifications into a single, intuitive workspace. With AI-enabled insights, CORE-SE continuously monitors your requirements baseline, flags traceability gaps, and surfaces the ripple effects of change before risk sets in.

          </p>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Launching soon. Stay tuned.
          </p>
          
          {/* Email Capture */}
          <EmailCapture />

        </div>
      </section>
    </main>);

}